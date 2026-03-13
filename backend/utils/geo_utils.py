import math

def calculate_distance(lat1, lng1, lat2, lng2):
    """
    Calculate distance between two coordinates using Haversine formula
    Returns distance in meters
    """
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance

def is_within_radius(lat1, lng1, lat2, lng2, radius_meters):
    """
    Check if a point is within a given radius of another point
    """
    distance = calculate_distance(lat1, lng1, lat2, lng2)
    return distance <= radius_meters

def get_nearby_items(user_lat, user_lng, items, radius_meters):
    """
    Filter items that are within radius of user location
    Items should have 'lat' and 'lng' keys
    """
    nearby = []
    for item in items:
        if is_within_radius(user_lat, user_lng, item['lat'], item['lng'], radius_meters):
            distance = calculate_distance(user_lat, user_lng, item['lat'], item['lng'])
            item['distance'] = round(distance, 2)
            nearby.append(item)
    
    # Sort by distance
    nearby.sort(key=lambda x: x['distance'])
    return nearby

def check_geofence_breach(lat, lng, geofence_zones):
    """
    Check if a location breaches any geofence zones
    Returns list of breached zones
    """
    breached_zones = []
    for zone in geofence_zones:
        if is_within_radius(lat, lng, zone['lat'], zone['lng'], zone['radius']):
            breached_zones.append(zone)
    return breached_zones

def get_bounding_box(lat, lng, radius_meters):
    """
    Get bounding box coordinates for a given center point and radius
    Returns (min_lat, max_lat, min_lng, max_lng)
    """
    # Approximate degrees per meter
    lat_degree = radius_meters / 111000
    lng_degree = radius_meters / (111000 * math.cos(math.radians(lat)))
    
    return (
        lat - lat_degree,
        lat + lat_degree,
        lng - lng_degree,
        lng + lng_degree
    )
