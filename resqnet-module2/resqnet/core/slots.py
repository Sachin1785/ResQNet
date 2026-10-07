AGENCY_REQUIREMENTS = {
    "fire": {
        "critical": {1: 2, 2: 1},
        "high": {1: 1, 2: 1},
        "medium": {1: 1},
        "low": {1: 1}
    },
    "medical": {
        "critical": {2: 2},
        "high": {2: 1},
        "medium": {2: 1},
        "low": {2: 1}
    },
    "accident": {
        "critical": {0: 1, 2: 2},
        "high": {0: 1, 2: 1},
        "medium": {0: 1, 2: 1},
        "low": {0: 1}
    },
    "natural_disaster": {
        "critical": {0: 1, 1: 1, 2: 1},
        "high": {1: 1, 2: 1},
        "medium": {0: 1},
        "low": {0: 1}
    },
    "other": {
        "critical": {0: 1, 2: 1},
        "high": {0: 1},
        "medium": {0: 1},
        "low": {0: 1}
    }
}

def target_team(incident_type_db: str, severity_label: str) -> dict[int, int]:
    """Returns the target team composition for an incident."""
    reqs = AGENCY_REQUIREMENTS.get(incident_type_db, AGENCY_REQUIREMENTS["other"])
    return reqs.get(severity_label, reqs.get("low", {})).copy()

def open_slots(target: dict[int, int], assigned_agencies: list[int]) -> dict[int, int]:
    """Returns the remaining open slots."""
    slots = target.copy()
    for agency in assigned_agencies:
        if agency in slots:
            slots[agency] = max(0, slots[agency] - 1)
    return slots
