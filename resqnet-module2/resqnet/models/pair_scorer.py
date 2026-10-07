import torch
import torch.nn as nn
from torch import Tensor

class PairwiseTransformerScorer(nn.Module):
    def __init__(self, node_dim=16, agency_dim=3, inc_attr_dim=7, pair_dim=11,
                 hidden=64, nhead=4, num_layers=2, dropout=0.1):
        super().__init__()
        
        # Projections to common hidden dimension
        self.unit_proj = nn.Linear(node_dim + agency_dim, hidden)
        self.inc_proj = nn.Linear(node_dim + inc_attr_dim, hidden)
        
        # Transformer encoder for units (permutation-invariant context over responders)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden, nhead=nhead, dim_feedforward=hidden * 4,
            dropout=dropout, batch_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # Scoring head
        self.head = nn.Sequential(
            nn.Linear(3 * hidden + pair_dim, hidden),
            nn.GELU(),
            nn.Linear(hidden, 1)
        )
        
    def forward(self, unit_emb: Tensor, unit_agency: Tensor, inc_emb: Tensor, inc_attr: Tensor, pair_feats: Tensor,
                unit_pad_mask: Tensor = None, inc_pad_mask: Tensor = None) -> Tensor:
        """
        unit_emb: [B, U, node_dim] (from GCN)
        unit_agency: [B, U, agency_dim] (one-hot)
        inc_emb: [B, I, node_dim] (from GCN)
        inc_attr: [B, I, inc_attr_dim]
        pair_feats: [B, U, I, pair_dim]
        unit_pad_mask: [B, U] (True for padded elements)
        inc_pad_mask: [B, I] (True for padded elements)
        
        Returns:
            logits: [B, U, I]
        """
        B, U, _ = unit_emb.shape
        _, I, _ = inc_emb.shape
        
        # Unit contextualization
        u_in = torch.cat([unit_emb, unit_agency], dim=-1) # [B, U, node_dim + agency_dim]
        u = self.unit_proj(u_in) # [B, U, H]
        u = self.encoder(u, src_key_padding_mask=unit_pad_mask) # [B, U, H]
        
        # Incident contextualization
        v_in = torch.cat([inc_emb, inc_attr], dim=-1) # [B, I, node_dim + inc_attr_dim]
        v = self.inc_proj(v_in) # [B, I, H]
        
        # Pairwise features
        u_exp = u.unsqueeze(2).expand(B, U, I, -1) # [B, U, I, H]
        v_exp = v.unsqueeze(1).expand(B, U, I, -1) # [B, U, I, H]
        uv_mul = u_exp * v_exp # [B, U, I, H]
        
        # Combine all features for scoring
        h = torch.cat([u_exp, v_exp, uv_mul, pair_feats], dim=-1) # [B, U, I, 3H + pair_dim]
        
        # Score pairs
        logits = self.head(h).squeeze(-1) # [B, U, I]
        
        # Mask out invalid padding if needed (often handled via BCE loss later)
        if unit_pad_mask is not None and inc_pad_mask is not None:
            mask = unit_pad_mask.unsqueeze(2) | inc_pad_mask.unsqueeze(1) # [B, U, I]
            logits = logits.masked_fill(mask, -float('inf'))
            
        return logits
