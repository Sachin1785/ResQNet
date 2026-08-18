import sys
import os
import random
import torch
import uuid
import json
import networkx as nx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from resqnet.inner_loop.routing_bridge import RoutingBridge
from resqnet.models.evolve_gcn import EvolvingGCNConv
from resqnet.models.transformer_actor import TransformerActor
from resqnet.middle_loop.llp_agent import LowLevelPlanner
from resqnet.core.graph import EvolvingDisasterGraph
from resqnet.env.simulation_engine import SimulationEngine
from resqnet.core.types import StationaryResource, MobileResource, DemandZone, get_incident_requirements
from resqnet.evaluation.reasoning import DispatchExplainer

def run():
    bridge = RoutingBridge(location="Bandra, Mumbai, India")
    graph = bridge.load_network()
    nodes = list(graph.nodes)
    edges = list(graph.edges)
    
    engine = SimulationEngine()
    
    infra_types = ['Hospital', 'Police Station', 'Fire Station']
    for it in infra_types:
        for i in range(2):
            node = random.choice(nodes)
            engine.add_infrastructure(StationaryResource(
                id=f"{it[:3]}-{i}", name=f"{it} {i}", type=it, max_capacity=5, location=str(node)
            ))
            
    unit_types = ['Ambulance', 'Fire Truck', 'Police Car']
    for ut in unit_types:
        for i in range(10):
            node = random.choice(nodes)
            engine.add_mobile_unit(MobileResource(
                id=f"{ut[:3]}-{i}", type=ut, home_depot_id=str(node), current_location=str(node)
            ))

    explainer = DispatchExplainer()
    gcn = EvolvingGCNConv(in_channels=3, out_channels=16, heads=2)
    
    output_log = {"simulation_ticks": []}
    
    for tick in range(12):
        tick_data = {
            "tick": tick,
            "completed_events": [],
            "resolved_incidents": [],
            "intercepted_units": [],
            "new_incidents": [],
            "active_incidents_status": [],
            "state_summary": {},
            "dispatches": []
        }
        
        # Advance time and capture completions
        completed, resolved = engine.tick()
        tick_data["completed_events"] = completed
        tick_data["resolved_incidents"] = resolved
        
        # EDGE SEVERING (Random chance per tick)
        if random.random() < 0.3:
            u, v, _ = random.choice(edges)
            intercepted = engine.sever_edge(str(u), str(v))
            if intercepted:
                tick_data["intercepted_units"].extend(intercepted)
        
        # Spawn incidents
        if random.random() < 0.6:
            inc_type = random.choice(['Fire', 'Car Crash', 'Earthquake'])
            node = random.choice(nodes)
            severity = random.randint(1, 5)
            reqs = get_incident_requirements(inc_type, severity)
            
            if sum(reqs.values()) > 0:
                inc_id = f"INC-{str(uuid.uuid4())[:4]}"
                engine.add_incident(DemandZone(
                    id=inc_id, type=inc_type, location=str(node), 
                    severity=severity, requirements=reqs
                ))
                tick_data["new_incidents"].append({
                    "id": inc_id, "type": inc_type, "severity": severity, "requirements": reqs
                })

        idle_units = [u for u in engine.mobile_units.values() if u.status in ['IDLE', 'REROUTING']]
        active_incs = [i for i in engine.incidents.values() if not i.resolved]
        
        # Populate active incidents status
        for inc in active_incs:
            tick_data["active_incidents_status"].append({
                "id": inc.id,
                "remaining_requirements": inc.remaining_requirements
            })
        
        busy_units = len(engine.mobile_units) - len(idle_units)
        hosp_cap = sum(i.current_occupancy for i in engine.infrastructure.values() if i.type == 'Hospital')
        fire_cap = sum(i.current_occupancy for i in engine.infrastructure.values() if i.type == 'Fire Station')
        pol_cap = sum(i.current_occupancy for i in engine.infrastructure.values() if i.type == 'Police Station')
        
        tick_data["state_summary"] = {
            "busy_units": busy_units,
            "hospital_load": hosp_cap,
            "fire_station_load": fire_cap,
            "police_station_load": pol_cap,
            "active_incidents_count": len(active_incs)
        }
        
        if not idle_units or not active_incs:
            output_log["simulation_ticks"].append(tick_data)
            continue
            
        d_graph = EvolvingDisasterGraph()
        for node in nodes: d_graph.add_demand_zone(str(node), torch.tensor([0.0, random.random()]))
        for u, v, k, data in graph.edges(keys=True, data=True):
            d_graph.set_edge_status(str(u), str(v), True, data.get('length', 1.0))
            
        pyg_data = d_graph.to_pyg_data()
        pyg_data.x = pyg_data.x.to(torch.float32)
        pyg_data.edge_attr = pyg_data.edge_attr.to(torch.float32)
        
        node_embeddings = gcn(pyg_data.x, pyg_data.edge_index, pyg_data.edge_attr)
        
        responder_indices = [d_graph.node_id_to_idx[u.current_location] for u in idle_units]
        responder_states = node_embeddings[responder_indices]
        
        actor = TransformerActor(state_dim=16, num_depots=len(active_incs), hidden_dim=32)
        with torch.no_grad():
            preferences_tensor = actor(responder_states.unsqueeze(0))
        preferences = preferences_tensor.squeeze(0).numpy()
        
        planner = LowLevelPlanner(num_depots=len(active_incs))
        assignments = planner.solve_mwm(preferences)
        
        # SYNERGY BUNDLE GROUPING
        incident_to_assignments = {}
        for resp_idx, dem_idx in assignments:
            inc = active_incs[dem_idx]
            if inc.id not in incident_to_assignments:
                incident_to_assignments[inc.id] = []
            incident_to_assignments[inc.id].append(resp_idx)
            
        for inc_id, assigned_resp_indices in incident_to_assignments.items():
            inc = engine.incidents[inc_id]
            
            # Count what is matched vs what is needed
            matched_types = {}
            for r_idx in assigned_resp_indices:
                u_type = idle_units[r_idx].type
                matched_types[u_type] = matched_types.get(u_type, 0) + 1
                
            rem = inc.remaining_requirements
            needs_multiple_types = sum(1 for v in rem.values() if v > 0) > 1
            has_multiple_types = len(matched_types.keys()) > 1
            
            is_synergy_bundle = needs_multiple_types and has_multiple_types
            
            for resp_idx in assigned_resp_indices:
                unit = idle_units[resp_idx]
                needed = inc.remaining_requirements.get(unit.type, 0)
                
                if needed > 0:
                    dist = float(torch.norm(responder_states[resp_idx] - node_embeddings[d_graph.node_id_to_idx[inc.location]])) * 100
                    
                    # Mock a route
                    try:
                        route = nx.shortest_path(graph, int(unit.current_location), int(inc.location))
                        route = [str(n) for n in route]
                    except:
                        route = [unit.current_location, inc.location]
                    
                    success = engine.dispatch_unit(unit.id, inc.id, distance=dist, route=route)
                    if success:
                        infra = engine.infrastructure[unit.assigned_infra_id] if unit.assigned_infra_id else None
                        reason = explainer.explain(unit, inc, dist, infra)
                        
                        calc_duration = unit.busy_until - engine.time
                        
                        tick_data["dispatches"].append({
                            "unit_id": unit.id, "unit_type": unit.type,
                            "incident_id": inc.id, "incident_type": inc.type,
                            "distance": round(dist, 2), 
                            "calculated_duration_ticks": calc_duration,
                            "synergy_bundle": is_synergy_bundle,
                            "reasoning": reason,
                            "status": "SUCCESS"
                        })
                    else:
                        tick_data["dispatches"].append({
                            "unit_id": unit.id, "unit_type": unit.type,
                            "incident_id": inc.id, "incident_type": inc.type,
                            "status": "BLOCKED_BY_CAPACITY"
                        })
                    
        output_log["simulation_ticks"].append(tick_data)

    print(json.dumps(output_log, indent=2))

if __name__ == "__main__":
    run()
