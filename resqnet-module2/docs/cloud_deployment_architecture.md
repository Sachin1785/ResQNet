# ResQNet Cloud & Distributed Deployment Architecture

To scale ResQNet from a localized prototype to a resilient, nation-scale emergency management system, the architecture must transition from a monolithic daemon into a horizontally scalable, fault-tolerant microservices mesh. During a major disaster, traffic spikes are massive, and system downtime translates to loss of life.

This document outlines the target distributed architecture for real-world cloud deployment.

---

## 1. Microservices Topology

The system will be decoupled into independent, containerized services using **Docker** and orchestrated via **Kubernetes (K8s)** (e.g., AWS EKS or Google GKE):

* **Ingestion API Gateway**: The front door for all civilian app traffic and IoT sensor data. Handles rate-limiting, auth, and initial payload validation.
* **AI Vision Verification Service**: A dedicated GPU-bound service that runs image classification and deepfake detection on incoming media.
* **Dispatch & Allocation Engine (The Brain)**: 
  * Divided into two distinct K8s deployments:
    * *Strategic Pods (Outer Loop)*: CPU-heavy pods running the MCFP Python solvers every 60 seconds.
    * *Tactical Pods (Inner Loop)*: Extremely fast, high-availability pods running the Hungarian MWM algorithm continuously.
* **Telemetry & Simulation Bridge**: A scalable fleet of FastAPI/Node.js WebSocket servers responsible for pushing live unit coordinates to the Deck.GL command dashboards.
* **SMS & Edge Gateway Service**: Connects to physical SMS aggregators (Twilio/AWS SNS) and LoRaWAN mesh gateways to sync offline responder ledgers.

---

## 2. Event-Driven Messaging (Apache Kafka / RabbitMQ)

In a distributed crisis system, services cannot rely on synchronous HTTP calls. If the AI Dispatch Engine is temporarily overwhelmed, incident reports must not be dropped.

We will introduce an **Event Stream Backbone** (using **Apache Kafka** for high-throughput or **RabbitMQ** for complex routing):

* **`incident.reported` Topic**: Written by the API Gateway. Read by the Vision Verification Service.
* **`incident.verified` Topic**: Written by the Vision Service. Read by the DB Writer and the Dispatch Engine.
* **`resource.telemetry` Topic**: Streams live GPS coordinates of firetrucks/ambulances at 1Hz. Consumed by the WebSocket Fleet and the Spatial Database.
* **`dispatch.orders` Topic**: Written by the Dispatch Engine. Consumed by the Mobile Push Notification service and SMS Gateway to alert responders.

*Benefit*: Complete decoupling. If the WebSocket servers crash, the Dispatch Engine continues allocating resources unimpeded.

---

## 3. Database Architecture & Sharding

Moving to PostgreSQL + PostGIS requires strategic scaling to handle real-time geospatial read/writes.

* **Primary Spatial Store (PostgreSQL + PostGIS)**:
  * **Master-Replica Setup**: One Master for heavy writes (new incidents, dispatch orders). Multiple Read-Replicas for the Command Dashboards to query active map states.
  * **Geospatial Sharding / Partitioning**: As the system scales nationally, the database will be partitioned geographically (e.g., `schema_north`, `schema_south`) or by utilizing distributed SQL like **CockroachDB** with spatial extensions to ensure local reads are physically close to the crisis zone.
* **State Caching (Redis Cluster)**:
  * Stores the ultra-fast, ephemeral state of the world (e.g., responder locations from the last 5 seconds) so the Hungarian Algorithm doesn't have to hit the Postgres disk on every 3-second cycle.
* **Time-Series / Analytics (TimescaleDB)**:
  * Historical disaster progression, telemetry paths, and neural network training data (for the EvolveGCN) are streamed here for offline model retraining.

---

## 4. AI Model Serving & Hardware Acceleration

Loading PyTorch weights directly inside the dispatch worker (current state) is inefficient for cloud scale.

* **Nvidia Triton Inference Server / Ray Serve**: The EvolveGCN graph neural networks and Transformer Actors will be hosted on dedicated inference servers.
* **gRPC Communication**: The Dispatch Engine will send the exact Graph State (tensors) via high-speed gRPC to Triton, which evaluates the neural network on dedicated A10G/T4 GPUs and returns the refined matrices.
* *Benefit*: Allows independent scaling. We can scale up the math-heavy Python dispatchers (CPU) independently from the neural network evaluators (GPU).

---

## 5. High Availability & Disaster Recovery (Multi-Region)

An emergency system cannot be hosted in a single AWS Availability Zone (AZ). If a hurricane takes out a data center, ResQNet must survive.

* **Active-Active Multi-Region Deployment**: ResQNet will be deployed across multiple geographic cloud regions (e.g., `us-east-1` and `us-west-2`).
* **Edge Nodes (Fog Computing)**: Command Centers will have physical "Edge Boxes" (e.g., AWS Outposts or local server racks). If the city loses connection to the global internet, the local Edge Box runs a lightweight, degraded version of the Dispatch Daemon and SMS Mesh locally until cloud connectivity is restored.

---

## 6. Target Deployment Workflow (CI/CD)

1. Developer pushes to GitHub `main`.
2. **GitHub Actions** runs the mathematical tests (`pytest` on MCFP/MWM).
3. Docker images are built and pushed to **AWS ECR / DockerHub**.
4. **Terraform** provisions any missing infrastructure (Kafka clusters, Postgres nodes).
5. **ArgoCD** detects the new images and performs a zero-downtime rolling update across the Kubernetes cluster, ensuring dispatch operations are never interrupted during an upgrade.
