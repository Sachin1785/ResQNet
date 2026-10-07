import sys
import os
import random
import torch
import uuid
import networkx as nx
from pathlib import Path

# Bridge to existing module
MODULE2_PATH = str(Path(__file__).resolve().parents[3] / "resqnet-module2")
if MODULE2_PATH not in sys.path:
    sys.path.insert(0, MODULE2_PATH)

from resqnet.inner_loop.routing_bridge import RoutingBridge
from resqnet.inference.neural_scorer import NeuralScorer
from resqnet.core.dispatch_rounds import solve_rounds
from resqnet.core.features import role_to_agency, INCIDENT_TYPES, DB_TYPE_TO_CANON, DB_SEVERITY_NORM
from resqnet.core.synergy import synergy_from_count
from resqnet.core.scoring import analytic_pair_score
from resqnet.env.simulation_engine import SimulationEngine
from resqnet.core.types import StationaryResource, MobileResource, DemandZone, get_incident_requirements
from resqnet.evaluation.reasoning import DispatchExplainer

from app.geo_router import GeoRouter

class EngineBridge:
    def __init__(self, location="Bandra, Mumbai, India"):
        self.routing_bridge = RoutingBridge(location=location)
        self.graph = self.routing_bridge.load_network()
        self.nodes = list(self.graph.nodes)
        self.edges = list(self.graph.edges)
        
        self.geo_router = GeoRouter(self.graph)
        self.engine = SimulationEngine()
        
        self.setup_environment()
        
        weights_dir = os.path.join(MODULE2_PATH, "weights")
        self.neural = NeuralScorer.try_load(weights_dir, domain="road")
        
        self.explainer = DispatchExplainer()
        
    def setup_environment(self):
        infra_types = ['Hospital', 'Police Station', 'Fire Station']
        for it in infra_types:
            for i in range(2):
                node = random.choice(self.nodes)
                self.engine.add_infrastructure(StationaryResource(
                    id=f"{it[:3]}-{i}", name=f"{it} {i}", type=it, max_capacity=5, location=str(node)
                ))
                
        unit_types = ['Ambulance', 'Fire Truck', 'Police Car']
        for ut in unit_types:
            for i in range(10):
                node = random.choice(self.nodes)
                self.engine.add_mobile_unit(MobileResource(
                    id=f"{ut[:3]}-{i}", type=ut, home_depot_id=str(node), current_location=str(node)
                ))
                
    def run_precompute(self, max_ticks=20):
        timeline = []
        for tick in range(max_ticks):
            timeline.append(self._step_tick(tick))
        return timeline
        
    def _step_tick(self, tick: int):
        completed, resolved = self.engine.tick()
        
        intercepted = []
        if random.random() < 0.3:
            u, v, _ = random.choice(self.edges)
            intercepted = self.engine.sever_edge(str(u), str(v))
            
        new_incidents = []
        if random.random() < 0.6:
            inc_type = random.choice(['Fire', 'Car Crash', 'Earthquake'])
            node = random.choice(self.nodes)
            severity = random.randint(1, 5)
            reqs = get_incident_requirements(inc_type, severity)
            
            if sum(reqs.values()) > 0:
                inc_id = f"INC-{str(uuid.uuid4())[:4]}"
                inc = DemandZone(
                    id=inc_id, type=inc_type, location=str(node), 
                    severity=severity, requirements=reqs
                )
                self.engine.add_incident(inc)
                
                lon, lat = self.geo_router.get_coordinates(inc.location)
                new_incidents.append({
                    "id": inc.id, "type": inc.type, "severity": inc.severity,
                    "requirements": inc.requirements, "remaining_requirements": inc.remaining_requirements,
                    "location": {"lon": lon, "lat": lat}
                })

        idle_units = [u for u in self.engine.mobile_units.values() if u.status in ['IDLE', 'REROUTING']]
        active_incs = [i for i in self.engine.incidents.values() if not i.resolved]
        
        active_incs_data = []
        for inc in active_incs:
            lon, lat = self.geo_router.get_coordinates(inc.location)
            active_incs_data.append({
                "id": inc.id, "type": inc.type, "severity": inc.severity,
                "requirements": inc.requirements, "remaining_requirements": inc.remaining_requirements,
                "location": {"lon": lon, "lat": lat}
            })
            
        infra_data = []
        for infra in self.engine.infrastructure.values():
            lon, lat = self.geo_router.get_coordinates(infra.location)
            infra_data.append({
                "id": infra.id, "name": infra.name, "type": infra.type,
                "max_capacity": infra.max_capacity, "current_occupancy": infra.current_occupancy,
                "location": {"lon": lon, "lat": lat}
            })
            
        busy_units = len(self.engine.mobile_units) - len(idle_units)
        hosp_cap = sum(i.current_occupancy for i in self.engine.infrastructure.values() if i.type == 'Hospital')
        fire_cap = sum(i.current_occupancy for i in self.engine.infrastructure.values() if i.type == 'Fire Station')
        pol_cap = sum(i.current_occupancy for i in self.engine.infrastructure.values() if i.type == 'Police Station')
        
        state_summary = {
            "busy_units": busy_units,
            "hospital_load": hosp_cap,
            "fire_station_load": fire_cap,
            "police_station_load": pol_cap,
            "active_incidents_count": len(active_incs),
            "neural_enabled": self.neural is not None
        }
        
        dispatches = []
        if idle_units and active_incs:
            # Map simulation types to daemon expected types
            unassigned = []
            for inc in active_incs:
                t = {'Fire':'fire','Car Crash':'accident','Earthquake':'natural_disaster'}.get(inc.type, 'other')
                sev = {5:'critical',4:'high',3:'medium',2:'low',1:'low'}.get(inc.severity, 'medium')
                rem = inc.remaining_requirements
                # Convert requirements to assigned_agencies (inverse approximation for slots)
                agencies_present = []
                orig = inc.requirements
                for r_type, c in orig.items():
                    agency = 0 if 'Police' in r_type else (1 if 'Fire' in r_type else 2)
                    assigned = c - rem.get(r_type, 0)
                    agencies_present.extend([agency]*assigned)
                
                unassigned.append({
                    "id": inc.id,
                    "type": t,
                    "severity": sev,
                    "assigned_agencies": agencies_present,
                    "sim_inc": inc,
                    "node": inc.location
                })
                
            available = []
            for u in idle_units:
                role = 'Police Officer' if 'Police' in u.type else ('Fire Fighter' if 'Fire' in u.type else 'Paramedic')
                agency = 0 if 'Police' in u.type else (1 if 'Fire' in u.type else 2)
                available.append({
                    "id": u.id,
                    "role": role,
                    "agency": agency,
                    "sim_unit": u,
                    "node": u.current_location
                })

            # Calculate actual road distance
            # Cache shortest path lengths from each incident node
            for inc in unassigned:
                try:
                    lengths = nx.single_source_dijkstra_path_length(self.graph, int(inc["node"]), weight="length")
                    inc["_lengths"] = lengths
                except Exception:
                    inc["_lengths"] = {}

            def score_fn(person, incident, present_agencies):
                d_m = incident.get("_lengths", {}).get(int(person["node"]), 5000.0)
                d_km = d_m / 1000.0
                person["_d_km"] = person.get("_d_km", {})
                person["_d_km"][incident["id"]] = d_km
                
                s = analytic_pair_score(d_km, person['role'], incident['type'], incident['severity'])
                
                # Hard feasibility check matching sim logic
                sim_inc = incident["sim_inc"]
                sim_u = person["sim_unit"]
                if sim_inc.remaining_requirements.get(sim_u.type, 0) <= 0:
                    s = 0.0
                
                return s

            matches = solve_rounds(unassigned, available, score_fn, neural_scorer=self.neural, gcn_embeddings=None)
            
            # Map matches to dispatch assignments
            for match in matches:
                person = match["personnel"]
                incident = match["incident"]
                rnd = match["round"]
                synergy_marginal = match["marginal_synergy"]
                
                unit = person["sim_unit"]
                inc = incident["sim_inc"]
                
                # Check synergistic effect for UI
                agencies_present = incident.get("assigned_agencies", [])
                agencies_present.append(person["agency"])
                n_distinct = len(set(agencies_present))
                s_tier = min(3, n_distinct)
                synergy_bundle = s_tier >= 2
                s_mult = synergy_from_count(n_distinct)
                
                try:
                    route = nx.shortest_path(self.graph, int(unit.current_location), int(inc.location), weight='length')
                    dist = nx.shortest_path_length(self.graph, int(unit.current_location), int(inc.location), weight='length')
                    route = [str(n) for n in route]
                except:
                    route = [unit.current_location, inc.location]
                    dist = 5000.0
                    
                success = self.engine.dispatch_unit(unit.id, inc.id, distance=dist, route=route)
                if success:
                    infra = self.engine.infrastructure[unit.assigned_infra_id] if unit.assigned_infra_id else None
                    reason = self.explainer.explain(unit, inc, dist, infra)
                    if s_tier > 1:
                        reason += f" Synergy tier {s_tier} (x{s_mult:.2f})."
                    
                    calc_duration = unit.busy_until - self.engine.time
                    trajectory = self.geo_router.generate_trajectory(route, tick, calc_duration)
                    
                    dispatches.append({
                        "unit_id": unit.id, "unit_type": unit.type,
                        "incident_id": inc.id, "incident_type": inc.type,
                        "distance": dist, "calculated_duration_ticks": calc_duration,
                        "synergy_bundle": synergy_bundle, 
                        "synergy_tier": s_tier,
                        "synergy_multiplier": s_mult,
                        "neural_term": match["neural_term"],
                        "reasoning": reason, "status": "SUCCESS",
                        "path": trajectory
                    })
                            
        return {
            "tick": tick,
            "completed_events": completed,
            "resolved_incidents": resolved,
            "intercepted_units": intercepted,
            "new_incidents": new_incidents,
            "active_incidents": active_incs_data,
            "infrastructure_status": infra_data,
            "state_summary": state_summary,
            "dispatches": dispatches
        }
