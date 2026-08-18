import sys
import os
import random
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from resqnet.inner_loop.routing_bridge import RoutingBridge
from resqnet.visualization.map_renderer import MapRenderer

def run_geo_simulation():
    print("--- Starting Geographic Simulation for Mumbai ---")
    
    # 1. Load Real Road Network
    # Using a specific neighborhood in Mumbai to keep the download fast for this simulation
    bridge = RoutingBridge(location="Bandra, Mumbai, India")
    graph = bridge.load_network()
    
    if graph is None or len(graph.nodes) == 0:
        print("Failed to load graph.")
        return
        
    nodes = list(graph.nodes)
    
    # 2. Randomly select depots and demand zones
    depot_nodes = random.sample(nodes, 3)
    demand_nodes = {node: random.randint(10, 100) for node in random.sample(nodes, 10)}
    
    # 3. Simulate disaster by severing random edges
    edges = list(graph.edges(keys=True))
    num_severed = int(len(edges) * 0.05) # 5% roads destroyed
    severed_edges = [ (u, v) for u, v, k in random.sample(edges, num_severed) ]
    
    print(f"Simulating disaster: {num_severed} roads severed.")
    
    # 4. Generate visualization
    renderer = MapRenderer(location_name="Bandra, Mumbai, India")
    renderer.generate_map(
        graph=graph,
        depot_nodes=depot_nodes,
        demand_nodes=demand_nodes,
        severed_edges=severed_edges,
        output_file="simulation_map.html"
    )
    
    print("--- Geographic Simulation Complete ---")

if __name__ == "__main__":
    run_geo_simulation()
