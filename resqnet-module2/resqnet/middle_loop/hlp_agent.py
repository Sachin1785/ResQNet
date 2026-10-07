import numpy as np
from scipy.optimize import linprog

class HighLevelPlanner:
    def __init__(self, num_regions):
        self.num_regions = num_regions
        
    def solve_mcfp(self, supplies, demands, costs):
        """
        Minimum-Cost Flow Problem (MCFP) solver for inter-region resource quotas.
        supplies: (num_regions,) available surplus units
        demands: (num_regions,) required units
        costs: (num_regions, num_regions) transit delay/cost matrix
        """
        n = self.num_regions
        
        total_supply = np.sum(supplies)
        total_demand = np.sum(demands)
        
        if total_demand == 0 and total_supply == 0:
            return np.zeros((n, n))
            
        # Augmented with dummy node for imbalance
        aug_n = n + 1
        
        aug_supplies = np.zeros(aug_n)
        aug_supplies[:n] = supplies
        aug_supplies[n] = max(0, total_demand - total_supply)
        
        aug_demands = np.zeros(aug_n)
        aug_demands[:n] = demands
        aug_demands[n] = max(0, total_supply - total_demand)
        
        aug_costs = np.zeros((aug_n, aug_n))
        aug_costs[:n, :n] = costs
        aug_costs[n, :n] = 99999.0 # High penalty for dummy supply (unmet demand)
        aug_costs[:n, n] = 0.0     # Zero penalty for sending surplus to dummy demand
        
        c = aug_costs.flatten()
        
        A_eq = np.zeros((2 * aug_n, aug_n * aug_n))
        b_eq = np.zeros(2 * aug_n)
        
        # Supply constraints: sum of flow out of i == aug_supplies[i]
        for i in range(aug_n):
            A_eq[i, i*aug_n:(i+1)*aug_n] = 1
            b_eq[i] = aug_supplies[i]
            
        # Demand constraints: sum of flow into j == aug_demands[j]
        for j in range(aug_n):
            A_eq[aug_n + j, j::aug_n] = 1
            b_eq[aug_n + j] = aug_demands[j]
            
        # Remove one redundant equation to avoid singularity warning (standard in network flow)
        A_eq = A_eq[:-1]
        b_eq = b_eq[:-1]
        
        bounds = [(0, None)] * (aug_n * aug_n)
        
        res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
        if res.success:
            flow_matrix = res.x.reshape((aug_n, aug_n))
            return flow_matrix[:n, :n]
        else:
            return np.zeros((n, n))
