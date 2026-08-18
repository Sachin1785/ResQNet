import math

class SimulationEngine:
    def __init__(self):
        self.time = 0
        self.infrastructure = {} # id -> StationaryResource
        self.mobile_units = {} # id -> MobileResource
        self.incidents = {} # id -> DemandZone
        
    def add_infrastructure(self, infra):
        self.infrastructure[infra.id] = infra
        
    def add_mobile_unit(self, unit):
        self.mobile_units[unit.id] = unit
        
    def add_incident(self, incident):
        incident.spawn_time = self.time
        self.incidents[incident.id] = incident
        
    def sever_edge(self, u: str, v: str) -> list[str]:
        """Cuts an edge and intercepts units en route. Returns a list of intercepted unit IDs."""
        intercepted = []
        for unit in self.mobile_units.values():
            if unit.status == 'EN_ROUTE' and unit.route:
                # Check if edge (u,v) or (v,u) is in route
                route_edges = [(unit.route[i], unit.route[i+1]) for i in range(len(unit.route)-1)]
                if (u, v) in route_edges or (v, u) in route_edges:
                    # Intercept!
                    # Find last safe node
                    edge_idx = -1
                    if (u, v) in route_edges: edge_idx = route_edges.index((u, v))
                    if (v, u) in route_edges: edge_idx = route_edges.index((v, u))
                    
                    last_safe = unit.route[edge_idx]
                    
                    # Update unit state
                    unit.status = 'REROUTING'
                    unit.current_location = last_safe
                    unit.route = []
                    unit.busy_until = self.time # Available for immediate AI reroute
                    
                    # Free the incident requirement so it asks again
                    if unit.assigned_incident_id and unit.assigned_incident_id in self.incidents:
                        inc = self.incidents[unit.assigned_incident_id]
                        if unit.type in inc.assigned_resources:
                            if unit.id in inc.assigned_resources[unit.type]:
                                inc.assigned_resources[unit.type].remove(unit.id)
                    
                    # Also free the infra hub slot!
                    if unit.assigned_infra_id and unit.assigned_infra_id in self.infrastructure:
                        self.infrastructure[unit.assigned_infra_id].current_occupancy -= 1
                        
                    unit.assigned_incident_id = None
                    unit.assigned_infra_id = None
                    intercepted.append(unit.id)
        return intercepted
        
    def tick(self):
        self.time += 1
        completed_events = []
        resolved_incidents = []
        
        # Free up busy resources when time is up
        for unit in self.mobile_units.values():
            if unit.status not in ['IDLE', 'REROUTING'] and self.time >= unit.busy_until:
                old_incident = unit.assigned_incident_id
                old_infra = unit.assigned_infra_id
                
                # Return home and go idle
                unit.status = 'IDLE'
                unit.current_location = unit.home_depot_id
                unit.route = []
                
                freed_hub_name = None
                # Free infrastructure capacity
                if old_infra and old_infra in self.infrastructure:
                    self.infrastructure[old_infra].current_occupancy -= 1
                    freed_hub_name = self.infrastructure[old_infra].name
                    
                # Track physical completion on the incident
                if old_incident and old_incident in self.incidents:
                    inc = self.incidents[old_incident]
                    if unit.type not in inc.completed_resources:
                        inc.completed_resources[unit.type] = []
                    inc.completed_resources[unit.type].append(unit.id)
                    
                event = {
                    "unit_id": unit.id,
                    "released_from": old_incident,
                    "freed_hub": freed_hub_name
                }
                completed_events.append(event)
                
                unit.assigned_incident_id = None
                unit.assigned_infra_id = None
                
        # Check incident resolutions
        for inc_id, inc in list(self.incidents.items()):
            if inc.is_physically_resolved:
                # Resolved!
                inc.resolved = True
                resolved_incidents.append({
                    "incident_id": inc_id,
                    "time_to_resolve_ticks": self.time - inc.spawn_time
                })
                # Garbage collect
                del self.incidents[inc_id]
                
        return completed_events, resolved_incidents
                
    def dispatch_unit(self, unit_id, incident_id, distance: float, route: list[str]) -> bool:
        """Returns True if dispatch was successful, False if blocked by capacity constraints."""
        if unit_id in self.mobile_units and incident_id in self.incidents:
            unit = self.mobile_units[unit_id]
            inc = self.incidents[incident_id]
            
            # MUST be IDLE or REROUTING to be dispatched
            if unit.status not in ['IDLE', 'REROUTING']:
                return False
            
            # Identify required infrastructure type
            infra_map = {
                'Ambulance': 'Hospital',
                'Fire Truck': 'Fire Station',
                'Police Car': 'Police Station'
            }
            req_infra_type = infra_map.get(unit.type)
            
            selected_infra = None
            if req_infra_type:
                for infra in self.infrastructure.values():
                    if infra.type == req_infra_type and infra.current_occupancy < infra.max_capacity:
                        selected_infra = infra
                        break
                        
                if not selected_infra:
                    # Global capacity constraint hit! Cannot dispatch.
                    return False
            
            # Proceed with dispatch
            if selected_infra:
                selected_infra.current_occupancy += 1
                unit.assigned_infra_id = selected_infra.id
                
            unit.status = 'EN_ROUTE'
            unit.assigned_incident_id = incident_id
            unit.route = route
            
            # PHYSICS-BASED TRAVEL
            avg_speed_m_per_tick = 3.0 # example
            travel_ticks = math.ceil(distance / avg_speed_m_per_tick)
            on_scene_ticks = 2
            unit.busy_until = self.time + travel_ticks + on_scene_ticks
            
            if unit.type not in inc.assigned_resources:
                inc.assigned_resources[unit.type] = []
            inc.assigned_resources[unit.type].append(unit_id)
            return True
            
        return False
