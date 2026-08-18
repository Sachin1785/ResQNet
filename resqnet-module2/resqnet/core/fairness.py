import torch

def calculate_gini(fulfillments: torch.Tensor) -> torch.Tensor:
    """
    Calculate the Gini coefficient of a 1D tensor of fulfillments.
    """
    n = fulfillments.shape[0]
    if n <= 1:
        return torch.tensor(0.0, device=fulfillments.device)
        
    f_bar = torch.mean(fulfillments)
    if f_bar == 0:
        return torch.tensor(0.0, device=fulfillments.device)
        
    diffs = torch.abs(fulfillments.unsqueeze(0) - fulfillments.unsqueeze(1))
    gini = torch.sum(diffs) / (2.0 * n * n * (f_bar + 1e-8))
    return gini

def calculate_scalarized_objective(
    utility: torch.Tensor,
    max_demand: torch.Tensor,
    vulnerability_index: torch.Tensor,
    w_eff: float = 0.4,
    w_fair: float = 0.4,
    w_min: float = 0.2,
    omega: float = 0.5
) -> torch.Tensor:
    """
    utility: (N_zones,)
    max_demand: (N_zones,)
    vulnerability_index: (N_zones,)
    """
    # Need-Adjusted Fulfillment Ratio
    # f_i = U_i(X_i) / (V_{i,t} * (1 + \omega \Phi_i))
    f_i = utility / (max_demand * (1.0 + omega * vulnerability_index) + 1e-8)
    
    efficiency_score = torch.sum(utility) / (torch.sum(max_demand) + 1e-8)
    gini_score = 1.0 - calculate_gini(f_i)
    min_score = torch.min(f_i)
    
    return w_eff * efficiency_score + w_fair * gini_score + w_min * min_score
