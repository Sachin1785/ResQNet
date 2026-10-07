# ResQNet: Next-Generation AI-Driven Crisis Command & Resource Allocation Platform

ResQNet is an enterprise-grade emergency management ecosystem designed to orchestrate mass-casualty events, natural disasters, and complex urban crises. By combining **Multi-Agent Reinforcement Learning (MARL)**, **Real-Time Graph Neural Networks**, and **Spatial PostGIS Data**, ResQNet eliminates dispatch inefficiencies, validates emergency reports using AI vision, and guarantees equitable resource distribution across vulnerable demographics.

---

## 🌟 Core Features & Subsystems

### 1. 🧠 3-Tier Hierarchical AI Resource Allocator
The brain of ResQNet is a persistent background daemon that abandons static dispatch heuristics in favor of a dynamic, predictive allocation engine.
* **Strategic Outer Loop (Macro)**: Runs on a slower cadence (e.g., every 60s), clustering the city into discrete grids. It solves a **Minimum-Cost Flow Problem (MCFP)** using Linear Programming to prevent localized starvation and ensure regional quotas are maintained across the city.
* **Tactical Middle Loop**: A **MARL Controller** translates macro quotas into micro-penalties and bonuses, guiding the real-time operational solvers to respect city-wide strategic bounds.
* **Operational Inner Loop (Micro)**: Polling every 3 seconds, it uses **Maximum Weight Bipartite Matching (Hungarian Algorithm)** combined with **EvolveGCN-GAT (Graph Attention Networks)** to execute O(V³) polynomial-time 1-to-1 dispatches.
* **Ethical Multi-Objective Scalarization**: Integrates Rawlsian distributive justice and Gini coefficients to guarantee peripheral or low-income districts aren't starved of emergency assets.

### 2. 👁️ AI Vision Verification Engine
To combat panic-induced duplicate reporting and malicious deepfakes during a crisis:
* **Automated Triage**: Incoming incident reports (including citizen-uploaded photos) are routed through our Vision Engine.
* **Semantic Analysis**: The engine categorizes the exact disaster type (e.g., "Class B Chemical Fire" vs. "Structural Collapse") and estimates severity.
* **Duplicate Detection**: Identifies visually identical or overlapping reports from the same geographic coordinate to consolidate incident tickets automatically.

### 3. 📡 Offline-First SMS Mesh Network
When critical cellular infrastructure collapses (e.g., during earthquakes or hurricanes):
* **Decentralized Mesh**: Field responders communicate via an ad-hoc SMS and local-mesh network architecture.
* **Payload Compression**: Encodes critical telemetry (GPS coordinates, triage status, resource requests) into dense, low-bandwidth SMS payloads.
* **Automated Sync**: When connectivity is restored, the mesh locally synchronizes its ledger with the central command database.

### 4. 🗺️ Real-Time Deck.GL Command Dashboard & Sockets
A high-performance React-based visualizer designed for Crisis Commanders:
* **FastAPI WebSockets**: Streams live telemetry at 1.0s intervals directly from the AI Dispatch Engine (`engine_bridge.py`).
* **Deck.GL & OSMnx Rendering**: Renders the physical street grid using OpenStreetMap topologies. Shows active responders physically moving along Dijkstra-calculated shortest paths in real-time.
* **Live Heatmaps**: Projects regional demand stress, hospital load, and AI-confidence metrics as dynamic spatial overlays.

### 5. 🗄️ PostgreSQL + PostGIS Spatial Database
* **Transitioning from SQLite WAL**: While prototyped on SQLite with Write-Ahead Logging for concurrency, the production architecture relies on **PostgreSQL** augmented with the **PostGIS extension**.
* **Spatial Querying**: Enables sub-millisecond bounding-box queries, precise Haversine distance calculations, and geographic intersection tests directly at the database layer.
* **ACID Transactions**: Guarantees atomic dispatch assignments to prevent double-booking a single ambulance to multiple simultaneous incidents.

---

## 🏗️ System Workflow & Data Lifecycle

1. **Incident Ingestion**: A civilian reports an emergency via the mobile app, attaching an image and GPS coordinates.
2. **AI Verification**: The Vision Engine scans the image, verifies it, extracts severity, and inserts the verified incident into the PostgreSQL database.
3. **Strategic Quota Assessment**: The AI Dispatch Worker's background MCFP thread detects a surge in demand in Sector 4 and updates the inter-region flow quotas.
4. **Tactical Matching**: The Hungarian MWM Inner Loop calculates optimal pairings between available Field Responders and the new incident, heavily weighting the geographic flow quotas and vehicle synergy (e.g., pairing a Fire Engine with an Ambulance).
5. **Dispatch & Routing**: The assignment is committed to PostgreSQL. The routing engine calculates the precise OSMnx street path.
6. **Command Visualization**: The FastAPI WebSocket broadcasts the dispatch trajectory to the Deck.GL frontend, where the Commander watches the units deploy in real-time.
7. **Field Execution**: Responders receive the dispatch via the PWA (or SMS Mesh if offline), execute the rescue, and mark the incident resolved.

---

## 📁 Repository Structure

```text
/
├── backend/                       # Python AI Dispatch Daemon & Logic
│   ├── ai_dispatch_worker.py      # The 3-Tier Allocation Engine Daemon
│   └── database/                  # PostgreSQL / DB connection logic
├── resqnet-module2/               # Pure Mathematical AI Models & Solvers
│   ├── resqnet/models/            # EvolveGCN, Transformer Actor, MLP Critic
│   ├── resqnet/middle_loop/       # MCFP (hlp_agent) and MARL Controllers
│   └── resqnet/core/              # Rawlsian Fairness & Utility formulas
├── crisis-command-dashboard/      # React + Deck.GL Commander GUI
├── field-responder-ui/            # React PWA for first responders
├── resqnet-visualizer/            # FastAPI WebSocket telemetry bridge
└── terraform/                     # Infrastructure as Code (AWS/GCP deployment)
```

---

## 🚀 Getting Started

*(Note: Assumes you have Python 3.10+, Node.js, and a running PostgreSQL instance with PostGIS enabled).*

### 1. Database Setup
```bash
# Create the PostGIS database
createdb resqnet_db
psql -d resqnet_db -c "CREATE EXTENSION postgis;"
```

### 2. Start the AI Dispatch Daemon
```bash
cd backend
uv sync
uv run python ai_dispatch_worker.py
```

### 3. Start the Simulation / WebSocket Bridge
```bash
cd resqnet-visualizer/backend
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. Launch the Command Dashboard
```bash
cd crisis-command-dashboard
npm install
npm run start
```

---

## 📄 License & Intellectual Property
The Mathematical Models, Hierarchical MARL Architecture, and Vision Verification integrations within this repository are proprietary. Copyright pending.
