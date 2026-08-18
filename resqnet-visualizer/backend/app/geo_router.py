import networkx as nx
import math

class GeoRouter:
    def __init__(self, graph):
        self.graph = graph

    def get_coordinates(self, node_id: str) -> tuple[float, float]:
        """Returns (lon, lat) for a node."""
        node = self.graph.nodes[int(node_id)]
        return float(node['x']), float(node['y'])

    def generate_trajectory(self, route: list[str], start_tick: int, duration_ticks: int) -> list[dict]:
        """
        Takes a route of node IDs and interpolates a timestamped trajectory array.
        Each waypoint looks like [lon, lat, timestamp].
        """
        if not route:
            return []
            
        coords = [self.get_coordinates(n) for n in route]
        
        # Calculate cumulative distance to properly distribute timestamps
        distances = [0.0]
        def dist(c1, c2):
            return math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)
            
        for i in range(1, len(coords)):
            distances.append(distances[-1] + dist(coords[i-1], coords[i]))
            
        total_dist = distances[-1]
        
        trajectory = []
        for i, c in enumerate(coords):
            # Proportional time based on distance
            fraction = distances[i] / total_dist if total_dist > 0 else 0
            # Note: deck.gl TripsLayer expects timestamp format
            ts = start_tick + (fraction * duration_ticks)
            trajectory.append({
                "lon": c[0],
                "lat": c[1],
                "timestamp": ts
            })
            
        return trajectory
