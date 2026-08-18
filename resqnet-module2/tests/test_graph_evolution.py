import torch
from resqnet.core.graph import EvolvingDisasterGraph

def test_graph_evolution():
    graph = EvolvingDisasterGraph()
    graph.add_demand_zone("A", torch.tensor([1.0, 2.0]))
    graph.add_demand_zone("B", torch.tensor([3.0, 4.0]))
    graph.set_edge_status("A", "B", is_operational=True, latency_factor=1.5)
    
    data = graph.to_pyg_data()
    assert data.x.shape == (2, 3)
    assert data.edge_index.shape == (2, 1)
    
    graph.set_edge_status("A", "B", is_operational=False, latency_factor=1.5)
    data2 = graph.to_pyg_data()
    assert data2.edge_index.shape == (2, 0)
    
    graph.set_node_offline("A")
    data3 = graph.to_pyg_data()
    # Check is_online flag (the last element of features) for node A
    assert data3.x[0, -1] == 0.0
