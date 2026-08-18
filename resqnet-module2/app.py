import streamlit as st
from streamlit_folium import st_folium
import osmnx as ox
import random
import torch
import sys
import os
import uuid

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from resqnet.inner_loop.routing_bridge import RoutingBridge
from resqnet.visualization.map_renderer import MapRenderer
from resqnet.models.evolve_gcn import EvolvingGCNConv
from resqnet.models.transformer_actor import TransformerActor
from resqnet.middle_loop.llp_agent import LowLevelPlanner
from resqnet.core.graph import EvolvingDisasterGraph
from resqnet.env.simulation_engine import SimulationEngine
from resqnet.core.types import StationaryResource, MobileResource, DemandZone, get_incident_requirements
from resqnet.evaluation.reasoning import DispatchExplainer

st.set_page_config(layout="wide", page_title="ResQNet Dashboard")
st.title("ResQNet: Intelligent Disaster Dispatch")

if 'engine' not in st.session_state:
    st.session_state.engine = SimulationEngine()
    st.session_state.graph = None
    st.session_state.nodes = []
    st.session_state.severed_edges = []
    st.session_state.dispatches = []
    st.session_state.logs = []

st.sidebar.header("1. Environment Setup")
location = st.sidebar.text_input("Region", "Bandra, Mumbai, India")
if st.sidebar.button("Load Map"):
    with st.spinner("Downloading OSMnx data..."):
        bridge = RoutingBridge(location=location)
        st.session_state.graph = bridge.load_network()
        st.session_state.nodes = list(st.session_state.graph.nodes)
        st.session_state.engine = SimulationEngine()
        st.session_state.severed_edges = []
        st.session_state.dispatches = []
        st.session_state.logs = []
    st.success("Map loaded!")

if st.session_state.graph is not None:
    engine = st.session_state.engine
    st.sidebar.header("2. Disaster State")
    
    infra_type = st.sidebar.selectbox("Infrastructure Type", ['Hospital', 'Police Station', 'Fire Station', 'Blood Bank'])
    if st.sidebar.button("Add Infrastructure"):
        node = random.choice(st.session_state.nodes)
        engine.add_infrastructure(StationaryResource(
            id=str(uuid.uuid4())[:8], name=f"{infra_type} {node}", type=infra_type, 
            max_capacity=random.randint(10, 50), location=str(node)
        ))
        
    unit_type = st.sidebar.selectbox("Mobile Unit Type", ['Ambulance', 'Fire Truck', 'Police Car'])
    if st.sidebar.button("Add Mobile Unit"):
        node = random.choice(st.session_state.nodes)
        engine.add_mobile_unit(MobileResource(
            id=f"{unit_type[:3]}-{str(uuid.uuid4())[:4]}", type=unit_type, home_depot_id=str(node), current_location=str(node)
        ))

    inc_type = st.sidebar.selectbox("Incident Type", ['Fire', 'Car Crash', 'Earthquake'])
    if st.sidebar.button("Add Incident"):
        node = random.choice(st.session_state.nodes)
        engine.add_incident(DemandZone(
            id=f"INC-{str(uuid.uuid4())[:4]}", type=inc_type, location=str(node), 
            severity=random.randint(1, 5), requirements=get_incident_requirements(inc_type)
        ))

    if st.sidebar.button("Advance Time (Tick)"):
        engine.tick()
        st.session_state.dispatches = []
        st.session_state.logs.append(f"--- Time advanced to {engine.time} ---")
        st.sidebar.success("Time advanced!")

    st.sidebar.header("3. Command Center")
    if st.sidebar.button("Run AI Dispatch", type="primary"):
        idle_units = [u for u in engine.mobile_units.values() if u.status == 'idle']
        active_incs = [i for i in engine.incidents.values() if not i.resolved]
        
        if not idle_units or not active_incs:
            st.sidebar.warning("Need at least 1 idle unit and 1 active incident.")
        else:
            with st.spinner("Running Neural Networks & Solvers..."):
                d_graph = EvolvingDisasterGraph()
                for node in st.session_state.nodes:
                    d_graph.add_demand_zone(str(node), torch.tensor([0.0, random.random()]))
                    
                for u, v, k, data in st.session_state.graph.edges(keys=True, data=True):
                    d_graph.set_edge_status(str(u), str(v), True, data.get('length', 1.0))
                        
                pyg_data = d_graph.to_pyg_data()
                pyg_data.x = pyg_data.x.to(torch.float32)
                if pyg_data.edge_attr is not None:
                    pyg_data.edge_attr = pyg_data.edge_attr.to(torch.float32)
                    
                gcn = EvolvingGCNConv(in_channels=2, out_channels=16, heads=2)
                node_embeddings = gcn(pyg_data.x, pyg_data.edge_index, pyg_data.edge_attr)
                
                responder_indices = [d_graph.node_id_to_idx[u.current_location] for u in idle_units]
                responder_states = node_embeddings[responder_indices] 
                
                actor = TransformerActor(state_dim=16, num_depots=len(active_incs), hidden_dim=32)
                with torch.no_grad():
                    preferences_tensor = actor(responder_states.unsqueeze(0)) 
                preferences = preferences_tensor.squeeze(0).numpy()
                
                planner = LowLevelPlanner(num_depots=len(active_incs))
                assignments = planner.solve_mwm(preferences)
                
                st.session_state.dispatches = []
                explainer = DispatchExplainer()
                
                hospitals = [h for h in engine.infrastructure.values() if h.type == 'Hospital']
                hosp = hospitals[0] if hospitals else None
                
                for resp_idx, dem_idx in assignments:
                    unit = idle_units[resp_idx]
                    inc = active_incs[dem_idx]
                    engine.dispatch_unit(unit.id, inc.id)
                    st.session_state.dispatches.append((int(unit.current_location), int(inc.location)))
                    
                    dist = float(torch.norm(responder_states[resp_idx] - node_embeddings[d_graph.node_id_to_idx[inc.location]])) * 100
                    reason = explainer.explain(unit, inc, dist, hosp)
                    st.session_state.logs.append(f"[Time {engine.time}] {reason}")
                    
                st.sidebar.success(f"Dispatched {len(assignments)} units!")

    st.write(f"**Time**: {engine.time} | **Idle Units**: {len([u for u in engine.mobile_units.values() if u.status=='idle'])} | **Active Incidents**: {len([i for i in engine.incidents.values() if not i.resolved])}")
    
    renderer = MapRenderer(location_name=location)
    m = renderer.generate_map(
        graph=st.session_state.graph,
        engine=engine,
        severed_edges=st.session_state.severed_edges,
        dispatches=st.session_state.dispatches,
        output_file="dashboard_map.html"
    )
    if m:
        st_folium(m, width=1200, height=600, returned_objects=[])
        
    st.header("Intelligence Log")
    for log in reversed(st.session_state.logs[-10:]):
        st.write(log)
else:
    st.info("Load a map from the sidebar to begin.")
