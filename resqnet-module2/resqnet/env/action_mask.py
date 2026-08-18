import torch

def generate_action_mask(
    agent_locations: torch.Tensor,
    adjacency_matrix: torch.Tensor,
    depot_status: torch.Tensor,
    hospital_queues: torch.Tensor,
    hospital_capacities: torch.Tensor,
    fuel_levels: torch.Tensor,
    min_fuel_required: torch.Tensor
) -> torch.Tensor:
    """
    Generate binary masks (1 for valid, 0 for invalid) for actions.
    Assuming action space represents target nodes (depots/hospitals) to move to.
    
    agent_locations: (num_agents, num_nodes) index
    adjacency_matrix: (num_nodes, num_nodes) - 1 if road exists, 0 otherwise
    depot_status: (num_nodes,) - 1 if online, 0 if offline
    hospital_queues: (num_nodes,)
    hospital_capacities: (num_nodes,)
    fuel_levels: (num_agents,)
    min_fuel_required: (num_agents, num_nodes)
    """
    num_agents = agent_locations.shape[0]
    num_nodes = adjacency_matrix.shape[0]
    device = agent_locations.device
    
    mask = torch.ones((num_agents, num_nodes), device=device, dtype=torch.bool)
    
    # Condition 1: Severed road links from current location
    for i in range(num_agents):
        u = agent_locations[i]
        valid_paths = adjacency_matrix[u] > 0
        valid_paths[u] = True # Can stay
        mask[i] = mask[i] & valid_paths
        
    # Condition 2: Offline hubs/depots
    mask = mask & (depot_status > 0.5).unsqueeze(0)
    
    # Condition 3: Saturated hospital queues
    saturated_hospitals = hospital_queues >= hospital_capacities
    mask = mask & (~saturated_hospitals).unsqueeze(0)
    
    # Condition 4: Exceed fuel range
    has_fuel = fuel_levels.unsqueeze(1) >= min_fuel_required
    mask = mask & has_fuel
    
    penalty_mask = torch.zeros_like(mask, dtype=torch.float32)
    penalty_mask[~mask] = -1e9
    
    return penalty_mask
