import numpy as np
from scipy.optimize import linear_sum_assignment

class LowLevelPlanner:
    def __init__(self, num_depots):
        self.num_depots = num_depots
        
    def solve_mwm(self, preferences):
        """
        Maximum Weight Matching (MWM) using Hungarian algorithm.
        preferences: (num_responders, num_depots) preference likelihood matrix
        
        Returns:
            assignments: list of (responder_idx, depot_idx)
        """
        cost_matrix = -preferences
        
        row_ind, col_ind = linear_sum_assignment(cost_matrix)
        
        assignments = list(zip(row_ind, col_ind))
        return assignments
