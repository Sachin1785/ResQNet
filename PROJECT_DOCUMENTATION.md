# ResQNet - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Component Breakdown](#component-breakdown)
   - [Backend (Python)](#backend-python)
   - [Crisis Command Dashboard (Next.js)](#crisis-command-dashboard-nextjs)
   - [Field Responder UI (Next.js PWA)](#field-responder-ui-nextjs-pwa)
   - [Java Backend (Alternative/Legacy)](#java-backend-alternativelegacy)
   - [IoT Simulation & Scripts](#iot-simulation--scripts)
   - [Infrastructure (Terraform)](#infrastructure-terraform)
4. [Data Flow & Communication](#data-flow--communication)
5. [Cloud Deployment Strategy](#cloud-deployment-strategy)
6. [Getting Started & Local Development](#getting-started--local-development)

---

## 1. Project Overview
**ResQNet** is an advanced, real-time crisis management and disaster response system. It provides end-to-end capabilities starting from raw IoT sensor data ingestion in the field, up to a high-level command center dashboard for emergency coordinators, and an offline-capable mobile web app for on-the-ground responders.

The goal of ResQNet is to enable rapid response to natural disasters, industrial hazards, and medical emergencies by providing real-time situational awareness, autonomous alerts, and seamless communication between field personnel and headquarters.

## 2. System Architecture
ResQNet follows a **Modular Monolith / Microservices-ready Architecture** designed to scale massively in the cloud while remaining easy to run locally for development.

### Core Technologies:
*   **Web Frontend (Command Center):** Next.js 14 (React), Tailwind CSS, Socket.IO client, Mapbox/Leaflet.
*   **Mobile Frontend (Responders):** Next.js 14 configured as a Progressive Web App (PWA) with offline-first capabilities using Service Workers and IndexedDB.
*   **Primary Backend:** Python (Flask/Gunicorn), Socket.IO server, Boto3 (AWS SDK).
*   **Data Processing Queue:** Amazon Kinesis Data Streams (for high-throughput IoT telemetry).
*   **Database:** PostgreSQL (AWS Aurora Serverless v2) for production; SQLite for local dev.
*   **Real-time Pub/Sub:** Redis (ElastiCache) for syncing Socket.IO events across multiple backend instances.
*   **Infrastructure:** AWS ECS Fargate, Application Load Balancers, S3 (for media storage), provisioned entirely via Terraform.

## 3. Component Breakdown

### Backend (Python)
Located in `/backend`. This is the core API and data ingestion engine.
*   **API Routes (`/routes`):** Exposes RESTful endpoints for user authentication, incident reporting, media uploads, and personnel tracking.
*   **IoT Ingestion (`iot.py` & `kinesis_client.py`):** Receives rapid-fire telemetry from IoT gateways and pushes it directly into an Amazon Kinesis stream, ensuring the API responds in milliseconds.
*   **Background Workers (`kinesis_consumer.py`):** A daemon process that continuously polls the Kinesis stream, performs threshold checks (e.g., detecting fire from gas/temp spikes), bulk-inserts records into the database, and triggers WebSocket alerts.
*   **Real-Time Engine:** Uses Flask-SocketIO attached to a Redis message queue to push live map updates and alerts to all connected clients instantly.

### Crisis Command Dashboard (Next.js)
Located in `/crisis-command-dashboard`. A desktop-first web application for headquarters.
*   **Live Map View:** Displays the real-time locations of all field responders and active IoT sensors.
*   **Incident Management:** Allows coordinators to view auto-generated incidents (from IoT alerts) or manual reports, assign responders, and track resolution timelines.
*   **Analytics & Telemetry:** Visualizes live charts of gas levels, seismic activity, and water levels from deployed sensors.

### Field Responder UI (Next.js PWA)
Located in `/field-responder-ui`. A mobile-first Progressive Web App for first responders.
*   **Offline-First:** Uses service workers to cache the application shell and IndexedDB to store incident data when cellular networks fail during disasters.
*   **GPS Tracking:** Continuously streams the responder's geolocation back to headquarters (when online).
*   **Task Management:** Responders can view assigned incidents, update their status (e.g., "En Route", "On Scene"), and upload photos/audio from the disaster site.

### Java Backend (Alternative/Legacy)
Located in `/java backend`. A Spring Boot application built with Gradle. This serves as an alternative backend implementation or a legacy core that is being migrated to the Python microservices approach. 

### IoT Simulation & Scripts
Located in `/scripts`. 
*   `simulate_iot_v2.py`: Generates realistic, randomized telemetry data (gas, temperature, acceleration) to simulate field sensors and tests the Kinesis ingestion pipeline.
*   `voice_emergency_bot.py`: An automated script simulating voice-to-text emergency dispatches.

### Infrastructure (Terraform)
Located in `/terraform`. Contains Infrastructure-as-Code (IaC) to deploy ResQNet to AWS.
*   **VPC & Networking:** Creates a secure VPC with public/private subnets and a NAT Gateway.
*   **ECS Fargate:** Deploys the Python backend as auto-scaling containers (both the API web server and the background Kinesis workers).
*   **Aurora Serverless v2:** A highly scalable PostgreSQL cluster.
*   **Redis & Kinesis:** Managed services for pub/sub and event streaming.
*   **`manage_infra.py`:** A custom Python CLI tool at the root level to streamline `terraform apply` (deploy) and `terraform destroy` (teardown to $0 cost).

## 4. Data Flow & Communication
For a detailed diagram of how data moves through the system, please refer to the `DATA_FLOW.md` and `AWS_ARCHITECTURE.md` files in the root directory. 

**Summary of IoT Flow:**
1. Hardware sensor -> Python API (`/api/iot/data`)
2. Python API -> Amazon Kinesis Stream (Message Queue)
3. Kinesis Consumer Worker -> Reads stream, detects anomalies, saves to Database
4. Consumer Worker -> Publishes Alert to Redis
5. Redis -> Python Socket.IO Server -> Broadcasts to Next.js Dashboards

## 5. Cloud Deployment Strategy
ResQNet is designed to be cost-effective during peacetime but infinitely scalable during a crisis.
*   **Compute:** AWS ECS Fargate allows the API to scale from 1 container to hundreds in minutes when traffic spikes.
*   **Database:** Aurora Serverless v2 scales database compute capacity seamlessly without downtime.
*   **Automation:** The included `manage_infra.py` script automatically parses a `.env` file for AWS credentials and orchestrates Terraform, allowing instant spinning up or tearing down of the entire environment.

## 6. Getting Started & Local Development

### Prerequisites
*   Python 3.10+
*   Node.js 18+ & PNPM
*   Terraform (for cloud deployment)
*   AWS Account (optional, for cloud features)

### Running Locally (Without AWS)
The system is configured to fallback to SQLite and local processing if AWS credentials/Kinesis are not present.

1. **Start the Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
2. **Start the Dashboards:**
   ```bash
   # Terminal 2 (Command Center)
   cd crisis-command-dashboard
   pnpm install && pnpm run dev

   # Terminal 3 (Field Responder UI)
   cd field-responder-ui
   pnpm install && pnpm run dev
   ```
3. **Simulate Data:**
   ```bash
   cd scripts
   python simulate_iot_v2.py
   ```

### Deploying to AWS
1. Create a `.env` file in the root directory with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
2. Run `python manage_infra.py deploy`.
3. To stop billing, run `python manage_infra.py destroy`.
