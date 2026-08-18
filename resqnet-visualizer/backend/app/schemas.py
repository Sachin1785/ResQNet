from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class Coordinates(BaseModel):
    lon: float
    lat: float

class Waypoint(BaseModel):
    lon: float
    lat: float
    timestamp: float

class TrajectoryEvent(BaseModel):
    unit_id: str
    unit_type: str
    incident_id: str
    incident_type: str
    distance: float
    calculated_duration_ticks: int
    synergy_bundle: bool
    reasoning: str
    status: str
    path: List[Waypoint]

class IncidentSchema(BaseModel):
    id: str
    type: str
    severity: int
    requirements: Dict[str, int]
    remaining_requirements: Dict[str, int]
    location: Coordinates

class InfrastructureSchema(BaseModel):
    id: str
    name: str
    type: str
    max_capacity: int
    current_occupancy: int
    location: Coordinates

class CompletedEvent(BaseModel):
    unit_id: str
    released_from: Optional[str]
    freed_hub: Optional[str]

class ResolvedIncident(BaseModel):
    incident_id: str
    time_to_resolve_ticks: int

class TickData(BaseModel):
    tick: int
    completed_events: List[CompletedEvent]
    resolved_incidents: List[ResolvedIncident]
    intercepted_units: List[str]
    new_incidents: List[IncidentSchema]
    active_incidents: List[IncidentSchema]
    infrastructure_status: List[InfrastructureSchema]
    state_summary: Dict[str, Any]
    dispatches: List[TrajectoryEvent]
