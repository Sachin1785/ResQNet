import torch
import torch.nn as nn

class MLPCritic(nn.Module):
    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 256):
        super().__init__()
        
        # Architecture: Concat state and action, pass through MLP
        self.net = nn.Sequential(
            nn.Linear(state_dim + action_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1)
        )
        
    def forward(self, state, action):
        # state: (batch_size, state_dim)
        # action: (batch_size, action_dim)
        x = torch.cat([state, action], dim=-1)
        q_value = self.net(x)
        return q_value
