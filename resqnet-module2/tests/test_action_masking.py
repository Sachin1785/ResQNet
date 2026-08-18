import torch
from resqnet.env.action_mask import generate_action_mask

def test_action_mask():
    agent_locs = torch.tensor([0, 1])
    # 3 nodes: 0, 1, 2
    # Node 0 -> Node 1 road is severed
    adj = torch.tensor([
        [1.0, 0.0, 1.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0]
    ])
    depot_status = torch.tensor([1.0, 1.0, 0.0]) # Node 2 is offline
    hospital_queues = torch.tensor([0.0, 10.0, 0.0])
    hospital_caps = torch.tensor([10.0, 10.0, 10.0]) # Node 1 saturated
    
    fuel = torch.tensor([1.0, 1.0])
    req_fuel = torch.tensor([
        [0.1, 0.1, 0.1],
        [0.1, 0.1, 0.1]
    ])
    
    mask = generate_action_mask(agent_locs, adj, depot_status, hospital_queues, hospital_caps, fuel, req_fuel)
    
    # Agent 0 at node 0.
    # Can go to 0 (stay).
    # Cannot go to 1 (road severed).
    # Cannot go to 2 (offline).
    assert mask[0, 0] == 0.0
    assert mask[0, 1] == -1e9
    assert mask[0, 2] == -1e9
    
    # Agent 1 at node 1.
    # Cannot go to 1 (hospital full).
    assert mask[1, 1] == -1e9
    
    # Can go to 0 (road intact, hospital space, depot online).
    assert mask[1, 0] == 0.0
    
    # Cannot go to 2 (offline).
    assert mask[1, 2] == -1e9
