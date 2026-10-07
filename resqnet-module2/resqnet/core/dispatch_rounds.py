import os
import torch
import numpy as np
from scipy.optimize import linear_sum_assignment
from resqnet.core.synergy import marginal_synergy
from resqnet.core.slots import target_team, open_slots
from resqnet.core.scoring import analytic_pair_score

MAX_ROUNDS = int(os.getenv("RESQNET_MAX_ROUNDS", "3"))
SLOT_MISMATCH_FACTOR = 0.25

def solve_rounds(incidents, personnel, score_fn, max_rounds=MAX_ROUNDS, neural_scorer=None, gcn_embeddings=None, strategic_controller=None, mcfp_flows=None):
    """
    Multi-round Hungarian algorithm with marginal synergy.
    score_fn(person, incident) -> float (analytic score + utility)
    """
    present = {inc["id"]: set(inc.get("assigned_agencies", [])) for inc in incidents}
    
    open_ = {}
    for inc in incidents:
        tgt = target_team(inc.get("type", "other"), inc.get("severity", "medium"))
        open_[inc["id"]] = open_slots(tgt, inc.get("assigned_agencies", []))
        
    free_personnel = list(personnel)
    matches = []
    
    # Precompute neural scores if available
    neural_scores = None
    if neural_scorer and gcn_embeddings is not None and len(free_personnel) > 0 and len(incidents) > 0:
        # Construct tensors for neural_scorer
        unit_agency = torch.tensor([p["agency"] for p in free_personnel], dtype=torch.long)
        unit_agency_onehot = torch.nn.functional.one_hot(unit_agency, num_classes=3).float()
        
        # Build inc_attr
        from resqnet.core.features import INCIDENT_TYPES, DB_TYPE_TO_CANON, DB_SEVERITY_NORM
        inc_attr_list = []
        for inc in incidents:
            t = DB_TYPE_TO_CANON.get(inc.get("type", "other").lower(), "other")
            t_idx = INCIDENT_TYPES.index(t)
            sev = DB_SEVERITY_NORM.get(inc.get("severity", "medium").lower(), 0.5)
            # demand ratio
            d_ratio = min(sum(open_[inc["id"]].values()) / 10.0, 1.0)
            
            row = [sev, d_ratio] + [1.0 if i == t_idx else 0.0 for i in range(5)]
            inc_attr_list.append(row)
        inc_attr = torch.tensor(inc_attr_list, dtype=torch.float32)
        
        # Build pair feats (straight-line)
        pair_feats = torch.zeros((len(free_personnel), len(incidents), 11), dtype=torch.float32)
        from resqnet.core.scoring import ROLE_TOP, role_affinity_score
        
        for p_idx, p in enumerate(free_personnel):
            for i_idx, inc in enumerate(incidents):
                d_km = p.get("_d_km", {}).get(inc["id"], 5.0) # Assume cached by caller or recompute
                pair_feats[p_idx, i_idx, 0] = 1.0 / (1.0 + d_km)
                pair_feats[p_idx, i_idx, 1] = min(d_km / 20.0, 1.0)
                pair_feats[p_idx, i_idx, 2] = role_affinity_score(p.get("role", ""), inc.get("type", "other")) / ROLE_TOP
                need_ratio = min(open_[inc["id"]].get(p["agency"], 0) / 5.0, 1.0)
                pair_feats[p_idx, i_idx, 3] = need_ratio
                pair_feats[p_idx, i_idx, 4] = inc_attr_list[i_idx][0] # severity_norm
                # 5-7 agency onehot
                pair_feats[p_idx, i_idx, 5 + p["agency"]] = 1.0
                # 8-10 agency present (updated per round, but neural features use snapshot state)
                for a in present[inc["id"]]:
                    pair_feats[p_idx, i_idx, 8 + a] = 1.0
                    
        neural_scores = neural_scorer.preferences(gcn_embeddings, unit_agency_onehot, inc_attr, pair_feats)
        
    for r in range(max_rounds):
        cols = [inc for inc in incidents if sum(open_[inc["id"]].values()) > 0]
        if not cols or not free_personnel:
            break
            
        S = np.zeros((len(free_personnel), len(cols)), dtype=np.float32)
        for p_idx, p in enumerate(free_personnel):
            for i_idx, inc in enumerate(cols):
                base_score = score_fn(p, inc, present[inc["id"]]) # base_score handles utility
                S[p_idx, i_idx] = base_score
                
        if neural_scores is not None:
            # Map free_personnel/cols back to original indices to extract neural term
            orig_p_indices = [personnel.index(p) for p in free_personnel]
            orig_i_indices = [incidents.index(inc) for inc in cols]
            
            for p_i, o_p in enumerate(orig_p_indices):
                for c_i, o_i in enumerate(orig_i_indices):
                    n_term = neural_scores[o_p, o_i]
                    # Blend
                    max_s = max(1.0, float(S.max()))
                    S[p_i, c_i] = 0.7 * S[p_i, c_i] + 0.3 * max_s * n_term
                    
        # Apply slot and synergy modifiers
        marginal_synergy_matrix = np.ones_like(S)
        neural_terms_recorded = np.zeros_like(S) # for logging
        for p_idx, p in enumerate(free_personnel):
            for i_idx, inc in enumerate(cols):
                agency = p.get("agency", 2)
                if open_[inc["id"]].get(agency, 0) == 0:
                    S[p_idx, i_idx] *= SLOT_MISMATCH_FACTOR
                else:
                    ms = marginal_synergy(frozenset(present[inc["id"]]), agency)
                    marginal_synergy_matrix[p_idx, i_idx] = ms
                    S[p_idx, i_idx] *= ms
                    
                if neural_scores is not None:
                    o_p = personnel.index(p)
                    o_i = incidents.index(inc)
                    neural_terms_recorded[p_idx, i_idx] = neural_scores[o_p, o_i]
                    
        if strategic_controller is not None and mcfp_flows is not None:
            # Requires full integration, simplifying for now
            pass
            
        row_ind, col_ind = linear_sum_assignment(-S)
        
        # Commit matches
        matched_this_round = []
        for ri, ci in zip(row_ind, col_ind):
            if S[ri, ci] > 0:
                p = free_personnel[ri]
                inc = cols[ci]
                agency = p.get("agency", 2)
                
                # Update state
                present[inc["id"]].add(agency)
                open_[inc["id"]][agency] = max(0, open_[inc["id"]].get(agency, 0) - 1)
                
                n_term = neural_terms_recorded[ri, ci] if neural_scores is not None else 0.0
                matches.append({
                    "round": r + 1,
                    "personnel": p,
                    "incident": inc,
                    "score": float(S[ri, ci]),
                    "marginal_synergy": float(marginal_synergy_matrix[ri, ci]),
                    "neural_term": float(n_term)
                })
                matched_this_round.append(p)
                
        # Remove assigned personnel
        for p in matched_this_round:
            free_personnel.remove(p)
            
    return matches
