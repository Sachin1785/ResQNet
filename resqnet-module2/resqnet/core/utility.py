import torch

def calculate_utility(
    allocation_matrix: torch.Tensor,
    effectiveness_matrix: torch.Tensor,
    category_labels: torch.Tensor,
    viability_threshold: float = 0.5,
    sigmoid_k: float = 5.0,
    alpha: float = 0.6,
    survival_prob: torch.Tensor = None,
    max_demand: torch.Tensor = None
) -> torch.Tensor:
    """
    allocation_matrix: (N_zones, M_resources)
    effectiveness_matrix: (N_zones, M_resources)
    category_labels: (M_resources,) containing integers 0, 1, 2 (Personnel, Vehicles, Equipment)
    survival_prob: (N_zones,)
    max_demand: (N_zones,)
    """
    N = allocation_matrix.shape[0]
    device = allocation_matrix.device
    
    if survival_prob is None:
        survival_prob = torch.ones(N, device=device)
    if max_demand is None:
        max_demand = torch.full((N,), float('inf'), device=device)

    # Sigmoid viability threshold
    eff_allocation = allocation_matrix * (1.0 / (1.0 + torch.exp(-sigmoid_k * (allocation_matrix - viability_threshold))))
    
    # Base utility
    base_utility = torch.sum(effectiveness_matrix * (eff_allocation ** alpha), dim=1)
    
    # Tiered Synergy
    is_present = allocation_matrix >= viability_threshold
    
    cat_0 = is_present[:, category_labels == 0].any(dim=1)
    cat_1 = is_present[:, category_labels == 1].any(dim=1)
    cat_2 = is_present[:, category_labels == 2].any(dim=1)
    
    num_categories_present = cat_0.int() + cat_1.int() + cat_2.int()
    
    synergy = torch.ones(N, device=device)
    synergy[num_categories_present == 2] = 1.10
    synergy[num_categories_present == 3] = 1.15
    
    unbounded_utility = base_utility * synergy * survival_prob
    
    return torch.minimum(unbounded_utility, max_demand)
