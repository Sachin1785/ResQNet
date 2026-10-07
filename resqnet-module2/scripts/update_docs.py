import re
from pathlib import Path

def update_spec(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # C1: MARL architecture -> hierarchical three-tier control architecture
    content = content.replace("solves these problems using **Dynamic Graph Neural Networks (EvolveGCN-GAT)**, **Non-Linear Utility and Fairness Optimization**, and **Maximum Weight Bipartite Matching (MWM)**", 
                              "solves these problems using **Dynamic Graph Neural Networks (EvolveGCN-GAT)**, **Non-Linear Utility and Fairness Optimization**, and **Maximum Weight Bipartite Matching (MWM)** within a hierarchical three-tier control architecture. The neural component is trained by imitation of Hungarian matching.")
    content = content.replace("Hierarchical Three-Loop **MARL** architecture", "hierarchical three-tier control architecture")
    
    # C2 & C16: Diagrams
    content = re.sub(r'Outer Loop "SMDP \+ Demand Forecaster.*?feeding HLP', 'Outer tier by the real 60s grid-MCFP strategic loop', content)
    
    # C4: Agency
    content = content.replace("c_j \\in \\{0, 1, 2\\}$: Resource category label ($0 = \\text{Personnel}$, $1 = \\text{Vehicles}$, $2 = \\text{Equipment}$)", 
                              "c_j \\in \\{0, 1, 2\\}$: Resource category label ($0 = \\text{Law Enforcement}$, $1 = \\text{Fire Rescue}$, $2 = \\text{Medical}$)")
                              
    # C5: Step 1-4 margins
    content = re.sub(r'#+\s*Step 1.*?Step 4.*?Max\}\\right\)', 
                     lambda _: r"In the daemon these run as a per-cell marginal term with $D_{max} = 5.0$, $\Phi = 1.0$, $P_{survival} = 1$. The full-allocation utility/Gini/J evaluated in worked example/benchmark. \n\n" + 
                     r"The multi-round marginal synergy applies $1.0 / 1.10 / 1.0455$ factors.", 
                     content, flags=re.DOTALL)
                     
    # C6: Synergy description
    content = content.replace("super-additive", "marginal-ratio rounds")
    
    # C7: Rawlsian + Gini
    content = content.replace("ResQNet integrates Rawlsian distributive justice and the Gini coefficient.", 
                              "ResQNet integrates Rawlsian distributive justice and the Gini coefficient as marginal approximations in the daemon; true global J is evaluated in benchmarks.")
                              
    # C8: Node Features
    content = re.sub(r'd_in = 3 \(type, severity, demand ratio\)', 'd_in = 8 (severity, demand ratio, 5x type one-hot, is_online)', content)
    content = content.replace("Local casualty count, incident type, resource supplies, and elevation.", "Incident severity, remaining units needed, and canonical type.")
    
    # C9: EvolveGCN weights evolve
    content = content.replace("evolve the graph convolution weights $W_t", "evolve the graph convolution weights $W_t (sequence-trained, stateful inference, episode reset)")
    
    # C10: TransformerActor
    content = content.replace("### 4.2 Transformer Actor (`TransformerActor`)", "### 4.2 Pairwise Transformer Scorer (`PairwiseTransformerScorer`)")
    content = content.replace("Permutation-Invariant Transformer Encoder", "Permutation-Invariant Pairwise Scorer over unit and incident pairs")
    
    # C11: MLPCritic
    content = content.replace("### 4.3 Multi-Layer Perceptron Critic (`MLPCritic`)", "### 4.3 Multi-Layer Perceptron Critic (`MLPCritic`) 🧪 (unit-tested, not integrated; no RL loop exists)")
    
    # C12: MCFP
    content = content.replace("Demands: Total Regional Casualties", "Demands: Unassigned incidents per cell")
    content = content.replace("Supplies: Surplus Units in Depots", "Supplies: Idle responders per cell")
    
    # C14: OSMnx
    content = content.replace("The simulation and inner loop load real-world OpenStreetMap topologies", "The simulation loads real-world OpenStreetMap topologies (production uses haversine)")
    
    # C15: Duration
    content = content.replace("\\left\\lceil \\frac{\\text{PathLengthMeters}}{\\text{VelocityMPS} \\times \\text{SecondsPerTick}} \\right\\rceil", "\\left\\lceil \\frac{\\text{PathLengthMeters}}{\\text{VelocityMPS}} \\right\\rceil + 2")
    
    # C19: Latency table
    content = re.sub(r'\| Dimension \|.*?\| --- \|', "| Dimension | Capability |\n|---|---|\n| Latency | Measured in benchmarks |", content, flags=re.DOTALL)
    
    # Status Legend
    legend = "> [!NOTE]\n> **Status Legend**: ✅ Implemented & integrated · 🧪 Implemented, unit-tested, not integrated · 📐 Design/future\n\n"
    content = legend + content
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    update_spec(str(Path(__file__).resolve().parent.parent / "RESOURCE_ALLOCATOR_ENGINE_SPEC_FIXED.md"))
