import sys
import os
import random
import torch
import uuid
import networkx as nx

# Bridge to existing module
sys.path.insert(0, os.path.abspath(r"D:\Codeathon\resqnet-module2"))

from resqnet.inner_loop.routing_bridge import RoutingBridge
from resqnet.models.evolve_gcn import EvolvingGCNConv
from resqnet.models.transformer_actor import TransformerActor
from resqnet.middle_loop.llp_agent import LowLevelPlanner
from resqnet.core.graph import EvolvingDisasterGraph
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
        
        self.gcn = EvolvingGCNConv(in_channels=3, out_channels=16, heads=2)
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
            "active_incidents_count": len(active_incs)
        }
        
        dispatches = []
        if idle_units and active_incs:
            d_graph = EvolvingDisasterGraph()
            for node in self.nodes: d_graph.add_demand_zone(str(node), torch.tensor([0.0, random.random()]))
            for u, v, k, data in self.graph.edges(keys=True, data=True):
                d_graph.set_edge_status(str(u), str(v), True, data.get('length', 1.0))
                
            pyg_data = d_graph.to_pyg_data()
            pyg_data.x = pyg_data.x.to(torch.float32)
            if pyg_data.edge_attr is not None:
                pyg_data.edge_attr = pyg_data.edge_attr.to(torch.float32)
            
            node_embeddings = self.gcn(pyg_data.x, pyg_data.edge_index, pyg_data.edge_attr)
            
            responder_indices = [d_graph.node_id_to_idx[u.current_location] for u in idle_units]
            responder_states = node_embeddings[responder_indices]
            
            actor = TransformerActor(state_dim=16, num_depots=len(active_incs), hidden_dim=32)
            with torch.no_grad():
                preferences_tensor = actor(responder_states.unsqueeze(0))
            preferences = preferences_tensor.squeeze(0).numpy()
            
            planner = LowLevelPlanner(num_depots=len(active_incs))
            assignments = planner.solve_mwm(preferences)
            
            incident_to_assignments = {}
            for resp_idx, dem_idx in assignments:
                inc = active_incs[dem_idx]
                if inc.id not in incident_to_assignments:
                    incident_to_assignments[inc.id] = []
                incident_to_assignments[inc.id].append(resp_idx)
                
            for inc_id, assigned_resp_indices in incident_to_assignments.items():
                inc = self.engine.incidents[inc_id]
                
                matched_types = {}
                for r_idx in assigned_resp_indices:
                    u_type = idle_units[r_idx].type
                    matched_types[u_type] = matched_types.get(u_type, 0) + 1
                    
                rem = inc.remaining_requirements
                needs_multiple = sum(1 for v in rem.values() if v > 0) > 1
                has_multiple = len(matched_types.keys()) > 1
                is_synergy = needs_multiple and has_multiple
                
                for resp_idx in assigned_resp_indices:
                    unit = idle_units[resp_idx]
                    needed = inc.remaining_requirements.get(unit.type, 0)
                    
                    if needed > 0:
                        dist = float(torch.norm(responder_states[resp_idx] - node_embeddings[d_graph.node_id_to_idx[inc.location]]).detach()) * 100
                        
                        try:
                            route = nx.shortest_path(self.graph, int(unit.current_location), int(inc.location))
                            route = [str(n) for n in route]
                        except:
                            route = [unit.current_location, inc.location]
                        
                        success = self.engine.dispatch_unit(unit.id, inc.id, distance=dist, route=route)
                        if success:
                            infra = self.engine.infrastructure[unit.assigned_infra_id] if unit.assigned_infra_id else None
                            reason = self.explainer.explain(unit, inc, dist, infra)
                            
                            calc_duration = unit.busy_until - self.engine.time
                            trajectory = self.geo_router.generate_trajectory(route, tick, calc_duration)
                            
                            dispatches.append({
                                "unit_id": unit.id, "unit_type": unit.type,
                                "incident_id": inc.id, "incident_type": inc.type,
                                "distance": dist, "calculated_duration_ticks": calc_duration,
                                "synergy_bundle": is_synergy, "reasoning": reason, "status": "SUCCESS",
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
