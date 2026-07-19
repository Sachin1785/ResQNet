# ResQNet 🌍

**ResQNet** is a comprehensive, cloud-native crisis management and disaster response platform. It bridges the gap between raw IoT sensor data in the field, mobile-equipped first responders, and emergency command centers to enable rapid, data-driven responses to natural disasters and industrial emergencies.

---

## 🏗️ Project Architecture

ResQNet is built as a highly scalable **Modular Monolith** designed for seamless deployment to AWS, comprising multiple specialized clients connected to a central intelligence hub.

*   **[`/backend`](./backend)**: The core Python engine (Flask/Socket.IO) handling IoT telemetry ingestion via Amazon Kinesis, automated alert processing, and database management.
*   **[`/crisis-command-dashboard`](./crisis-command-dashboard)**: A desktop-optimized Next.js web application providing headquarters with a real-time live map, telemetry analytics, and incident dispatching capabilities.
*   **[`/field-responder-ui`](./field-responder-ui)**: A mobile-first Next.js Progressive Web App (PWA) allowing on-the-ground responders to receive tasks, track their GPS locations, and operate seamlessly even when cellular networks fail (Offline-First).
*   **[`/terraform`](./terraform)**: Infrastructure-as-Code to automatically provision the entire system on AWS (ECS Fargate, Aurora PostgreSQL Serverless v2, ElastiCache Redis, S3).
*   **[`/scripts`](./scripts)**: Simulation tools to generate realistic IoT data (gas leaks, seismic activity, etc.) and test the system locally.
*   **[`/java backend`](./java%20backend)**: An alternative/legacy Spring Boot backend implementation.

---

## 📚 Documentation Directory

To deeply understand the system, please refer to our comprehensive documentation files:

1.  **[Project Documentation (Start Here)](./PROJECT_DOCUMENTATION.md)**: A complete breakdown of every microservice, technology choice, and how to run the system locally.
2.  **[AWS Architecture Overview](./AWS_ARCHITECTURE.md)**: Visual diagrams and explanations of how ResQNet scales infinitely in the cloud during a crisis.
3.  **[Data Flow Guide](./DATA_FLOW.md)**: Detailed explanations of how data travels from an IoT sensor to the database and up to the web dashboards in real-time.

---

## 🚀 Quick Start (Local Setup)

If you don't have AWS configured, you can run the entire system locally using SQLite.

### 1. Start the API Server
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2. Start the Command Center Dashboard
```bash
cd crisis-command-dashboard
pnpm install
pnpm run dev
```

### 3. Start the Responder App
```bash
cd field-responder-ui
pnpm install
pnpm run dev
```

### 4. Simulate an Emergency
In a new terminal window, run the IoT simulator to trigger a gas leak alert:
```bash
cd scripts
python simulate_iot_v2.py
```

---

## ☁️ Deploying to AWS

ResQNet includes a custom deployment script to automatically provision the entire cloud architecture and tear it down to **$0 cost** when finished.

1. Ensure you have [Terraform](https://developer.hashicorp.com/terraform/downloads) installed.
2. Create a `.env` file in the root directory containing your AWS credentials:
   ```env
   AWS_ACCESS_KEY_ID="your_access_key"
   AWS_SECRET_ACCESS_KEY="your_secret_key"
   ```
3. Run the deployment tool:
   ```bash
   python manage_infra.py deploy
   ```
4. To wipe all resources and stop billing:
   ```bash
   python manage_infra.py destroy
   ```
