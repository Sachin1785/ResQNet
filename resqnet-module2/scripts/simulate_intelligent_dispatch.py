import sys
import os
import random
import torch
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from resqnet.inner_loop.routing_bridge import RoutingBridge
from resqnet.visualization.map_renderer import MapRenderer
from resqnet.models.evolve_gcn import EvolvingGCNConv
from resqnet.models.transformer_actor import TransformerActor
from resqnet.middle_loop.llp_agent import LowLevelPlanner
from resqnet.core.graph import EvolvingDisasterGraph

def run_intelligent_dispatch():
    print("--- Starting Intelligent Dispatch Simulation for Mumbai ---")
    
    # 1. Load Real Road Network
    bridge = RoutingBridge(location="Bandra, Mumbai, India")
    osmnx_graph = bridge.load_network()
    
    if osmnx_graph is None or len(osmnx_graph.nodes) == 0:
        print("Failed to load graph.")
        return
        
    nodes = list(osmnx_graph.nodes)
    num_nodes = len(nodes)
    
    # 2. Select Depots (Responders) and Demand Zones
    num_responders = 5
    num_demands = 10
    
    depot_nodes = random.sample(nodes, num_responders)
    remaining_nodes = list(set(nodes) - set(depot_nodes))
    demand_nodes = {node: random.randint(10, 100) for node in random.sample(remaining_nodes, num_demands)}
    
    # 3. Simulate disaster
    edges = list(osmnx_graph.edges(keys=True))
    num_severed = int(len(edges) * 0.05)
    severed_edges = [(u, v) for u, v, k in random.sample(edges, num_severed)]
    
    print(f"Network extracted. {num_responders} depots and {num_demands} demand zones established.")
    
    # 4. Construct EvolvingDisasterGraph for PyG Tensor generation
    d_graph = EvolvingDisasterGraph()
    for node in nodes:
        feat = 0.0
        if node in depot_nodes: feat = 1.0
        elif node in demand_nodes: feat = 2.0
        d_graph.add_demand_zone(str(node), torch.tensor([feat, random.random()]))
        
    for u, v, k, data in osmnx_graph.edges(keys=True, data=True):
        if (u, v) in severed_edges or (v, u) in severed_edges:
            d_graph.set_edge_status(str(u), str(v), False, 10.0)
        else:
            d_graph.set_edge_status(str(u), str(v), True, data.get('length', 1.0))
            
    pyg_data = d_graph.to_pyg_data()
    
    # 4.5 Simulate mid-simulation road collapse using Semi-Markov logic
    u, v, _ = edges[0]
    print(f"Semi-Markov Model predicts mid-simulation collapse of road {u} -> {v}. Applying 1e9 latency penalty.")
    d_graph.update_edge_weight(str(u), str(v), 1e9)
    # Regenerate updated tensors
    pyg_data = d_graph.to_pyg_data()
    
    # Cast tensors to float32 to match GNN weights
    pyg_data.x = pyg_data.x.to(torch.float32)
    if pyg_data.edge_attr is not None:
        pyg_data.edge_attr = pyg_data.edge_attr.to(torch.float32)
        
    print("Geographic graph successfully converted to PyG Tensors.")
    
    # 5. Forward Pass: EvolveGCN -> State Embeddings
    gcn = EvolvingGCNConv(in_channels=3, out_channels=16, heads=2)
    node_embeddings = gcn(pyg_data.x, pyg_data.edge_index, pyg_data.edge_attr)
    print("EvolveGCN completed embedding of real road topologies.")
    
    # 6. Forward Pass: TransformerActor -> Preferences
    responder_indices = [d_graph.node_id_to_idx[str(n)] for n in depot_nodes]
    responder_states = node_embeddings[responder_indices] 
    
    actor = TransformerActor(state_dim=16, num_depots=num_demands, hidden_dim=32)
    with torch.no_grad():
        preferences_tensor = actor(responder_states.unsqueeze(0)) 
    
    preferences = preferences_tensor.squeeze(0).numpy()
    print("TransformerActor completed dispatch preference predictions.")
    
    # 7. LowLevelPlanner: Max Weight Matching Assignment
    planner = LowLevelPlanner(num_depots=num_demands)
    assignments = planner.solve_mwm(preferences)
    
    demand_keys = list(demand_nodes.keys())
    dispatches = []
    for resp_idx, dem_idx in assignments:
        u = depot_nodes[resp_idx]
        v = demand_keys[dem_idx]
        dispatches.append((u, v))
        
    print(f"LowLevelPlanner finalized {len(dispatches)} intelligent dispatch routes.")
    
    # 8. Render AI Dispatches on Map
    renderer = MapRenderer(location_name="Bandra, Mumbai, India")
    renderer.generate_map(
        graph=osmnx_graph,
        depot_nodes=depot_nodes,
        demand_nodes=demand_nodes,
        severed_edges=severed_edges,
        dispatches=dispatches,
        output_file="intelligent_dispatch_map.html"
    )
    print("--- Intelligent Geographic Simulation Complete ---")

if __name__ == "__main__":
    run_intelligent_dispatch()
