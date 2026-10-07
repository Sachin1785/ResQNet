import torch

INCIDENT_TYPES = ("fire", "medical", "accident", "disaster", "other")
SIM_TYPE_TO_CANON = {"Fire": "fire", "Car Crash": "accident", "Earthquake": "disaster"}
DB_TYPE_TO_CANON  = {"fire":"fire","medical":"medical","accident":"accident",
                     "natural_disaster":"disaster","other":"other"}
SIM_TYPE_TO_AFFINITY_KEY = {"Fire":"fire","Car Crash":"accident","Earthquake":"natural_disaster"}
SIM_UNIT_TO_AGENCY = {"Police Car":0, "Fire Truck":1, "Ambulance":2}
SIM_UNIT_TO_ROLE   = {"Police Car":"Police Officer","Fire Truck":"Fire Fighter","Ambulance":"Paramedic"}
SIM_SEVERITY_TO_LABEL = {5:"critical",4:"high",3:"medium",2:"low",1:"low"}
DB_SEVERITY_NORM = {"critical":1.0,"high":0.75,"medium":0.5,"low":0.25}

NODE_RAW_DIM  = 7    # [severity_norm, demand_ratio, onehot(5 types)]
GCN_IN_CHANNELS = 8  # +1: is_online appended by EvolvingDisasterGraph.to_pyg_data()
GCN_OUT_CHANNELS, GCN_HEADS = 16, 2
PAIR_DIM = 11

DEMAND_NORM = 10.0   # demand_ratio = min(units_needed / DEMAND_NORM, 1)
DIST_NORM_KM = 20.0
NEED_NORM = 5.0

def role_to_agency(role: str) -> int:
    """police->0, fire->1, everything else (paramedic/doctor/...)->2"""
    r = role.lower()
    if "police" in r or "law" in r:
        return 0
    elif "fire" in r:
        return 1
    else:
        return 2

def build_node_features(entities) -> torch.Tensor:
    """Builds node features [severity_norm, demand_ratio, type_onehot]."""
    # entities is a list of incidents, or dict of attributes
    # if it's a generic node, handle zeros
    raise NotImplementedError("To be implemented as needed")

def build_pair_features(unit_attrs, inc_attrs) -> torch.Tensor:
    """Builds pair features."""
    raise NotImplementedError("To be implemented as needed")

def feasibility_mask(unit_attrs, inc_attrs) -> torch.Tensor:
    """Computes feasibility mask."""
    raise NotImplementedError("To be implemented as needed")
