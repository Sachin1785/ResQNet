import numpy as np

class SemiMarkovModel:
    def __init__(self):
        self.states = [0, 1, 2, 3]
        
    def predict_recovery(self, current_state, time_horizon):
        return min(current_state + int(time_horizon / 2.0), 3)
