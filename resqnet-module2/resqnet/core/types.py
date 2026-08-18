from pydantic import BaseModel, Field
from typing import Literal, Tuple, Dict, Optional
import random

class StationaryResource(BaseModel):
    id: str
    name: str
    type: Literal['Hospital', 'Police Station', 'Fire Station', 'Blood Bank']
    max_capacity: int = Field(..., ge=0)
    current_occupancy: int = Field(default=0, ge=0)
    queue_length: int = Field(default=0, ge=0)
    is_online: bool = True
    location: str # node id

class MobileResource(BaseModel):
    id: str
    type: Literal['Ambulance', 'Fire Truck', 'Police Car']
    status: Literal['IDLE', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'REROUTING'] = 'IDLE'
    home_depot_id: str
    current_location: str # node id
    assigned_incident_id: Optional[str] = None
    assigned_infra_id: Optional[str] = None
    busy_until: int = 0
    route: list[str] = Field(default_factory=list)

class DemandZone(BaseModel):
    id: str
    type: Literal['Fire', 'Car Crash', 'Earthquake']
    location: str # node id
    spawn_time: int = 0
    severity: int = Field(default=1, ge=1, le=5)
    requirements: Dict[str, int] = Field(default_factory=dict) # e.g. {'Ambulance': 1, 'Fire Truck': 1}
    assigned_resources: Dict[str, list] = Field(default_factory=dict)
    completed_resources: Dict[str, list] = Field(default_factory=dict)
    resolved: bool = False
    
    @property
    def remaining_requirements(self) -> Dict[str, int]:
        rem = {}
        for req_type, req_count in self.requirements.items():
            assigned = len(self.assigned_resources.get(req_type, []))
            rem[req_type] = max(0, req_count - assigned)
        return rem

    @property
    def is_physically_resolved(self) -> bool:
        for req_type, req_count in self.requirements.items():
            completed = len(self.completed_resources.get(req_type, []))
            if completed < req_count:
                return False
        return True

def get_incident_requirements(incident_type: str, severity: int) -> Dict[str, int]:
    if incident_type == 'Fire':
        return {
            'Fire Truck': random.randint(1 * severity, 2 * severity), 
            'Ambulance': random.randint(0, 1 * severity)
        }
    elif incident_type == 'Car Crash':
        return {
            'Police Car': random.randint(1, 1 * severity), 
            'Ambulance': random.randint(1, 2 * severity)
        }
    elif incident_type == 'Earthquake':
        return {
            'Fire Truck': random.randint(1 * severity, 3 * severity), 
            'Ambulance': random.randint(1 * severity, 3 * severity), 
            'Police Car': random.randint(1 * severity, 2 * severity)
        }
    return {}
