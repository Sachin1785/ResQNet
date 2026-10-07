import torch
import torch.nn as nn
from torch_geometric.nn import MessagePassing, GATConv

class EvolvingGCNConv(MessagePassing):
    def __init__(self, in_channels: int, out_channels: int, heads: int = 1):
        super().__init__(aggr='add', node_dim=0)
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.heads = heads
        
        # LSTM for weight evolution
        self.weight_lstm = nn.LSTMCell(in_channels * out_channels, in_channels * out_channels)
        
        # Initial flattened weight
        self.weight_init = nn.Parameter(torch.randn(in_channels * out_channels) / (in_channels**0.5))
        self.register_buffer("weight_flat", self.weight_init.clone())
        self.register_buffer("hx", torch.zeros(1, in_channels * out_channels))
        self.register_buffer("cx", torch.zeros(1, in_channels * out_channels))
        
        # Using GATConv for the attention part
        self.gat = GATConv(out_channels, out_channels // heads, heads=heads, concat=True, edge_dim=1)

    def reset_state(self):
        """Episode boundary: restore W0 and zero LSTM state."""
        self.weight_flat = self.weight_init.clone()
        self.hx = torch.zeros_like(self.hx)
        self.cx = torch.zeros_like(self.cx)

    def detach_state(self):
        """Truncated BPTT / inference: cut autograd history, keep numeric state."""
        self.weight_flat = self.weight_flat.detach()
        self.hx = self.hx.detach()
        self.cx = self.cx.detach()

    def evolve_weights(self):
        input_w = self.weight_flat.unsqueeze(0)
        self.hx, self.cx = self.weight_lstm(input_w, (self.hx, self.cx))
        self.weight_flat = self.hx.squeeze(0)
        return self.weight_flat.view(self.in_channels, self.out_channels)

    def forward(self, x, edge_index, edge_attr=None):
        W = self.evolve_weights()
        x_transformed = torch.matmul(x, W)
        
        out = self.gat(x_transformed, edge_index, edge_attr=edge_attr)
        return out
