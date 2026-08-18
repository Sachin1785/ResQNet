import numpy as np
import random

class SumTree:
    def __init__(self, capacity):
        self.capacity = capacity
        self.tree = np.zeros(2 * capacity - 1)
        self.data = np.zeros(capacity, dtype=object)
        self.write = 0

    def add(self, p, data):
        idx = self.write + self.capacity - 1
        self.data[self.write] = data
        self.update(idx, p)
        self.write += 1
        if self.write >= self.capacity:
            self.write = 0

    def update(self, idx, p):
        change = p - self.tree[idx]
        self.tree[idx] = p
        while idx != 0:
            idx = (idx - 1) // 2
            self.tree[idx] += change

    def get(self, s):
        idx = 0
        while True:
            left = 2 * idx + 1
            right = left + 1
            if left >= len(self.tree):
                break
            if s <= self.tree[left]:
                idx = left
            else:
                s -= self.tree[left]
                idx = right
        data_idx = idx - self.capacity + 1
        return idx, self.tree[idx], self.data[data_idx]

class PrioritizedReplayBuffer:
    def __init__(self, capacity, alpha=0.6):
        self.tree = SumTree(capacity)
        self.alpha = alpha
        self.capacity = capacity
        self.size = 0

    def add(self, transition, error):
        p = (np.abs(error) + 1e-5) ** self.alpha
        self.tree.add(p, transition)
        self.size = min(self.size + 1, self.capacity)

    def sample(self, batch_size, beta=0.4):
        batch = []
        idxs = []
        segment = self.tree.tree[0] / batch_size
        priorities = []
        for i in range(batch_size):
            a = segment * i
            b = segment * (i + 1)
            s = random.uniform(a, b)
            idx, p, data = self.tree.get(s)
            
            priorities.append(p)
            batch.append(data)
            idxs.append(idx)
            
        sampling_probabilities = np.array(priorities) / self.tree.tree[0]
        is_weight = np.power(self.size * sampling_probabilities, -beta)
        is_weight /= is_weight.max()
        
        return batch, idxs, is_weight

    def update_priorities(self, idxs, errors):
        for idx, error in zip(idxs, errors):
            p = (np.abs(error) + 1e-5) ** self.alpha
            self.tree.update(idx, p)
