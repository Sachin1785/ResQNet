# 🌐 Hackfusion: Next-Gen Crisis Management System

![Hackfusion Banner](./public/banner.png)

## 🎯 Overview
**Hackfusion** is a high-performance, real-time crisis management ecosystem designed to bridge the gap between emergency command centers and field responders. By integrating live data, geospatial intelligence, and a resilient **Dual-Layer Communication Hub (SMS & Bluetooth Mesh)**, Hackfusion ensures that help is always coordinated, even when the internet or cellular data fails.

---

## 🚀 The Four Pillars

### 1. 🏢 Crisis Command Dashboard
The brain of the operation. A premium, Next.js-powered command center for commissioners and dispatchers.
- **Live Global Map**: Real-time visualization of all incidents, personnel, and resources using Leaflet and WebSockets.
- **Personnel Tracking & Live Follow**: Track responder movement with a "Live Follow" camera mode that auto-pans to their current GPS.
- **Resource Management**: Dynamic dispatching of ambulances, fire trucks, and equipment with a geospatial location picker.
- **Evidence Gallery**: Centralized hub for viewing field uploads, verified by AI to ensure authenticity.
- **Advanced Analytics**: Real-time charts (Recharts) showing response times, resource utilization, and incident trends.

### 2. 📱 Field Responder PWA
A mobile-first, native-feeling Progressive Web App for responders on the ground.
- **Mission Center**: focused "active mission" view with live routing (Leaflet Routing Machine) and ETA.
- **Real-time GPS Pulse**: Automatically sends location updates to the command center every 10 seconds via Socket.IO.
- **Incident Reporting**: Submit high-fidelity reports with geolocation, photos, and high-priority severity tags.
- **Integrated Comms**: Context-aware chat system linked directly to assigned incidents.

### 3. 🕸️ SOS Mesh Network
The "off-grid" life-saver. A resilient communication layer for disaster zones without traditional infrastructure.
- **Bluetooth Mesh Integration**: Connects with Android-based mesh hardware to relay SOS alerts.
- **Intelligent Deduplication**: Automatically merges multiple SOS signals within a 500m radius into a single incident to prevent alert fatigue.
- **Merged Report Counting**: Tracks the number of unique reports for the same incident, automatically escalating severity if multiple reports are received.

### 4. 📟 SMS Reporting Gateway
High-accessibility emergency reporting using Twilio for citizens with zero data or legacy devices.
- **Natural Language Parsing**: Intelligent keyword-based NLP extracts incident types (Fire, Accident, Medical) and severity from raw text.
- **OpenStreetMap Geocoding**: Automatically converts text-based locations into precise map coordinates using the Nominatim API.
- **Immediate Feedback**: Instant automated confirmation sent back to the reporter with an incident reference ID.

---

## ✨ Features Deep-Dive

### 🤖 AI-Powered Verification (Gemini Flash)
The system features a cutting-edge AI verification layer using **Google Gemini Flash 2.0**:
- **Photo Authenticity**: Automatically analyzes field-uploaded photos to ensure they match the reported incident.
- **Fraud Detection**: Identifies pranks, stock photos, or unrelated images.
- **Severity Estimation**: AI provides an independent estimate of incident severity based on visual evidence.
- **Confidence Scoring**: Each verification comes with a confidence percentage and a brief analysis note.

### 📡 Real-Time Intelligence & WebSockets
- **Socket.IO Integration**: Zero-latency updates for responder locations, incident status changes, and new reports.
- **Bi-Directional Communication**: Real-time chat between the Command Center and Responders.
- **Room-Based Events**: Communications are partitioned by incident ID for secure, focused coordination.

### 📍 Geospatial & Geofencing
- **Proximity Alerts**: Notifications when personnel are within range of a high-priority incident.
- **Dynamic Routing**: Real-time pathfinding from responder to incident with terrain-aware distance calculations.
- **Location Pulse**: High-frequency GPS updates (10s intervals) with "WAL-enabled" database persistence for performance.

### 📊 Analytics & Reporting
- **Efficiency Metrics**: Average response times (ART) and resource bandwidth tracking.
- **Incident Timelines**: Immutable, detailed log of every action taken from report to resolution.
- **Heatmaps & Trends**: Visual representation of "hot zones" for better resource pre-positioning.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.11+, Flask, Flask-SocketIO, SQLite (WAL mode), Gevent |
| **AI/ML** | Google GenAI (Gemini Flash 1.5/2.0), PIL |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| **State/UI** | Radix UI, Lucide Icons, Shadcn/UI, Sonner (Toasts) |
| **Maps** | Leaflet.js, Leaflet Routing Machine, OpenStreetMap/Nominatim |
| **Mobile** | PWA (Progressive Web App), Service Workers, Geolocation API |
| **Messaging** | Twilio SMS API, Bluetooth Mesh SOS Protocol |

---

## 📂 Project Structure

```text
Hackfusion/
├── backend/                       # Flask API & WebSocket Server
│   ├── routes/                    # API Endpoints (SMS, Mesh, Incidents, Auth, AI)
│   ├── utils/                     # Geocoding, AI Handling, Geo-logic, Notifications
│   ├── database.py                # SQLite Schema & Multi-threaded WAL Initialization
│   └── app.py                     # Main Entry Point with Socket.IO integration
├── crisis-command-dashboard/      # Next.js Command Center (Admin Interface)
│   ├── components/                # Map, Sidebar, Analytics, Comms panels
│   └── lib/                       # API Wrappers & Custom Hooks
├── field-responder-ui/            # Next.js PWA (Responder Interface)
│   ├── components/                # Mission View, SOS Button, Reports
│   └── public/                    # PWA Manifest & Service Workers
└── scripts/                       # Maintenance & Deduplication Verification tools
```

---

## ⚙️ Quick Start

### 1️⃣ Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # 或 venv\Scripts\activate
pip install -r requirements.txt
pip install google-genai  # If missing from requirements
python database.py        # Initialize & seed DB (Default pwd: password123)
python app.py             # Server runs on http://localhost:5000
```
*Note: Ensure `GOOGLE_API_KEY` is set in `.env` for AI features.*

### 2️⃣ Command Dashboard Setup
```bash
cd crisis-command-dashboard
npm install
npm run dev               # Dashboard runs on http://localhost:3000
```

### 3️⃣ Responder UI Setup
```bash
cd field-responder-ui
npm install
npm run dev               # Responder PWA runs on http://localhost:3001
```

---

## 🔐 Security & Reliability
- **Role-Based Access Control (RBAC)**: Secure separation between Dispatchers (Command) and Responders (Field).
- **Atomic Operations**: Parameterized SQL queries and BEGIN IMMEDIATE transactions to prevent DB locks during high-concurrency (AI verification).
- **Graceful Degradation**: System automatically switches to Bluetooth Mesh protocols when cellular/internet API is unreachable.
- **JWT Authentication**: Secured endpoints for all critical operations.

---

*Built for Hackfusion 2026. Empowering responders, saving lives.*
