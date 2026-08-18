import sys
import os
import time
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from resqnet.inner_loop.tactical_dispatcher import TacticalDispatcher
from resqnet.outer_loop.semi_markov import SemiMarkovModel
from resqnet.evaluation.metrics import calculate_jains_index
from resqnet.evaluation.baselines import Baselines
import numpy as np

def run_simulation():
    print("--- Running Phase 5 End-to-End Simulation ---")
    start_time = time.time()
    
    # Simulate Outer Loop
    markov = SemiMarkovModel()
    state = markov.predict_recovery(1, 4.0)
    print(f"Outer Loop: Predicted recovery state = {state}")
    
    # Simulate Inner Loop
    dispatcher = TacticalDispatcher()
    distances = np.random.uniform(1.0, 10.0, size=5)
    match = dispatcher.dispatch({'type': 'fire'}, [{} for _ in range(5)], distances)
    print(f"Inner Loop: Dispatched unit {match} at distance {distances[match]:.2f}")
    
    # Simulate Evaluation
    allocs = [5.0, 4.5, 5.5, 5.0]
    jains = calculate_jains_index(allocs)
    print(f"Evaluation: Jain's Fairness Index = {jains:.4f}")
    
    end_time = time.time()
    print(f"End-to-End Latency: {(end_time - start_time):.4f} seconds")
    print("--- Phase 5 Simulation Complete ---")

if __name__ == "__main__":
    run_simulation()
