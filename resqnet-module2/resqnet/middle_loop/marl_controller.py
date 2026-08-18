import torch

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
