SYNERGY_TIERS = {0: 1.00, 1: 1.00, 2: 1.10, 3: 1.15}
AGENCIES = ("law_enforcement", "fire_rescue", "medical")  # category ids 0, 1, 2

def synergy_from_count(n_categories: int) -> float:
    """Returns the synergy factor based on the number of distinct agencies present."""
    # Cap to max tier
    n = min(n_categories, max(SYNERGY_TIERS.keys()))
    return SYNERGY_TIERS.get(n, 1.0)

def marginal_synergy(present: frozenset[int], new_agency: int) -> float:
    """
    Calculates the marginal synergy factor of adding a new agency.
    S(|present U {new}|) / S(|present|)
    """
    current_count = len(present)
    if new_agency in present:
        new_count = current_count
    else:
        new_count = current_count + 1
        
    current_synergy = synergy_from_count(current_count)
    new_synergy = synergy_from_count(new_count)
    
    return new_synergy / current_synergy
