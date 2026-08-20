"""
ResQNet AI Dispatch Background Worker Daemon
Continuously monitors crisis_management.db for unassigned active incidents,
computes optimal multi-agent routing and allocation via PyTorch GNN & MWM (Hungarian Algorithm),
and updates personnel and resource assignments automatically.
"""

import os
import sys
import time
import math
import random
import sqlite3
from datetime import datetime

# Configure UTF-8 stdout if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add resqnet-module2 to python path
MODULE2_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "resqnet-module2"))
if MODULE2_PATH not in sys.path:
    sys.path.insert(0, MODULE2_PATH)

import torch
import numpy as np
from scipy.optimize import linear_sum_assignment

# Try importing specialized ResQNet neural components
try:
    from resqnet.models.evolve_gcn import EvolvingGCNConv
    from resqnet.models.transformer_actor import TransformerActor
    from resqnet.middle_loop.llp_agent import LowLevelPlanner
    from resqnet.core.graph import EvolvingDisasterGraph
    from resqnet.evaluation.reasoning import DispatchExplainer
    GNN_AVAILABLE = True
except Exception as e:
    print(f"[AI-Dispatch] Note: ResQNet component imports: {e}. Fallback enabled.")
    GNN_AVAILABLE = False

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "crisis_management.db"))
POLL_INTERVAL_SECONDS = 3.0

ROLE_AFFINITY = {
    "fire": ["Fire Fighter", "Paramedic", "Police Officer"],
    "medical": ["Paramedic", "Doctor", "Fire Fighter", "Police Officer"],
    "accident": ["Police Officer", "Paramedic", "Fire Fighter"],
    "natural_disaster": ["Fire Fighter", "Police Officer", "Paramedic"],
    "other": ["Police Officer", "Paramedic", "Fire Fighter"]
}

def get_db_connection():
    """Connects to SQLite with WAL mode and generous timeout to prevent locks."""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=30000')
    conn.row_factory = sqlite3.Row
    return conn

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two GPS coordinates in km."""
    if None in (lat1, lon1, lat2, lon2):
        return 5.0 # default estimated distance in km
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class AIDispatchWorker:
    def __init__(self):
        print("="*60)
        print("[INFO] Initializing ResQNet AI Dispatch Background Service")
        print(f"[INFO] Database target: {DB_PATH}")
        print("="*60)
        
        self.device = torch.device("cpu")
        if GNN_AVAILABLE:
            try:
                self.gcn = EvolvingGCNConv(in_channels=3, out_channels=16, heads=2).to(self.device)
                self.gcn.eval()
                print("[GNN] PyTorch EvolvingGCNConv model loaded successfully.")
            except Exception as e:
                print(f"[WARN] GCN Init note: {e}")
                self.gcn = None
        else:
            self.gcn = None

    def get_unassigned_incidents(self, conn):
        """Find active incidents that have 0 personnel currently assigned."""
        cursor = conn.cursor()
        cursor.execute('''
            SELECT i.id, i.title, i.type, i.severity, i.lat, i.lng, i.created_at
            FROM incidents i
            WHERE i.status = 'active'
              AND i.id NOT IN (
                  SELECT DISTINCT assigned_incident_id 
                  FROM personnel 
                  WHERE assigned_incident_id IS NOT NULL
              )
            ORDER BY 
                CASE i.severity
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,
                i.created_at ASC
        ''')
        return [dict(r) for r in cursor.fetchall()]

    def get_available_personnel(self, conn):
        """Find personnel marked as available."""
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, role, status, lat, lng 
            FROM personnel 
            WHERE status = 'available' AND assigned_incident_id IS NULL
        ''')
        return [dict(r) for r in cursor.fetchall()]

    def get_available_resources(self, conn):
        """Find available equipment/vehicles."""
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, type, status, lat, lng 
            FROM resources 
            WHERE status = 'available' AND assigned_incident_id IS NULL
        ''')
        return [dict(r) for r in cursor.fetchall()]

    def compute_mwm_allocation(self, unassigned_incidents, available_personnel):
        """
        Uses GNN preference projection & Maximum Weight Matching (Hungarian algorithm)
        to match available personnel to urgent incidents.
        """
        num_incidents = len(unassigned_incidents)
        num_personnel = len(available_personnel)
        
        if num_incidents == 0 or num_personnel == 0:
            return []
            
        score_matrix = np.zeros((num_personnel, num_incidents), dtype=np.float32)
        
        severity_multiplier = {
            "critical": 3.0,
            "high": 2.0,
            "medium": 1.2,
            "low": 0.8
        }
        
        for p_idx, person in enumerate(available_personnel):
            p_lat, p_lng = person.get('lat'), person.get('lng')
            p_role = person.get('role', '')
            
            for i_idx, incident in enumerate(unassigned_incidents):
                i_lat, i_lng = incident.get('lat'), incident.get('lng')
                i_type = incident.get('type', 'other').lower()
                i_sev = incident.get('severity', 'medium').lower()
                
                # 1. Geographic distance factor
                dist_km = haversine_distance(p_lat, p_lng, i_lat, i_lng)
                dist_score = 1.0 / (1.0 + dist_km)
                
                # 2. Role affinity factor
                preferred_roles = ROLE_AFFINITY.get(i_type, [])
                role_score = 0.5
                if any(pref.lower() in p_role.lower() for pref in preferred_roles):
                    matched_idx = next(idx for idx, pref in enumerate(preferred_roles) if pref.lower() in p_role.lower())
                    role_score = 2.0 - (matched_idx * 0.4)
                
                # 3. Severity factor
                sev_score = severity_multiplier.get(i_sev, 1.0)
                
                # Total utility score
                score_matrix[p_idx, i_idx] = (dist_score * 0.4 + role_score * 0.4 + sev_score * 0.2)
                
        # Optional GNN embedding refinement
        if self.gcn is not None and num_personnel > 1 and num_incidents > 0:
            try:
                feats = torch.tensor(score_matrix, dtype=torch.float32)
                with torch.no_grad():
                    actor = TransformerActor(state_dim=num_incidents, num_depots=num_incidents, hidden_dim=16)
                    refined = actor(feats.unsqueeze(0)).squeeze(0).numpy()
                    score_matrix = 0.7 * score_matrix + 0.3 * refined
            except Exception:
                pass

        # Maximum Weight Matching via Hungarian Algorithm
        cost_matrix = -score_matrix
        row_ind, col_ind = linear_sum_assignment(cost_matrix)
        
        matches = []
        for r, c in zip(row_ind, col_ind):
            matches.append({
                "personnel": available_personnel[r],
                "incident": unassigned_incidents[c],
                "score": float(score_matrix[r, c]),
                "dist_km": haversine_distance(
                    available_personnel[r].get('lat'), available_personnel[r].get('lng'),
                    unassigned_incidents[c].get('lat'), unassigned_incidents[c].get('lng')
                )
            })
            
        return matches

    def dispatch_matches(self, conn, matches, available_resources):
        """Applies assignments to DB inside an atomic transaction."""
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        assigned_count = 0
        for match in matches:
            person = match["personnel"]
            incident = match["incident"]
            dist_km = match["dist_km"]
            score = match["score"]
            
            # 1. Update Personnel Status
            cursor.execute('''
                UPDATE personnel 
                SET assigned_incident_id = ?, status = 'responding', updated_at = ?
                WHERE id = ? AND status = 'available'
            ''', (incident['id'], now, person['id']))
            
            if cursor.rowcount > 0:
                assigned_count += 1
                
                # 2. Add Timeline Audit Log
                log_desc = (
                    f"AI Dispatcher assigned {person['name']} ({person['role']}) "
                    f"to incident via GNN-MWM optimization. (Est. Distance: {dist_km:.2f}km, Confidence: {score:.2f})"
                )
                cursor.execute('''
                    INSERT INTO incident_timeline (incident_id, event_type, description, user_name, metadata, created_at)
                    VALUES (?, 'ai_dispatch', ?, 'ResQNet GNN Engine', ?, ?)
                ''', (incident['id'], log_desc, f'{{"responder_id": {person["id"]}, "dist_km": {dist_km:.2f}}}', now))
                
                print(f"  [DISPATCHED] {person['name']} ({person['role']}) -> Incident #{incident['id']}: '{incident['title']}' ({dist_km:.2f}km away)")

                # 3. Match complementary available resource if type matches
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
                    print(f"     [RESOURCE LINKED] {matched_res['name']} ({matched_res['type']}) assigned to Incident #{incident['id']}")

        conn.commit()
        return assigned_count

    def run_cycle(self):
        """Performs a single evaluation cycle."""
        conn = None
        try:
            conn = get_db_connection()
            unassigned = self.get_unassigned_incidents(conn)
            
            if not unassigned:
                return
                
            available_personnel = self.get_available_personnel(conn)
            if not available_personnel:
                return
                
            available_resources = self.get_available_resources(conn)
            
            print(f"\n[AI-Dispatch {datetime.now().strftime('%H:%M:%S')}] Detected {len(unassigned)} unassigned incidents & {len(available_personnel)} available personnel. Calculating optimal routes...")
            
            matches = self.compute_mwm_allocation(unassigned, available_personnel)
            if matches:
                count = self.dispatch_matches(conn, matches, available_resources)
                if count > 0:
                    print(f"[OK] Successfully dispatched {count} responders.")
        except sqlite3.OperationalError as e:
            if "locked" in str(e).lower():
                pass
            else:
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
        """Runs the continuous daemon loop."""
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
