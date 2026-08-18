import numpy as np

def calculate_jains_index(allocations):
    x = np.array(allocations)
    if np.sum(x) == 0:
        return 0.0
    return (np.sum(x)**2) / (len(x) * np.sum(x**2))
