import torch
from resqnet.core.utility import calculate_utility
from resqnet.core.fairness import calculate_gini, calculate_scalarized_objective

def test_utility_synergy():
    N_zones = 2
    M_resources = 3
    alloc = torch.tensor([[0.6, 0.6, 0.6], [0.4, 0.6, 0.6]])
    eff = torch.ones((N_zones, M_resources))
    cats = torch.tensor([0, 1, 2])
    max_dem = torch.tensor([10.0, 10.0])
    
    util = calculate_utility(alloc, eff, cats, max_demand=max_dem)
    
    # Zone 0 has all 3 categories >= 0.5. Synergy should be 1.15
    # Zone 1 has 2 categories >= 0.5. Synergy should be 1.10
    assert util[0] > util[1]

def test_gini():
    f = torch.tensor([1.0, 1.0, 1.0])
    gini = calculate_gini(f)
    assert torch.isclose(gini, torch.tensor(0.0))
    
    f2 = torch.tensor([0.0, 10.0])
    gini2 = calculate_gini(f2)
    assert torch.isclose(gini2, torch.tensor(0.5))

def test_scalarized_objective():
    util = torch.tensor([5.0, 5.0])
    dem = torch.tensor([10.0, 10.0])
    vuln = torch.tensor([0.5, 0.5])
    obj = calculate_scalarized_objective(util, dem, vuln)
    assert obj > 0.0
