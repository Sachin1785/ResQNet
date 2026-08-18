import numpy as np

class DemandForecaster:
    def __init__(self):
        pass
        
    def forecast(self, base_rate, time_steps):
        return np.random.poisson(lam=base_rate, size=time_steps)
