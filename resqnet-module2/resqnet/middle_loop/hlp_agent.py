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
        c = costs.flatten()
        
        A_ub = np.zeros((n, n * n))
        for i in range(n):
            A_ub[i, i*n:(i+1)*n] = 1
        b_ub = supplies
        
        A_eq = np.zeros((n, n * n))
        for j in range(n):
            A_eq[j, j::n] = 1
        b_eq = demands
        
        bounds = [(0, None)] * (n * n)
        
        res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
        if res.success:
            return res.x.reshape((n, n))
        else:
            return np.zeros((n, n))
