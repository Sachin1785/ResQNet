import torch

def evaluate_metrics(student_logits, teacher_labels, mask):
    """
    Computes agreement and regret.
    For simplicity in this stub, we compute a basic BCE loss proxy.
    """
    if mask.sum() == 0:
        return {"agreement": 1.0, "regret": 0.0}
        
    student_preds = (torch.sigmoid(student_logits) > 0.5) & mask
    
    # Agreement
    correct = (student_preds == teacher_labels) & mask
    agreement = correct.sum().float() / mask.sum().float()
    
    # Regret (proxy)
    regret = 1.0 - agreement
    
    return {
        "agreement": agreement.item(),
        "regret": regret.item()
    }
