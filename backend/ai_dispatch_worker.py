"""
ResQNet AI Dispatch Background Worker Daemon
"""

import os
import sys
import time
import math
import random
import sqlite3
import threading
from datetime import datetime

# Configure UTF-8 stdout if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

MODULE2_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "resqnet-module2"))
if MODULE2_PATH not in sys.path:
    sys.path.insert(0, MODULE2_PATH)

import torch
import numpy as np

try:
    from resqnet.inference.neural_scorer import NeuralScorer
    from resqnet.middle_loop.hlp_agent import HighLevelPlanner
    from resqnet.middle_loop.marl_controller import MARLController
    from resqnet.core.scoring import analytic_pair_score
    from resqnet.core.dispatch_rounds import solve_rounds
    from resqnet.core.features import role_to_agency
    GNN_AVAILABLE = True
except Exception as e:
    print(f"[AI-Dispatch] Note: ResQNet component imports: {e}. Fallback enabled.")
    GNN_AVAILABLE = False

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "crisis_management.db"))

POLL_INTERVAL_SECONDS = 3.0
STRATEGIC_PERIOD_SECONDS = 60.0
MAX_ROUNDS = int(os.getenv("RESQNET_MAX_ROUNDS", "3"))
NEURAL_BLEND = 0.3
KNN_K = 5
IDLE_RESET_CYCLES = 10

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=30000')
    conn.row_factory = sqlite3.Row
    return conn

def haversine_distance(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 5.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class AIDispatchWorker:
    def __init__(self, start_strategic: bool = True):
        print("="*60)
        print("[INFO] Initializing ResQNet AI Dispatch Background Service")
        print(f"[INFO] Database target: {DB_PATH}")
        print(f"[INFO] MULTI-SLOT: {'ON' if MAX_ROUNDS > 1 else 'OFF'}, max_rounds={MAX_ROUNDS}")
        print("="*60)
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.neural = None
        if GNN_AVAILABLE:
            weights_dir = os.path.join(MODULE2_PATH, "weights")
            self.neural = NeuralScorer.try_load(weights_dir, domain="knn")
        
        self.grid_size = 3
        self.num_regions = self.grid_size * self.grid_size
        self.mcfp_flows = None
        self.mcfp_lock = threading.Lock()
        
        self.idle_cycles = 0
        
        if GNN_AVAILABLE and start_strategic:
            self.marl_controller = MARLController()
            self.strategic_thread = threading.Thread(target=self.run_strategic_loop, daemon=True)
            self.strategic_thread.start()
        else:
            self.marl_controller = None

    def get_region_id(self, lat, lng):
        lat_min, lat_max = 18.8, 19.3
        lng_min, lng_max = 72.7, 73.0
        if lat is None or lng is None: return -1
        lat_norm = max(0, min(1, (lat - lat_min) / (lat_max - lat_min)))
        lng_norm = max(0, min(1, (lng - lng_min) / (lng_max - lng_min)))
        row = min(self.grid_size - 1, int(lat_norm * self.grid_size))
        col = min(self.grid_size - 1, int(lng_norm * self.grid_size))
        return row * self.grid_size + col

    def run_strategic_loop(self):
        print(f"[INFO] Starting Strategic MCFP Outer Loop ({STRATEGIC_PERIOD_SECONDS}s cadence)")
        hlp = HighLevelPlanner(num_regions=self.num_regions)
        while True:
            try:
                self.compute_strategic_flows(hlp)
            except Exception as e:
                print(f"[Strategic-Loop] Error: {e}")
            time.sleep(STRATEGIC_PERIOD_SECONDS)
            
    def compute_strategic_flows(self, hlp):
        conn = get_db_connection()
        try:
            unassigned = self.get_dispatchable_incidents(conn)
            available = self.get_available_personnel(conn)
            
            demands = np.zeros(self.num_regions)
            supplies = np.zeros(self.num_regions)
            
            for inc in unassigned:
                r = self.get_region_id(inc.get('lat'), inc.get('lng'))
                if r >= 0: demands[r] += 1
                
            for p in available:
                r = self.get_region_id(p.get('lat'), p.get('lng'))
                if r >= 0: supplies[r] += 1
                
            costs = np.zeros((self.num_regions, self.num_regions))
            for i in range(self.num_regions):
                for j in range(self.num_regions):
                    if i != j:
                        i_r, i_c = i // self.grid_size, i % self.grid_size
                        j_r, j_c = j // self.grid_size, j % self.grid_size
                        costs[i, j] = math.sqrt((i_r - j_r)**2 + (i_c - j_c)**2)
            
            flows = hlp.solve_mcfp(supplies, demands, costs)
            
            with self.mcfp_lock:
                self.mcfp_flows = flows
        finally:
            conn.close()

    def get_dispatchable_incidents(self, conn):
        """Find active incidents that still have open slots."""
        cursor = conn.cursor()
        cursor.execute('''
            SELECT i.id, i.title, i.type, i.severity, i.lat, i.lng, i.created_at,
                   GROUP_CONCAT(p.role) as assigned_roles
            FROM incidents i
            LEFT JOIN personnel p ON i.id = p.assigned_incident_id
            WHERE i.status = 'active'
            GROUP BY i.id
            ORDER BY 
                CASE i.severity
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,
                i.created_at ASC
        ''')
        incidents = []
        for r in cursor.fetchall():
            d = dict(r)
            roles = d.get('assigned_roles')
            if roles:
                d['assigned_agencies'] = [role_to_agency(role.strip()) for role in roles.split(',') if role.strip()]
            else:
                d['assigned_agencies'] = []
            incidents.append(d)
            
        if os.getenv("RESQNET_MULTI_SLOT") == "0":
            # Legacy 1-per-incident
            return [inc for inc in incidents if len(inc['assigned_agencies']) == 0]
            
        # Filter strictly by open slots
        try:
            from resqnet.core.slots import target_team, open_slots
            dispatchable = []
            for inc in incidents:
                tgt = target_team(inc.get('type', 'other'), inc.get('severity', 'medium'))
                open_ = open_slots(tgt, inc['assigned_agencies'])
                if sum(open_.values()) > 0:
                    dispatchable.append(inc)
            return dispatchable
        except ImportError:
            return incidents

    def get_available_personnel(self, conn):
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, role, status, lat, lng 
            FROM personnel 
            WHERE status = 'available' AND assigned_incident_id IS NULL
        ''')
        res = []
        for r in cursor.fetchall():
            d = dict(r)
            d['agency'] = role_to_agency(d['role'])
            res.append(d)
        return res

    def get_available_resources(self, conn):
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, type, status, lat, lng 
            FROM resources 
            WHERE status = 'available' AND assigned_incident_id IS NULL
        ''')
        return [dict(r) for r in cursor.fetchall()]
        
    def _embeddings(self, free_personnel, incidents):
        if not self.neural:
            return None
        
        # Build kNN graph and return embeddings
        try:
            from resqnet.core.graph import EvolvingDisasterGraph
            graph = EvolvingDisasterGraph(distance_threshold=5.0, latency_factor=1.0)
            
            # Map indices
            for inc in incidents:
                graph.add_incident(inc["id"], inc.get("lat", 0.0), inc.get("lng", 0.0), severity=inc.get("severity", "medium"))
            for p in free_personnel:
                graph.add_responder(p["id"], p.get("lat", 0.0), p.get("lng", 0.0), role=p.get("role", "other"))
                
            data = graph.to_pyg_data()
            with torch.no_grad():
                out = self.neural.gcn(data.x.to(self.device), data.edge_index.to(self.device), data.edge_attr.to(self.device))
                return out
        except Exception as e:
            print(f"[GNN] Embedding error: {e}")
            return None

    def compute_mwm_allocation(self, unassigned_incidents, available_personnel):
        def score_fn(person, incident, present_agencies):
            p_lat, p_lng = person.get('lat'), person.get('lng')
            i_lat, i_lng = incident.get('lat'), incident.get('lng')
            dist_km = haversine_distance(p_lat, p_lng, i_lat, i_lng)
            person["_d_km"] = person.get("_d_km", {})
            person["_d_km"][incident["id"]] = dist_km
            
            s = analytic_pair_score(dist_km, person.get('role', ''), incident.get('type', 'other'), incident.get('severity', 'medium'))
            
            # Adding utility / fairness
            try:
                from resqnet.core.utility import calculate_utility
                alloc = torch.zeros((1, 1), dtype=torch.float32)
                alloc[0, 0] = 1.0
                eff = torch.tensor([[s]], dtype=torch.float32)
                cat = torch.tensor([person['agency']], dtype=torch.long)
                util = calculate_utility(alloc, eff, cat)
                s = s + float(util[0]) * 0.3
            except:
                pass
                
            return s
            
        gcn_embeddings = self._embeddings(available_personnel, unassigned_incidents)
        mcfp_flows = None
        if self.marl_controller:
            with self.mcfp_lock:
                mcfp_flows = self.mcfp_flows
                
        matches = solve_rounds(
            unassigned_incidents, available_personnel, score_fn, 
            max_rounds=MAX_ROUNDS, neural_scorer=self.neural, 
            gcn_embeddings=gcn_embeddings, strategic_controller=self.marl_controller,
            mcfp_flows=mcfp_flows
        )
        return matches

    def dispatch_matches(self, conn, matches, available_resources):
        now = datetime.now().isoformat()
        assigned_count = 0
        
        for attempt in range(3):
            try:
                conn.execute("BEGIN IMMEDIATE")
                cursor = conn.cursor()
                
                for match in matches:
                    person = match["personnel"]
                    incident = match["incident"]
                    score = match["score"]
                    rnd = match["round"]
                    synergy = match["marginal_synergy"]
                    n_term = match["neural_term"]
                    dist_km = person.get("_d_km", {}).get(incident["id"], 5.0)
                    
                    # Ensure status hasn't changed
                    cursor.execute("SELECT status FROM personnel WHERE id = ?", (person["id"],))
                    row = cursor.fetchone()
                    if not row or row["status"] != "available":
                        continue
                        
                    cursor.execute('''
                        UPDATE personnel 
                        SET assigned_incident_id = ?, status = 'responding', updated_at = ?
                        WHERE id = ? AND status = 'available'
                    ''', (incident['id'], now, person['id']))
                    
                    if cursor.rowcount > 0:
                        assigned_count += 1
                        log_desc = (
                            f"AI Dispatcher assigned {person['name']} ({person['role']}) "
                            f"to incident via GNN-MWM optimization. (Est. Distance: {dist_km:.2f}km, Confidence: {score:.2f}, Synergy tier: {synergy:.2f})"
                        )
                        meta = f'{{"responder_id": {person["id"]}, "dist_km": {dist_km:.2f}, "round": {rnd}, "marginal_synergy": {synergy:.2f}, "neural_term": {n_term:.4f}}}'
                        
                        cursor.execute('''
                            INSERT INTO incident_timeline (incident_id, event_type, description, user_name, metadata, created_at)
                            VALUES (?, 'ai_dispatch', ?, 'ResQNet GNN Engine', ?, ?)
                        ''', (incident['id'], log_desc, meta, now))
                        
                        print(f"  [DISPATCHED] {person['name']} ({person['role']}) -> Incident #{incident['id']}: '{incident['title']}' ({dist_km:.2f}km away, Round {rnd})")

                        # Link resources
                        matched_res = None
                        for res in available_resources:
                            if res['status'] == 'available' and res.get('assigned_incident_id') is None:
                                if ("fire" in person['role'].lower() and "fire" in res['type'].lower()) or \
                                   ("paramedic" in person['role'].lower() and "ambulance" in res['type'].lower()) or \
                                   ("police" in person['role'].lower() and "police" in res['type'].lower()):
                                    matched_res = res
                                    break
                                    
                        if matched_res:
                            cursor.execute('''
                                UPDATE resources 
                                SET assigned_incident_id = ?, status = 'deployed', updated_at = ?
                                WHERE id = ?
                            ''', (incident['id'], now, matched_res['id']))
                            matched_res['status'] = 'deployed'
                            cursor.execute('''
                                INSERT INTO incident_timeline (incident_id, event_type, description, user_name, created_at)
                                VALUES (?, 'resource_assigned', ?, 'ResQNet GNN Engine', ?)
                            ''', (incident['id'], f"Deployed equipment: {matched_res['name']} ({matched_res['type']})", now))
                            
                conn.commit()
                return assigned_count
                
            except sqlite3.OperationalError as e:
                conn.rollback()
                if "locked" in str(e).lower():
                    time.sleep(0.2 * (2**attempt))
                else:
                    raise e
                    
        return 0

    def run_cycle(self):
        conn = None
        try:
            conn = get_db_connection()
            unassigned = self.get_dispatchable_incidents(conn)
            
            if not unassigned:
                self.idle_cycles += 1
                if self.idle_cycles >= IDLE_RESET_CYCLES and self.neural:
                    self.neural.reset_episode()
                return
                
            self.idle_cycles = 0
                
            available_personnel = self.get_available_personnel(conn)
            if not available_personnel:
                return
                
            available_resources = self.get_available_resources(conn)
            
            print(f"\n[AI-Dispatch {datetime.now().strftime('%H:%M:%S')}] Detected {len(unassigned)} unassigned incidents & {len(available_personnel)} available personnel.")
            
            matches = self.compute_mwm_allocation(unassigned, available_personnel)
            if matches:
                count = self.dispatch_matches(conn, matches, available_resources)
                if count > 0:
                    print(f"[OK] Successfully dispatched {count} responders.")
                    
        except sqlite3.OperationalError as e:
            if "locked" not in str(e).lower():
                print(f"[AI-Dispatch] DB OperationalError: {e}")
        except Exception as e:
            print(f"[AI-Dispatch] Error in dispatch cycle: {e}")
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def start_loop(self):
        print(f"[LISTEN] AI Dispatch Worker actively listening for incidents every {POLL_INTERVAL_SECONDS}s...")
        print("Press Ctrl+C to terminate the service.")
        try:
            while True:
                self.run_cycle()
                time.sleep(POLL_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            print("\n[STOP] AI Dispatch Worker gracefully stopped.")

if __name__ == "__main__":
    worker = AIDispatchWorker()
    worker.start_loop()
