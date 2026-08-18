from resqnet.inner_loop.tactical_dispatcher import TacticalDispatcher
from resqnet.outer_loop.semi_markov import SemiMarkovModel
from resqnet.evaluation.metrics import calculate_jains_index

def test_pipeline():
    dispatcher = TacticalDispatcher()
    match = dispatcher.dispatch({}, [{}], [5.0])
    assert match == 0
    
    markov = SemiMarkovModel()
    assert markov.predict_recovery(0, 4.0) == 2
    
    assert calculate_jains_index([2.0, 2.0, 2.0]) == 1.0
