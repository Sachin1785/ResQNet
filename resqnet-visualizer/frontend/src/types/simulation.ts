export interface Coordinates {
  lon: number;
  lat: number;
}

export interface Waypoint {
  lon: number;
  lat: number;
  timestamp: number;
}

export interface TrajectoryEvent {
  unit_id: string;
  unit_type: string;
  incident_id: string;
  incident_type: string;
  distance: number;
  calculated_duration_ticks: number;
  synergy_bundle: boolean;
  reasoning: string;
  status: string;
  path: Waypoint[];
}

export interface IncidentSchema {
  id: string;
  type: string;
  severity: number;
  requirements: Record<string, number>;
  remaining_requirements: Record<string, number>;
  location: Coordinates;
}

export interface InfrastructureSchema {
  id: string;
  name: string;
  type: string;
  max_capacity: number;
  current_occupancy: number;
  location: Coordinates;
}

export interface TickData {
  tick: number;
  completed_events: unknown[];
  resolved_incidents: unknown[];
  intercepted_units: string[];
  new_incidents: IncidentSchema[];
  active_incidents: IncidentSchema[];
  infrastructure_status: InfrastructureSchema[];
  state_summary: Record<string, unknown>;
  dispatches: TrajectoryEvent[];
}
