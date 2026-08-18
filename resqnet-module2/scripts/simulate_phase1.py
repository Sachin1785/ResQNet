import sys
import os

# Add the project root to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
from resqnet.core.utility import calculate_utility
from resqnet.core.fairness import calculate_scalarized_objective
from resqnet.core.graph import EvolvingDisasterGraph

def run_simulation():
    print("--- Running Phase 1 Simulation ---")
    # Simulate utility calculation
    alloc = torch.tensor([[0.8, 0.7, 0.6], [0.1, 0.9, 0.0]])
    eff = torch.tensor([[1.2, 1.0, 0.8], [0.9, 1.1, 1.0]])
    cats = torch.tensor([0, 1, 2])
    max_dem = torch.tensor([10.0, 5.0])
    
    utils = calculate_utility(alloc, eff, cats, max_demand=max_dem)
    print(f"Calculated Utilities: {utils.tolist()}")
    
    # Simulate fairness calculation
    vuln = torch.tensor([0.8, 0.2])
    obj = calculate_scalarized_objective(utils, max_dem, vuln)
    print(f"Scalarized Objective: {obj.item()}")
    
    # Simulate graph
    graph = EvolvingDisasterGraph()
    graph.add_demand_zone("Zone_1", torch.tensor([1.0]))
    graph.add_demand_zone("Zone_2", torch.tensor([2.0]))
    graph.set_edge_status("Zone_1", "Zone_2", True, 1.5)
    pyg_data = graph.to_pyg_data()
    print(f"Graph PyG Data:")
    print(f"  Nodes (x): {pyg_data.x}")
    print(f"  Edges (edge_index): {pyg_data.edge_index}")
    print("--- Phase 1 Simulation Complete ---")

if __name__ == "__main__":
    run_simulation()
