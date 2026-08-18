import torch
from resqnet.models.evolve_gcn import EvolvingGCNConv
from resqnet.models.transformer_actor import TransformerActor
from resqnet.models.mlp_critic import MLPCritic

def test_evolving_gcn():
    in_channels = 16
    out_channels = 32
    heads = 2
    model = EvolvingGCNConv(in_channels, out_channels, heads)
    
    x = torch.randn((5, in_channels))
    edge_index = torch.tensor([[0, 1, 2, 3], [1, 2, 3, 0]], dtype=torch.long)
    edge_attr = torch.randn((4, 1))
    
    out1 = model(x, edge_index, edge_attr)
    assert out1.shape == (5, out_channels)
    
    out2 = model(x, edge_index, edge_attr)
    # The outputs should be different because weights evolved
    assert not torch.allclose(out1, out2)

def test_transformer_actor():
    state_dim = 10
    num_depots = 5
    model = TransformerActor(state_dim, num_depots)
    
    # Variable number of responders
    batch_size = 2
    seq_len = 7
    x = torch.randn((batch_size, seq_len, state_dim))
    mask = torch.zeros((batch_size, seq_len), dtype=torch.bool)
    mask[0, 5:] = True # pad last 2 responders for batch 1
    
    out = model(x, mask)
    assert out.shape == (batch_size, seq_len, num_depots)
    # Probabilities should sum to 1 over the last dim
    assert torch.allclose(out.sum(dim=-1), torch.ones(batch_size, seq_len))

def test_mlp_critic():
    state_dim = 20
    action_dim = 10
    model = MLPCritic(state_dim, action_dim)
    
    state = torch.randn((4, state_dim))
    action = torch.randn((4, action_dim))
    
    q = model(state, action)
    assert q.shape == (4, 1)
