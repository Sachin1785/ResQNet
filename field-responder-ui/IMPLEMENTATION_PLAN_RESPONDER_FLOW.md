# Implementation Plan: Responder UI Flow & Task Assignment

This document outlines the architecture and implementation steps for connecting the Field Responder UI with the backend to handle real-time task assignments and status updates.

## 1. Core Responder Journey

1.  **Dashboard**: Responder views active and new incidents.
2.  **Assignment**: Responder selects an incident and clicks **"Accept Mission"**.
3.  **Transit**: Responder is marked as `en-route` and navigates using the mission map.
4.  **Action**: Responder arrives `on-scene`, performs tasks, and updates the checklist.
5.  **Completion**: Responder completes the mission, marked as `available`, clearing the current task.

---

## 2. API & Data Requirements

### Backend Enhancements (`backend/routes/personnel.py`)
To handle self-assignment, we need a dedicated endpoint:
- **`POST /api/personnel/<id>/assign`**:
  - **Body**: `{ "incident_id": <id> }`
  - **Logic**: Set `assigned_incident_id`, set status to `responding`.
  - **Broadcast**: Emit `personnel_assigned` via SocketIO.

### Existing API Usage
- **`PUT /api/personnel/<id>/status`**: Update status (`en-route`, `on-scene`, `available`).
- **`PUT /api/personnel/<id>/location`**: Periodic GPS updates.
- **`PUT /api/incidents/<id>`**: Update incident status (`active` -> `responding` -> `resolved`).
- **`POST /api/incidents/<id>/timeline`**: Record major events (Arrival, Checklist completion).

---

## 3. Component-Level Logic

### `IncidentsView.tsx` (Discovery)
- **Feature**: Incident cards for "New" accidents should have an **"Accept"** button.
- **Dependency**: Check if the current responder is already assigned. If assigned, show "View My Mission" instead.
- **Action**: Call `personnelAPI.assign(responderId, incidentId)`.

### `MissionView.tsx` (Execution)
- **Landing**: If `assigned_incident_id` is null, redirect to `IncidentsView`.
- **States**: Use a local state `missionStatus` synced with backend `personnel.status`.
  - `responding` -> Show "Start Trip"
  - `en-route` -> Show "Arrive On Scene"
  - `on-scene` -> Show "Mark Complete" & Action Checklist

### `StatusBar.tsx` & `ActionButtons.tsx` (Status Control)
- Link buttons directly to `personnelAPI.updateStatus()`.
- **Logic**: 
  - `onStatusChange('en-route')` -> Triggers navigation update in `MapSection`.
  - `onStatusChange('complete')` -> Calls `available` status, which clears the task and returns user to home.

### `MapSection.tsx` (Navigation)
- Listen for `userLocation` and `activeIncident` props.
- If `en-route`, draw a route.
- If `on-scene`, switch to a "perimeter view" showing other nearby responders.

---

## 4. WebSocket Events Flow

1.  **Responder Connects**: Joins a room for their specific incident ID.
2.  **Assignment Broadast**: Command Center sees the responder's icon change from `gray` (available) to `blue` (responding).
3.  **Location Pulse**: `personnel_location_updated` keeps the dispatcher's map updated every 5 seconds.
4.  **Incident Updates**: If another responder joins, both see each other on the map via `personnel_location_updated`.

---

## 5. State Management (Frontend)

We should implement a `useResponder` hook or context that:
- Maintains the current `responderProfile` (ID: FR-104 etc).
- Tracks `activeIncident`.
- Handles the background location pulsing.

---

## 6. Implementation Checklist

- [ ] Add `assignToIncident` method to `lib/api.ts`.
- [ ] Implement `Accept Mission` button in `IncidentsView`.
- [ ] Connect `MissionView` buttons to backend status updates.
- [ ] Implement periodic `navigator.geolocation` pulse for responders.
- [ ] Add "Mission Completed" success screen/transition.
