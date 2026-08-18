class MeshSync:
    def __init__(self):
        self.local_hashes = []
        
    def broadcast_offer(self, offer_hash):
        self.local_hashes.append(offer_hash)
        
    def sync(self):
        return self.local_hashes
