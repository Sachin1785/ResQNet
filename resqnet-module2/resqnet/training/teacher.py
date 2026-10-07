import torch
import networkx as nx
from resqnet.core.scoring import analytic_pair_score
from resqnet.core.synergy import marginal_synergy
from resqnet.core.slots import target_team, open_slots
from resqnet.core.features import role_to_agency
# Note: In actual implementation, we will use a multi-round hungarian from dispatch_rounds.py

def get_teacher_costs(scenario):
    """
    Computes teacher cost matrix (which is analytic score with road distances).
    Returns (C_matrix, feasibility_mask)
    """
    G = scenario["graph"]
    units = scenario["units"]
    incidents = scenario["incidents"]
    
    U = len(units)
    I = len(incidents)
    
    C = torch.zeros((U, I))
    mask = torch.ones((U, I), dtype=torch.bool)
    
    # Simple teacher cost ignoring multi-round synergy for the base C matrix.
    # The actual teacher labels require solving the rounds.
    for i, u in enumerate(units):
        for j, inc in enumerate(incidents):
            try:
                # Dijkstra length
                d_km = nx.shortest_path_length(G, u["node"], inc["node"], weight="length")
            except nx.NetworkXNoPath:
                mask[i, j] = False
                continue
                
            # Maps back agency int to dummy role to use analytic score
            dummy_role = {0: "Police Officer", 1: "Fire Fighter", 2: "Paramedic"}[u["agency"]]
            
            score = analytic_pair_score(d_km, dummy_role, inc["type"], inc["severity"])
            C[i, j] = score
            
    return C, mask
