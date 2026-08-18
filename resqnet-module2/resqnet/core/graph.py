import networkx as nx
import torch
from torch_geometric.data import Data

class EvolvingDisasterGraph:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.node_id_to_idx = {}
        self.idx_to_node_id = []
        
    def add_demand_zone(self, node_id: str, features: torch.Tensor):
        if node_id not in self.node_id_to_idx:
            idx = len(self.idx_to_node_id)
            self.node_id_to_idx[node_id] = idx
            self.idx_to_node_id.append(node_id)
        self.graph.add_node(node_id, features=features, is_online=True)
        
    def set_node_offline(self, node_id: str):
        if node_id in self.graph:
            self.graph.nodes[node_id]['is_online'] = False
            
    def set_edge_status(self, u: str, v: str, is_operational: bool, latency_factor: float):
        self.graph.add_edge(u, v, is_operational=is_operational, latency_factor=latency_factor)
        
    def update_edge_weight(self, u: str, v: str, new_latency: float):
        """Dynamically update an edge's latency mid-simulation."""
        if self.graph.has_edge(u, v):
            self.graph[u][v]['latency_factor'] = new_latency
            self.graph[u][v]['is_operational'] = False if new_latency >= 1e9 else True
        
    def to_pyg_data(self) -> Data:
        # Export standardized PyTorch Geometric tensor
        num_nodes = len(self.idx_to_node_id)
        if num_nodes == 0:
            return Data(x=torch.empty((0,)), edge_index=torch.empty((2, 0), dtype=torch.long))
            
        # We assume all features have the same shape
        feat_list = []
        for i in range(num_nodes):
            node_id = self.idx_to_node_id[i]
            feat = self.graph.nodes[node_id].get('features', torch.zeros(1))
            is_online = float(self.graph.nodes[node_id].get('is_online', True))
            combined_feat = torch.cat([feat, torch.tensor([is_online], device=feat.device)])
            feat_list.append(combined_feat)
            
        x = torch.stack(feat_list)
        
        edges_u = []
        edges_v = []
        edge_attr_list = []
        
        for u, v, data in self.graph.edges(data=True):
            if data.get('is_operational', True):
                edges_u.append(self.node_id_to_idx[u])
                edges_v.append(self.node_id_to_idx[v])
                edge_attr_list.append(torch.tensor([data.get('latency_factor', 1.0)]))
                
        if edges_u:
            edge_index = torch.tensor([edges_u, edges_v], dtype=torch.long)
            edge_attr = torch.stack(edge_attr_list)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)
            edge_attr = torch.empty((0, 1))
            
        return Data(x=x, edge_index=edge_index, edge_attr=edge_attr)
