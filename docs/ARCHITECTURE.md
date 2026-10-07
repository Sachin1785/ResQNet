# ResQNet System Architecture

This document describes the whole-project system architecture for ResQNet.

## 1. System Context

ResQNet is an integrated emergency response platform involving:
- **Actors**: Citizen, Dispatcher/Commissioner, Field Responder, IoT Device, Mesh Device.
- **External Services**: 
  - Twilio (SMS Gateway)
  - Nominatim (Geocoding)
  - Gemini / ElevenLabs (Voice Emergency Bot)
  - OSRM (Road Snapping & Routing)
  - CartoDB / OSMnx (Mapping & Visualization)

## 2. Container / Component Diagram

```mermaid
flowchart TB
    subgraph Channels["Incident Ingestion Channels"]
        SMS["SMS Gateway<br/>Twilio webhook + Nominatim geocoding"]
        MESH["Bluetooth SOS Mesh<br/>500 m duplicate merge"]
        IOT["IoT Sensors<br/>ESP32 -> Raspberry Pi -> /api/iot/stream"]
        VOICE["Voice Emergency Bot<br/>Gemini + ElevenLabs"]
        PWA["Field Responder PWA<br/>GPS pulse, reports, photos"]
    end

    subgraph Core["Core Platform (Flask + Socket.IO :5000)"]
        API["REST Blueprints /api/*"]
        WS["Socket.IO real-time hub"]
        DB[("SQLite WAL<br/>crisis_management.db<br/>iot_sensors.db")]
    end

    subgraph Workers["Background Services"]
        CEL["Celery Verification Worker<br/>filesystem broker"]
        DISP["AI Dispatch Daemon<br/>score matrix + Hungarian MWM + GNN"]
    end

    subgraph AIExt["External AI"]
        GEM["Gemini Flash Vision"]
    end

    subgraph Sim["Simulation Stack"]
        LIB["resqnet-module2<br/>SimulationEngine + models"]
        FAPI["FastAPI WebSocket :8000"]
        OSM["OSMnx road graph<br/>Bandra, Mumbai"]
    end

    subgraph UI["Command Dashboard (Next.js)"]
        LIVE["Live Operations Map<br/>deck.gl + OSRM road snapping"]
        SIMUI["Simulation Mode<br/>incidents, team, resources, stats"]
    end

    SMS --> API
    MESH --> API
    IOT --> API
    VOICE --> API
    PWA --> API
    PWA <--> WS
    API <--> DB
    API --> CEL
    CEL --> GEM
    CEL --> DB
    DISP <--> DB
    API <--> WS
    WS <--> LIVE
    LIB --> FAPI
    OSM --> LIB
    FAPI --> SIMUI
    LIVE --- SIMUI
```

## 3. Runtime Topology & Ports
- **Backend API & Real-time**: Flask + Socket.IO on port `5000`
- **Simulation Engine Bridge**: FastAPI on port `8000`
- **Frontend Dashboard**: Next.js
- **Background Workers**: Python daemon (`ai_dispatch_worker.py`) & Celery tasks

## 4. Incident-Ingestion Channels
- **SMS**: Via Twilio webhook, utilizing Nominatim for converting location data.
- **Bluetooth SOS Mesh**: Mesh networking with a 500-meter threshold for deduplication.
- **IoT Thresholds**: ESP32 and Raspberry Pi streaming via `/api/iot/stream`.
- **Voice Bot**: Uses Gemini and ElevenLabs for natural language emergency reporting.
- **Responder PWA**: Uploads field reports, photos, and live GPS pulses.

## 5. Data Model

- `incidents`: Main registry of reported emergencies.
- `personnel`: Responders, mapped to their active incident.
- `resources`: Vehicles and equipment, tracked by status and location.
- `incident_timeline`: Audit trail for every action (dispatch, arrival, completion).
- `attachments`: Media associated with reports.
- `communications`: Inter-agency comms.
- `alerts`: Broadcasts and notifications.
- `geofence_zones`: High-risk polygons.

## 6. Implementation Status Matrix
- **Implemented & Integrated**: AI dispatch with GNN & Hungarian MWM, Utility & Fairness scoring, Travel Physics, WebSocket synchronization, Incident Ingestion, AI Image verification.
- **Prototype / External**: Hardware IoT stream simulation, Twilio external dependencies.
