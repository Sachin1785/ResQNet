import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
import torch
from resqnet.middle_loop.hlp_agent import HighLevelPlanner
from resqnet.middle_loop.llp_agent import LowLevelPlanner
from resqnet.middle_loop.replay_buffer import PrioritizedReplayBuffer
from resqnet.middle_loop.marl_controller import MARLController

def run_simulation():
    print("--- Running Phase 4 Simulation ---")
    
    print("Testing HLP MCFP Solver...")
    hlp = HighLevelPlanner(num_regions=3)
    supplies = np.array([20, 0, 5])
    demands = np.array([0, 15, 10])
    costs = np.array([
        [0, 2, 5],
        [2, 0, 3],
        [5, 3, 0]
    ])
    flow = hlp.solve_mcfp(supplies, demands, costs)
    print(f"Optimal Flow Matrix:\n{flow}")
    
    print("Testing LLP MWM Solver...")
    llp = LowLevelPlanner(num_depots=4)
    pref = np.array([
        [0.1, 0.9, 0.0, 0.0],
        [0.8, 0.1, 0.0, 0.1],
        [0.0, 0.1, 0.9, 0.0]
    ])
    assign = llp.solve_mwm(pref)
    print(f"Assignments (Responder -> Depot): {assign}")
    
    print("Testing Prioritized Experience Replay...")
    per = PrioritizedReplayBuffer(capacity=100)
    per.add("t_high_error", error=100.0)
    per.add("t_low_error", error=0.01)
    batch, _, w = per.sample(batch_size=1)
    print(f"Sampled from PER: {batch[0]} with Importance Weight: {w[0]:.4f}")
    
    print("Testing CTDE Coordinator...")
    controller = MARLController()
    llp_q = torch.tensor([10.0, 20.0, 30.0])
    rates = torch.tensor([1.0, 0.5, 0.1])
    rew = controller.cross_level_reward(0.0, llp_q, rates)
    print(f"Cross-Level Reward: {rew.item():.4f}")
    
    print("--- Phase 4 Simulation Complete ---")

if __name__ == "__main__":
    run_simulation()
