import functools
import gymnasium as gym
from gymnasium.spaces import Discrete, MultiDiscrete, Box, Dict
from pettingzoo import ParallelEnv
import numpy as np

class DisasterResponseEnv(ParallelEnv):
    metadata = {"render_modes": ["human"], "name": "resqnet_v0"}

    def __init__(self):
        super().__init__()
        self.possible_agents = ["agent_0", "agent_1"]
        self.agents = self.possible_agents[:]
        
        # Action space: moving to one of 5 nodes
        self.num_nodes = 5
        self._action_spaces = {agent: Discrete(self.num_nodes) for agent in self.agents}
        
        # State: Agent locations, node status
        self._observation_spaces = {
            agent: Dict({
                "observation": Box(low=0, high=1, shape=(self.num_nodes,), dtype=np.float32),
                "action_mask": Box(low=0, high=1, shape=(self.num_nodes,), dtype=np.int8)
            })
            for agent in self.agents
        }
        
    @functools.lru_cache(maxsize=None)
    def observation_space(self, agent):
        return self._observation_spaces[agent]

    @functools.lru_cache(maxsize=None)
    def action_space(self, agent):
        return self._action_spaces[agent]

    def reset(self, seed=None, options=None):
        self.agents = self.possible_agents[:]
        self.agent_locations = {agent: 0 for agent in self.agents}
        
        observations = {
            agent: {
                "observation": np.zeros(self.num_nodes, dtype=np.float32),
                "action_mask": np.ones(self.num_nodes, dtype=np.int8)
            }
            for agent in self.agents
        }
        infos = {agent: {} for agent in self.agents}
        return observations, infos

    def step(self, actions):
        rewards = {agent: 0 for agent in self.agents}
        terminations = {agent: False for agent in self.agents}
        truncations = {agent: False for agent in self.agents}
        infos = {agent: {} for agent in self.agents}
        
        for agent, action in actions.items():
            self.agent_locations[agent] = action
            rewards[agent] += 1  # Dummy reward
            
        observations = {
            agent: {
                "observation": np.zeros(self.num_nodes, dtype=np.float32),
                "action_mask": np.ones(self.num_nodes, dtype=np.int8)
            }
            for agent in self.agents
        }
        
        if np.random.random() < 0.1:
            terminations = {agent: True for agent in self.agents}
            self.agents = []
            
        return observations, rewards, terminations, truncations, infos
