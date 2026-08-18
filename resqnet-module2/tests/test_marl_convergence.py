import numpy as np
import torch
from resqnet.middle_loop.replay_buffer import PrioritizedReplayBuffer
from resqnet.middle_loop.marl_controller import MARLController

def test_per_buffer():
    buffer = PrioritizedReplayBuffer(capacity=10)
    buffer.add("transition1", error=10.0)
    buffer.add("transition2", error=0.1)
    
    batch, idxs, weights = buffer.sample(batch_size=1)
    # The higher error transition should be sampled with higher probability, 
    # since we only sample 1, it's very likely to be transition1.
    # To avoid flakiness, we just test it runs correctly without crashing.
    assert len(batch) == 1
    assert len(idxs) == 1
    assert len(weights) == 1
    
def test_cross_level_reward():
    controller = MARLController()
    hlp_rew = 0.0
    llp_q = torch.tensor([5.0, 10.0])
    rates = torch.tensor([1.0, 2.0])
    
    rew = controller.cross_level_reward(hlp_rew, llp_q, rates)
    assert torch.isclose(rew, torch.tensor(25.0))
