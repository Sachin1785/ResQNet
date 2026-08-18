import folium
import osmnx as ox

class MapRenderer:
    def __init__(self, location_name="Mumbai, India"):
        self.location_name = location_name
        
    def generate_map(self, graph, engine, severed_edges, dispatches=None, output_file="simulation_map.html"):
        nodes = list(graph.nodes(data=True))
        if not nodes:
            return
            
        y_coords = [data['y'] for node, data in nodes]
        x_coords = [data['x'] for node, data in nodes]
        center = [sum(y_coords)/len(y_coords), sum(x_coords)/len(x_coords)]
        
        m = folium.Map(location=center, zoom_start=14, tiles='CartoDB positron')
        
        # Roads
        for u, v, data in graph.edges(data=True):
            if 'geometry' in data:
                coords = [(lat, lon) for lon, lat in data['geometry'].coords]
            else:
                coords = [(graph.nodes[u]['y'], graph.nodes[u]['x']), (graph.nodes[v]['y'], graph.nodes[v]['x'])]
            
            if (u, v) in severed_edges or (v, u) in severed_edges:
                folium.PolyLine(coords, color='red', weight=4, opacity=0.8).add_to(m)
            else:
                folium.PolyLine(coords, color='lightgray', weight=1, opacity=0.5).add_to(m)
                
        # AI Dispatches
        if dispatches:
            for u, v in dispatches:
                coords = [(graph.nodes[u]['y'], graph.nodes[u]['x']), (graph.nodes[v]['y'], graph.nodes[v]['x'])]
                folium.PolyLine(coords, color='blue', weight=4, opacity=0.9, dash_array='10, 10', tooltip='AI Dispatch Route').add_to(m)

        # Infrastructure
        for infra in engine.infrastructure.values():
            lat = graph.nodes[int(infra.location)]['y']
            lon = graph.nodes[int(infra.location)]['x']
            
            icon_type = 'plus-square'
            color = 'green'
            if infra.type == 'Hospital': icon_type = 'plus-square'; color='darkgreen'
            elif infra.type == 'Police Station': icon_type = 'shield'; color='darkblue'
            elif infra.type == 'Fire Station': icon_type = 'fire-extinguisher'; color='darkred'
            elif infra.type == 'Blood Bank': icon_type = 'tint'; color='red'
                
            folium.Marker(
                [lat, lon],
                popup=f"{infra.name} ({infra.current_occupancy}/{infra.max_capacity})",
                icon=folium.Icon(color=color, icon=icon_type, prefix='fa')
            ).add_to(m)

        # Mobile Units
        for unit in engine.mobile_units.values():
            if unit.status == 'busy':
                continue # Handled by dispatch route or incident
            lat = graph.nodes[int(unit.current_location)]['y']
            lon = graph.nodes[int(unit.current_location)]['x']
            
            icon_type = 'car'
            color = 'blue'
            if unit.type == 'Ambulance': icon_type = 'ambulance'; color='white'
            elif unit.type == 'Fire Truck': icon_type = 'truck'; color='red'
            elif unit.type == 'Police Car': icon_type = 'car'; color='blue'
                
            folium.Marker(
                [lat, lon],
                popup=f"{unit.type} ({unit.id}) - {unit.status}",
                icon=folium.Icon(color=color, icon=icon_type, prefix='fa')
            ).add_to(m)
            
        # Incidents
        for inc in engine.incidents.values():
            if inc.resolved: continue
            lat = graph.nodes[int(inc.location)]['y']
            lon = graph.nodes[int(inc.location)]['x']
            
            icon_type = 'exclamation-circle'
            if inc.type == 'Fire': icon_type = 'fire'
            elif inc.type == 'Car Crash': icon_type = 'car'
            elif inc.type == 'Earthquake': icon_type = 'globe'
            
            folium.Marker(
                [lat, lon],
                popup=f"{inc.type} (Sev: {inc.severity})",
                icon=folium.Icon(color='red', icon=icon_type, prefix='fa')
            ).add_to(m)
            
        m.save(output_file)
        return m
