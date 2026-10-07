import random
import numpy as np
import torch
import networkx as nx

def make_scenario(seed: int, domain: str = "mixed"):
    """
    Deterministically generates a synthetic scenario.
    domain in {"road", "knn", "mixed"}
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    
    # 1. Generate road graph (8x8 km box)
    n_nodes = random.randint(40, 120)
    G = nx.random_geometric_graph(n_nodes, radius=0.22)
    
    # Take largest connected component
    components = sorted(nx.connected_components(G), key=len, reverse=True)
    G = G.subgraph(components[0]).copy()
    
    # Make it directed both ways and assign lengths
    DG = nx.DiGraph()
    for u, v in G.edges():
        dist = ((G.nodes[u]['pos'][0] - G.nodes[v]['pos'][0])**2 + 
                (G.nodes[u]['pos'][1] - G.nodes[v]['pos'][1])**2)**0.5
        # Convert to km roughly (8km box scale)
        dist_km = dist * 8.0
        winding = random.uniform(1.0, 1.4)
        length = dist_km * winding
        
        DG.add_edge(u, v, length=length)
        DG.add_edge(v, u, length=length)
        
    for node in DG.nodes():
        DG.nodes[node]['pos'] = G.nodes[node]['pos']
        
    # 2. Units and Incidents
    nodes_list = list(DG.nodes())
    n_units = random.randint(4, 40)
    n_incidents = random.randint(1, 12)
    
    units = []
    for _ in range(n_units):
        u_node = random.choice(nodes_list)
        agency = random.randint(0, 2)
        units.append({"node": u_node, "agency": agency})
        
    incidents = []
    types = ["fire", "medical", "accident", "disaster", "other"]
    for _ in range(n_incidents):
        i_node = random.choice(nodes_list)
        inc_type = random.choice(types)
        severity = random.randint(1, 5)
        severity_label = {5: "critical", 4: "high", 3: "medium", 2: "low", 1: "low"}[severity]
        
        incidents.append({
            "node": i_node, 
            "type": inc_type, 
            "severity": severity_label,
            "severity_idx": severity
        })
        
    return {
        "graph": DG,
        "units": units,
        "incidents": incidents
    }
