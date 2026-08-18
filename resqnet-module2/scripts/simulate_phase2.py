import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
from resqnet.env.action_mask import generate_action_mask
from resqnet.env.disaster_env import DisasterResponseEnv

def run_simulation():
    print("--- Running Phase 2 Simulation ---")
    
    # Simulate Action Masking
    print("Testing Action Masking...")
    agent_locs = torch.tensor([0, 2])
    adj = torch.tensor([
        [1.0, 1.0, 0.0],
        [1.0, 1.0, 1.0],
        [0.0, 1.0, 1.0]
    ])
    depot_status = torch.tensor([1.0, 0.0, 1.0]) # Node 1 is offline depot
    hq = torch.tensor([0.0, 0.0, 50.0])
    hc = torch.tensor([10.0, 10.0, 50.0]) # Node 2 is saturated hospital
    fuel = torch.tensor([1.0, 0.05])
    req = torch.tensor([[0.1, 0.1, 0.1], [0.1, 0.1, 0.1]]) # Agent 1 lacks fuel for all
    
    mask = generate_action_mask(agent_locs, adj, depot_status, hq, hc, fuel, req)
    print(f"Action Mask:\n{mask}")
    
    # Simulate PettingZoo Env
    print("Testing Multi-Agent Environment...")
    env = DisasterResponseEnv()
    obs, info = env.reset()
    print(f"Reset Obs Keys: {list(obs.keys())}")
    
    actions = {"agent_0": 1, "agent_1": 2}
    obs, rewards, term, trunc, infos = env.step(actions)
    print(f"Step Rewards: {rewards}")
    
    print("--- Phase 2 Simulation Complete ---")

if __name__ == "__main__":
    run_simulation()
