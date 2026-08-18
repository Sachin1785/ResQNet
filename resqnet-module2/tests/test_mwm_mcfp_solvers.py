import numpy as np
from resqnet.middle_loop.hlp_agent import HighLevelPlanner
from resqnet.middle_loop.llp_agent import LowLevelPlanner

def test_mcfp_solver():
    planner = HighLevelPlanner(num_regions=2)
    supplies = np.array([10, 0])
    demands = np.array([0, 10])
    costs = np.array([
        [0, 5],
        [5, 0]
    ])
    
    flow = planner.solve_mcfp(supplies, demands, costs)
    assert np.allclose(flow[0, 1], 10.0)
    assert np.allclose(flow[0, 0], 0.0)

def test_mwm_solver():
    planner = LowLevelPlanner(num_depots=3)
    preferences = np.array([
        [0.1, 0.8, 0.1],
        [0.6, 0.3, 0.1]
    ])
    
    assignments = planner.solve_mwm(preferences)
    # Agent 0 should get depot 1
    # Agent 1 should get depot 0
    assert (0, 1) in assignments
    assert (1, 0) in assignments
