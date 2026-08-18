class FieldIntelligence:
    def __init__(self):
        self.ground_truth_demand = {}
        
    def ingest_report(self, node_id, victims):
        self.ground_truth_demand[node_id] = victims
