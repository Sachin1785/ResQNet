import osmnx as ox
import networkx as nx

class RoutingBridge:
    def __init__(self, location="Mumbai, India"):
        self.location = location
        self.graph = None
        
    def load_network(self):
        """Downloads the drive network for the location using osmnx."""
        print(f"Downloading street network for {self.location}...")
        self.graph = ox.graph_from_place(self.location, network_type='drive')
        print(f"Network loaded with {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges.")
        return self.graph
        
    def get_shortest_path(self, origin_node, dest_node):
        if not self.graph:
            return None
        try:
            return nx.shortest_path(self.graph, origin_node, dest_node, weight='length')
        except nx.NetworkXNoPath:
            return None
