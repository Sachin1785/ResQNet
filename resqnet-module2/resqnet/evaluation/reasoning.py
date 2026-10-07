class DispatchExplainer:
    def explain(self, unit, incident, distance, infra=None, synergy_multiplier=None, synergy_tier=None):
        reason = f"Dispatched {unit.type} '{unit.id}' to {incident.type} '{incident.id}'."
        reason += f" Optimal travel: {distance:.1f}m."
        if synergy_tier and synergy_tier > 1:
            reason += f" Synergy tier {synergy_tier} (x{synergy_multiplier:.2f})."
        if infra:
            remaining = infra.max_capacity - infra.current_occupancy
            reason += f" Bound to {infra.type} '{infra.name}' ({remaining} slots left)."
        else:
            reason += f" WARNING: No {unit.type} support infrastructure available!"
        return reason
