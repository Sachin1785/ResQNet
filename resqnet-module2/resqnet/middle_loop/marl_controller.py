import torch
import numpy as np

class MARLController:
    def __init__(self):
        pass
        
    def cross_level_reward(self, hlp_reward, llp_q_values, lambda_rates):
        """
        Train HLP using a weighted convex combination of LLP critic values:
        R_HLP = sum(lambda_g_t * Q_LLP^g(s_t, a_t))
        """
        combined_q = torch.sum(lambda_rates * llp_q_values)
        return combined_q

    def apply_strategic_guidance(self, score_matrix, mcfp_flows, personnel_regions, incident_regions, penalty_weight=2.0):
        """
        Adjusts the score_matrix (used by Tactical Hungarian loop) based on Strategic MCFP flows.
        Penalizes assignments that contradict the high-level region-to-region quotas.
        """
        if mcfp_flows is None:
            return score_matrix
            
        adjusted_scores = score_matrix.copy()
        num_personnel, num_incidents = score_matrix.shape
        
        for p in range(num_personnel):
            for inc in range(num_incidents):
                r_from = personnel_regions[p]
                r_to = incident_regions[inc]
                
                if r_from >= 0 and r_to >= 0:
                    quota = mcfp_flows[r_from, r_to]
                    if quota <= 0.01:
                        # Strategic loop says NO resources should flow from r_from to r_to
                        adjusted_scores[p, inc] -= penalty_weight
                    else:
                        # Strategic loop allocated a quota here, slight bonus
                        adjusted_scores[p, inc] += (quota * 0.2)
                        
        return adjusted_scores
