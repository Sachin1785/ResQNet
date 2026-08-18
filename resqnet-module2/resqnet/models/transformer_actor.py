import torch
import torch.nn as nn
import torch.nn.functional as F

class TransformerActor(nn.Module):
    def __init__(self, state_dim: int, num_depots: int, hidden_dim: int = 128, num_layers: int = 2, nhead: int = 4):
        super().__init__()
        self.state_dim = state_dim
        self.num_depots = num_depots
        
        self.embedding = nn.Linear(state_dim, hidden_dim)
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim, 
            nhead=nhead,
            dim_feedforward=hidden_dim * 2,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        self.output_head = nn.Linear(hidden_dim, num_depots)

    def forward(self, x, mask=None, action_mask=None):
        # x: (batch_size, seq_len, state_dim)
        emb = self.embedding(x)
        
        # Variable sequence lengths supported via mask
        out = self.transformer(emb, src_key_padding_mask=mask)
        
        preferences = self.output_head(out)
        
        if action_mask is not None:
            # Add action mask penalty (expected to contain 0.0 for valid, -1e9 for invalid)
            preferences = preferences + action_mask
            
        return F.softmax(preferences, dim=-1)
