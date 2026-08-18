import numpy as np

class TacticalDispatcher:
    def __init__(self):
        pass
        
    def dispatch(self, incident, available_units, distance_matrix):
        """
        incident: dict with details
        available_units: list of dicts representing units
        distance_matrix: array of distances between incident and units
        Returns: best match unit index
        """
        if not available_units:
            return None
        return np.argmin(distance_matrix)
