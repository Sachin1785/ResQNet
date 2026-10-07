import json
import logging
from pathlib import Path
import torch
import numpy as np
from typing import Optional

from resqnet.models.evolve_gcn import EvolvingGCNConv
from resqnet.models.pair_scorer import PairwiseTransformerScorer
from resqnet.core.features import GCN_IN_CHANNELS, GCN_OUT_CHANNELS, GCN_HEADS, NODE_RAW_DIM, PAIR_DIM

logger = logging.getLogger(__name__)

class NeuralScorer:
    def __init__(self, gcn, scorer, manifest):
        self.gcn = gcn
        self.scorer = scorer
        self.manifest = manifest
        
    @classmethod
    def try_load(cls, weights_dir: str | Path, domain: str) -> Optional["NeuralScorer"]:
        weights_dir = Path(weights_dir)
        pt_path = weights_dir / "resqnet_scorer.pt"
        json_path = weights_dir / "manifest.json"
        
        if not pt_path.exists() or not json_path.exists():
            logger.info("NEURAL SCORER: DISABLED (weights or manifest missing)")
            return None
            
        try:
            with open(json_path, "r") as f:
                manifest = json.load(f)
                
            if not manifest.get("validated", False):
                logger.info("NEURAL SCORER: DISABLED (not validated)")
                return None
                
            if domain not in manifest.get("domains", []):
                logger.info(f"NEURAL SCORER: DISABLED (domain '{domain}' not supported by weights)")
                return None
                
            # Check feature dims
            f_dims = manifest.get("feature_dims", {})
            if (f_dims.get("gcn_in") != GCN_IN_CHANNELS or 
                f_dims.get("gcn_out") != GCN_OUT_CHANNELS or
                f_dims.get("node") != NODE_RAW_DIM or
                f_dims.get("pair") != PAIR_DIM):
                logger.info("NEURAL SCORER: DISABLED (feature dimensions mismatch)")
                return None
                
            # Load models
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            checkpoint = torch.load(pt_path, map_location=device, weights_only=True)
            
            gcn = EvolvingGCNConv(
                in_channels=GCN_IN_CHANNELS,
                out_channels=GCN_OUT_CHANNELS,
                heads=GCN_HEADS
            ).to(device)
            gcn.load_state_dict(checkpoint["gcn"], strict=True)
            gcn.eval()
            gcn.reset_state()
            
            scorer = PairwiseTransformerScorer(
                node_dim=GCN_OUT_CHANNELS,
                agency_dim=3,
                inc_attr_dim=NODE_RAW_DIM,
                pair_dim=PAIR_DIM,
                hidden=manifest.get("hyperparams", {}).get("hidden", 64)
            ).to(device)
            scorer.load_state_dict(checkpoint["scorer"], strict=True)
            scorer.eval()
            
            val_regret = manifest.get("metrics", {}).get("val_regret", "N/A")
            git_commit = manifest.get("git_commit", "unknown")
            logger.info(f"NEURAL SCORER: ENABLED (val_regret={val_regret}, git={git_commit})")
            
            return cls(gcn, scorer, manifest)
            
        except Exception as e:
            logger.info(f"NEURAL SCORER: DISABLED (load error: {e})")
            return None

    def reset_episode(self):
        self.gcn.reset_state()
        
    @torch.no_grad()
    def preferences(self, gcn_embeddings: torch.Tensor, unit_agency: torch.Tensor, 
                    inc_attr: torch.Tensor, pair_feats: torch.Tensor) -> np.ndarray:
        """
        Returns preference scores in [U, I] via sigmoid.
        gcn_embeddings: [U+I, GCN_OUT_CHANNELS]
        unit_agency: [U, 3]
        inc_attr: [I, NODE_RAW_DIM]
        pair_feats: [U, I, PAIR_DIM]
        """
        U = unit_agency.shape[0]
        I = inc_attr.shape[0]
        if U == 0 or I == 0:
            return np.zeros((U, I))
            
        unit_emb = gcn_embeddings[:U].unsqueeze(0) # [1, U, H]
        inc_emb = gcn_embeddings[U:].unsqueeze(0)  # [1, I, H]
        
        unit_agency = unit_agency.unsqueeze(0) # [1, U, 3]
        inc_attr = inc_attr.unsqueeze(0) # [1, I, 7]
        pair_feats = pair_feats.unsqueeze(0) # [1, U, I, 11]
        
        logits = self.scorer(unit_emb, unit_agency, inc_emb, inc_attr, pair_feats) # [1, U, I]
        scores = torch.sigmoid(logits.squeeze(0)) # [U, I]
        
        return scores.cpu().numpy()
