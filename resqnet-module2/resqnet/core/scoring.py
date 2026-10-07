# Constants for scoring functions

W_DIST = 0.4
W_ROLE = 0.4
W_SEV = 0.2

ROLE_BASE_NONMATCH = 0.5
ROLE_TOP = 2.0
ROLE_RANK_DECAY = 0.4

SEVERITY_WEIGHTS = {
    "critical": 3.0,
    "high": 2.0,
    "medium": 1.2,
    "low": 0.8
}

ROLE_AFFINITY = {
    "fire": ["Fire Fighter", "Paramedic", "Police Officer"],
    "medical": ["Paramedic", "Doctor", "Fire Fighter", "Police Officer"],
    "accident": ["Police Officer", "Paramedic", "Fire Fighter"],
    "natural_disaster": ["Fire Fighter", "Police Officer", "Paramedic"],
    "other": ["Police Officer", "Paramedic", "Fire Fighter"],
}

def role_affinity_score(role: str, incident_type: str) -> float:
    """Calculates the affinity score of a role to an incident type."""
    affinity_list = ROLE_AFFINITY.get(incident_type, [])
    if role in affinity_list:
        rank = affinity_list.index(role)
        return ROLE_TOP - (rank * ROLE_RANK_DECAY)
    return ROLE_BASE_NONMATCH

def distance_score(dist_km: float) -> float:
    """Calculates the distance score."""
    return 1.0 / (1.0 + dist_km)

def severity_weight(label: str) -> float:
    """Gets the severity weight."""
    return SEVERITY_WEIGHTS.get(label, 1.0)

def analytic_pair_score(dist_km: float, role: str, incident_type: str, severity_label: str) -> float:
    """Calculates the overall analytic pair score."""
    d_score = distance_score(dist_km)
    r_score = role_affinity_score(role, incident_type)
    s_weight = severity_weight(severity_label)
    
    return W_DIST * d_score + W_ROLE * r_score + W_SEV * s_weight
