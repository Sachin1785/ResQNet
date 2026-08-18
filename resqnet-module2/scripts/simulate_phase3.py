import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import torch
from resqnet.models.evolve_gcn import EvolvingGCNConv
from resqnet.models.transformer_actor import TransformerActor
from resqnet.models.mlp_critic import MLPCritic

def run_simulation():
    print("--- Running Phase 3 Simulation ---")
    
    print("Testing Parameter-Evolving GCN...")
    gcn = EvolvingGCNConv(in_channels=8, out_channels=16, heads=2)
    x = torch.randn((4, 8))
    edge_index = torch.tensor([[0, 1, 2], [1, 2, 0]], dtype=torch.long)
    edge_attr = torch.randn((3, 1))
    
    out1 = gcn(x, edge_index, edge_attr)
    print(f"GCN Output shape (Epoch 1): {out1.shape}")
    out2 = gcn(x, edge_index, edge_attr)
    print(f"GCN Weight evolved. Diff norm: {torch.norm(out1 - out2).item():.4f}")
    
    print("Testing Transformer-XL Actor...")
    actor = TransformerActor(state_dim=12, num_depots=3)
    x_actor = torch.randn((2, 5, 12)) # 2 batches, 5 responders
    pref = actor(x_actor)
    print(f"Actor Preferences shape: {pref.shape}")
    print(f"Sample Preferences (Batch 0, Responder 0): {pref[0, 0].tolist()}")
    
    print("Testing MLP Critic...")
    critic = MLPCritic(state_dim=10, action_dim=3)
    s = torch.randn((1, 10))
    a = torch.randn((1, 3))
    q = critic(s, a)
    print(f"Critic Q-Value: {q.item():.4f}")
    
    print("--- Phase 3 Simulation Complete ---")

if __name__ == "__main__":
    run_simulation()
