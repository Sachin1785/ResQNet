/**
 * Simulation Dashboard Adapter
 * Transforms raw simulation TickData into rich, unified models for the entire Command Center:
 * - Left Sidebar (Incidents with requirements & locations)
 * - Top Stats Bar (Active, Personnel, Fleet, Critical counts)
 * - Team Tab (30 Named Responders with realistic identities & live status)
 * - Resources Tab (Vehicles & Infrastructure Hubs with capacities)
 * - Comms Tab (AI Tactical Dispatch Radio Feed & Synergy Logs)
 */

import { TickData } from "./simulation";

// Static realistic responder identities mapped to mobile unit IDs
const RESPONDER_ROSTER = [
  // Ambulances (Amb-0 to Amb-9) -> Paramedics / Doctors / EMTs
  { id: "Amb-0", name: "Dr. Aarav Sharma", role: "Medical Director / Paramedic", type: "Ambulance", callsign: "MEDIC-101", phone: "+91 98201 45120" },
  { id: "Amb-1", name: "Paramedic Priya Nair", role: "Critical Care Paramedic", type: "Ambulance", callsign: "MEDIC-102", phone: "+91 98202 33145" },
  { id: "Amb-2", name: "EMT Rohan Deshmukh", role: "Emergency EMT", type: "Ambulance", callsign: "MEDIC-103", phone: "+91 98203 77890" },
  { id: "Amb-3", name: "Dr. Ananya Desai", role: "Trauma Surgeon", type: "Ambulance", callsign: "MEDIC-104", phone: "+91 98204 11234" },
  { id: "Amb-4", name: "Paramedic Vikram Patil", role: "Advanced Life Support EMT", type: "Ambulance", callsign: "MEDIC-105", phone: "+91 98205 99881" },
  { id: "Amb-5", name: "EMT Maya Kulkarni", role: "Paramedic Responder", type: "Ambulance", callsign: "MEDIC-106", phone: "+91 98206 55432" },
  { id: "Amb-6", name: "Dr. Siddharth Sen", role: "Emergency Physician", type: "Ambulance", callsign: "MEDIC-107", phone: "+91 98207 22199" },
  { id: "Amb-7", name: "EMT Neha Joshi", role: "Field Medic", type: "Ambulance", callsign: "MEDIC-108", phone: "+91 98208 88712" },
  { id: "Amb-8", name: "Paramedic Kabir Mehta", role: "Rescue Specialist", type: "Ambulance", callsign: "MEDIC-109", phone: "+91 98209 44321" },
  { id: "Amb-9", name: "Dr. Tanvi Rane", role: "Triage Coordinator", type: "Ambulance", callsign: "MEDIC-110", phone: "+91 98210 66789" },

  // Fire Trucks (Fir-0 to Fir-9) -> Firefighters / Hazmat / Rescue Chiefs
  { id: "Fir-0", name: "Capt. Rajesh Sawant", role: "Fire Captain", type: "Fire Truck", callsign: "FIRE-201", phone: "+91 97101 12345" },
  { id: "Fir-1", name: "Lt. Amit Shinde", role: "Hazmat Specialist", type: "Fire Truck", callsign: "FIRE-202", phone: "+91 97102 54321" },
  { id: "Fir-2", name: "Firefighter Varun Kapoor", role: "Ladder Specialist", type: "Fire Truck", callsign: "FIRE-203", phone: "+91 97103 87654" },
  { id: "Fir-3", name: "Rescue Chief Pooja Hegde", role: "Urban Search & Rescue Lead", type: "Fire Truck", callsign: "FIRE-204", phone: "+91 97104 23456" },
  { id: "Fir-4", name: "Firefighter Karan Merchant", role: "Heavy Rescue Operator", type: "Fire Truck", callsign: "FIRE-205", phone: "+91 97105 78901" },
  { id: "Fir-5", name: "Lt. Sneha Gokhale", role: "Tactical Extrication Lead", type: "Fire Truck", callsign: "FIRE-206", phone: "+91 97106 34567" },
  { id: "Fir-6", name: "Firefighter Aditya Roy", role: "Pumper Operator", type: "Fire Truck", callsign: "FIRE-207", phone: "+91 97107 90123" },
  { id: "Fir-7", name: "Chief Manoj Tiwari", role: "Incident Command Safety Officer", type: "Fire Truck", callsign: "FIRE-208", phone: "+91 97108 45678" },
  { id: "Fir-8", name: "Firefighter Ritu Bansal", role: "Structural Fire Specialist", type: "Fire Truck", callsign: "FIRE-209", phone: "+91 97109 01234" },
  { id: "Fir-9", name: "Lt. Sameer Shaikh", role: "Thermal Imaging & Drone Pilot", type: "Fire Truck", callsign: "FIRE-210", phone: "+91 97110 56789" },

  // Police Cars (Pol-0 to Pol-9) -> Officers / Inspectors / Tactical Units
  { id: "Pol-0", name: "Insp. Devendra Chauhan", role: "Police Inspector", type: "Police Car", callsign: "PATROL-301", phone: "+91 96101 23456" },
  { id: "Pol-1", name: "Officer Rakesh More", role: "Traffic & Evacuation Lead", type: "Police Car", callsign: "PATROL-302", phone: "+91 96102 67890" },
  { id: "Pol-2", name: "Officer Meera Iyer", role: "Perimeter Security Officer", type: "Police Car", callsign: "PATROL-303", phone: "+91 96103 01234" },
  { id: "Pol-3", name: "Sgt. Arjun Malhotra", role: "Tactical Response Sergeant", type: "Police Car", callsign: "PATROL-304", phone: "+91 96104 45678" },
  { id: "Pol-4", name: "Officer Diya Sengupta", role: "Crowd Control Specialist", type: "Police Car", callsign: "PATROL-305", phone: "+91 96105 89012" },
  { id: "Pol-5", name: "Insp. Farhan Qureshi", role: "Rapid Intervention Officer", type: "Police Car", callsign: "PATROL-306", phone: "+91 96106 23456" },
  { id: "Pol-6", name: "Officer Shalini Rao", role: "Emergency Dispatch Liaison", type: "Police Car", callsign: "PATROL-307", phone: "+91 96107 67890" },
  { id: "Pol-7", name: "Sgt. Yashwant Mane", role: "Highway Patrol Sergeant", type: "Police Car", callsign: "PATROL-308", phone: "+91 96108 01234" },
  { id: "Pol-8", name: "Officer Bhavna Dave", role: "Crisis Negotiator & Patrol", type: "Police Car", callsign: "PATROL-309", phone: "+91 96109 45678" },
  { id: "Pol-9", name: "Officer Kunal Bhasin", role: "Emergency Escort Lead", type: "Police Car", callsign: "PATROL-310", phone: "+91 96110 89012" },
];

const SEVERITY_MAP: Record<number, "critical" | "high" | "medium" | "low"> = {
  5: "critical",
  4: "critical",
  3: "high",
  2: "medium",
  1: "low",
};

export interface SimDashboardData {
  incidents: any[];
  personnel: any[];
  resources: any[];
  communications: any[];
  stats: {
    activeIncidents: number;
    activePersonnel: number;
    totalEquipment: number;
    criticalIncidents: number;
    hospitalLoad: number;
    fireStationLoad: number;
    policeStationLoad: number;
  };
}

export function deriveSimDashboardData(
  latestTickData: TickData | null,
  currentTick: number,
  allTicksHistory: TickData[] = []
): SimDashboardData {
  if (!latestTickData) {
    return {
      incidents: [],
      personnel: RESPONDER_ROSTER.map((r, idx) => ({
        id: idx + 1,
        simUnitId: r.id,
        name: r.name,
        role: r.role,
        status: "available",
        location: { lat: 19.06 + (idx % 5) * 0.005, lng: 72.83 + (Math.floor(idx / 5)) * 0.005 },
        assignedIncident: null,
        phone: r.phone,
        callsign: r.callsign,
      })),
      resources: [],
      communications: [],
      stats: {
        activeIncidents: 0,
        activePersonnel: 0,
        totalEquipment: 30,
        criticalIncidents: 0,
        hospitalLoad: 0,
        fireStationLoad: 0,
        policeStationLoad: 0,
      },
    };
  }

  // 1. Transform Active Incidents
  const activeDispatches = latestTickData.dispatches || [];
  
  const incidents = (latestTickData.active_incidents || []).map((inc, index) => {
    const sevNum = inc.severity || 3;
    const sevLabel = SEVERITY_MAP[sevNum] || "medium";

    // Find all units assigned to this incident in recent dispatches
    const assignedUnits = activeDispatches
      .filter((d) => d.incident_id === inc.id)
      .map((d) => {
        const found = RESPONDER_ROSTER.find((r) => r.id === d.unit_id);
        return found ? `${found.name} (${d.unit_type})` : d.unit_id;
      });

    return {
      id: inc.id,
      title: `${inc.type} Emergency - Sector ${inc.id.replace("INC-", "").toUpperCase()}`,
      description: `AI Disaster Engine detected ${inc.type.toLowerCase()} event with severity grade ${sevNum}/5. Immediate multi-unit response dispatched.`,
      type: inc.type.toLowerCase().includes("fire") ? "fire" : inc.type.toLowerCase().includes("crash") ? "accident" : "natural_disaster",
      severity: sevLabel,
      status: "active",
      lat: inc.location.lat,
      lng: inc.location.lon,
      location: { lat: inc.location.lat, lng: inc.location.lon },
      time: `Tick ${latestTickData.tick}`,
      reportSource: "AI Simulation Engine",
      reportCount: 1,
      responders: assignedUnits,
      requirements: inc.requirements || {},
      remaining_requirements: inc.remaining_requirements || {},
      arrivedUnits: assignedUnits.length,
      totalUnits: Object.values(inc.requirements || {}).reduce((a: number, b: number) => a + b, 0) || 1,
      is_verified: 1,
      verification_score: 98,
      ai_analysis: `PyTorch EvolvingGCN calculated optimal triage. Requirements: ${JSON.stringify(inc.requirements || {})}`,
    };
  });

  // 2. Transform Personnel with Live Dispatch Status
  const activeDispatchMap = new Map<string, { incidentId: string; status: string; path: any[] }>();
  activeDispatches.forEach((d) => {
    activeDispatchMap.set(d.unit_id, {
      incidentId: d.incident_id,
      status: "responding",
      path: d.path || [],
    });
  });

  const personnel = RESPONDER_ROSTER.map((rosterItem, idx) => {
    const activeDispatch = activeDispatchMap.get(rosterItem.id);
    const isBusy = !!activeDispatch;

    // Estimate live coordinates from current path if available, or default hub location
    let currentLat = 19.06 + (idx % 5) * 0.005;
    let currentLng = 72.83 + Math.floor(idx / 5) * 0.005;

    if (activeDispatch && activeDispatch.path && activeDispatch.path.length > 0) {
      // Pick middle or target waypoint
      const pt = activeDispatch.path[Math.min(activeDispatch.path.length - 1, Math.floor(activeDispatch.path.length / 2))];
      if (pt) {
        currentLat = pt.lat;
        currentLng = pt.lon;
      }
    }

    return {
      id: idx + 1,
      simUnitId: rosterItem.id,
      name: rosterItem.name,
      role: rosterItem.role,
      status: isBusy ? "responding" : "available",
      lat: currentLat,
      lng: currentLng,
      location: { lat: currentLat, lng: currentLng },
      assignedIncident: activeDispatch ? activeDispatch.incidentId : null,
      phone: rosterItem.phone,
      callsign: rosterItem.callsign,
      type: rosterItem.type,
    };
  });

  // 3. Transform Resources & Infrastructure
  const resources: any[] = [];

  // Mobile Units as Equipment
  RESPONDER_ROSTER.forEach((r, idx) => {
    const isDeployed = activeDispatchMap.has(r.id);
    resources.push({
      id: idx + 1,
      name: `${r.type} ${r.id}`,
      type: r.type,
      status: isDeployed ? "deployed" : "available",
      assigned_incident_id: activeDispatchMap.get(r.id)?.incidentId || null,
      location: { lat: 19.06 + (idx % 5) * 0.005, lng: 72.83 + Math.floor(idx / 5) * 0.005 },
      is_public: false,
    });
  });

  // Stationary Facilities (Hospitals, Fire Stations, Police HQ)
  (latestTickData.infrastructure_status || []).forEach((hub, idx) => {
    resources.push({
      id: 100 + idx,
      name: hub.name || `${hub.type} Station ${idx + 1}`,
      type: hub.type,
      status: hub.current_occupancy >= hub.max_capacity ? "at capacity" : "operational",
      max_capacity: hub.max_capacity,
      current_occupancy: hub.current_occupancy,
      location: { lat: hub.location.lat, lng: hub.location.lon },
      is_public: true,
    });
  });

  // 4. Generate AI Tactical Radio Communications Feed
  const communications: any[] = [];

  // Add recent dispatches as high-priority radio events
  activeDispatches.slice(-15).forEach((disp, idx) => {
    const responder = RESPONDER_ROSTER.find((r) => r.id === disp.unit_id);
    communications.push({
      id: `comm-disp-${disp.unit_id}-${disp.incident_id}-${idx}`,
      sender_name: "🤖 GNN Central Dispatch",
      sender_role: "AI Tactical Orchestrator",
      message: `Dispatched ${responder ? responder.name : disp.unit_id} (${disp.unit_type}) to Incident #${disp.incident_id}. ${disp.reasoning || ""}${disp.synergy_bundle ? " ⚡ [SYNERGY BUNDLE ACTIVE]" : ""}`,
      type: disp.synergy_bundle ? "synergy" : "dispatch",
      created_at: `Tick ${latestTickData.tick}`,
      incident_id: disp.incident_id,
    });
  });

  // Add completed / resolved events
  (latestTickData.resolved_incidents || []).forEach((res, idx) => {
    communications.push({
      id: `comm-res-${res.incident_id}-${idx}`,
      sender_name: "✅ Incident Command",
      sender_role: "Field Supervisor",
      message: `Incident #${res.incident_id} successfully resolved in ${res.time_to_resolve_ticks} ticks. Units released back to home depots.`,
      type: "resolution",
      created_at: `Tick ${latestTickData.tick}`,
      incident_id: res.incident_id,
    });
  });

  // 5. Aggregate Summary Stats
  const activePersonnelCount = personnel.filter((p) => p.status === "responding").length;
  const criticalIncidentsCount = incidents.filter((i) => i.severity === "critical").length;

  const stats = {
    activeIncidents: incidents.length,
    activePersonnel: activePersonnelCount,
    totalEquipment: resources.filter((r) => r.status === "deployed").length,
    criticalIncidents: criticalIncidentsCount,
    hospitalLoad: latestTickData.state_summary?.hospital_load || 0,
    fireStationLoad: latestTickData.state_summary?.fire_station_load || 0,
    policeStationLoad: latestTickData.state_summary?.police_station_load || 0,
  };

  return {
    incidents,
    personnel,
    resources,
    communications,
    stats,
  };
}
