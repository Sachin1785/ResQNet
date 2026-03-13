from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils.geo_utils import get_nearby_items, check_geofence_breach
from utils.notification_utils import create_geofence_alert
from config import Config

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/alerts/nearby', methods=['GET'])
def get_nearby_alerts():
    """Get alerts near a location"""
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    radius = request.args.get('radius', type=float, default=Config.NEARBY_ALERT_RADIUS_METERS)
    
    if not lat or not lng:
        return jsonify({'success': False, 'error': 'Missing lat or lng'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all active alerts
    cursor.execute('''
        SELECT a.*, i.title as incident_title, i.type as incident_type, i.status as incident_status
        FROM alerts a
        LEFT JOIN incidents i ON a.incident_id = i.id
        WHERE a.expires_at IS NULL OR a.expires_at > datetime('now')
    ''')
    
    all_alerts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Filter by proximity
    nearby_alerts = get_nearby_items(lat, lng, all_alerts, radius)
    
    return jsonify({
        'success': True,
        'alerts': nearby_alerts,
        'count': len(nearby_alerts),
        'user_location': {'lat': lat, 'lng': lng},
        'radius_meters': radius
    })

@alerts_bp.route('/alerts', methods=['POST'])
def create_alert():
    """Create a new alert"""
    data = request.get_json()
    
    required_fields = ['lat', 'lng', 'radius', 'message', 'severity']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO alerts (incident_id, lat, lng, radius, message, severity, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('incident_id'),
        data['lat'],
        data['lng'],
        data['radius'],
        data['message'],
        data['severity'],
        data.get('expires_at')
    ))
    
    alert_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'alert_id': alert_id
    }), 201

@alerts_bp.route('/alerts/geofence/check', methods=['POST'])
def check_geofence():
    """Check if a location breaches any geofence zones"""
    data = request.get_json()
    
    if 'lat' not in data or 'lng' not in data:
        return jsonify({'success': False, 'error': 'Missing lat or lng'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all active geofence zones
    cursor.execute('''
        SELECT g.*, i.title as incident_title, i.severity as incident_severity
        FROM geofence_zones g
        LEFT JOIN incidents i ON g.incident_id = i.id
        WHERE g.active = 1
    ''')
    
    zones = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Check for breaches
    breached_zones = check_geofence_breach(data['lat'], data['lng'], zones)
    
    # Create alerts for breached zones
    alerts = []
    for zone in breached_zones:
        alert = create_geofence_alert(zone, {'lat': data['lat'], 'lng': data['lng']})
        alerts.append(alert)
    
    return jsonify({
        'success': True,
        'breached': len(breached_zones) > 0,
        'zones': breached_zones,
        'alerts': alerts,
        'count': len(breached_zones)
    })

@alerts_bp.route('/alerts/geofence', methods=['GET'])
def get_geofence_zones():
    """Get all geofence zones"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    
    query = '''
        SELECT g.*, i.title as incident_title, i.severity as incident_severity
        FROM geofence_zones g
        LEFT JOIN incidents i ON g.incident_id = i.id
    '''
    
    if active_only:
        query += ' WHERE g.active = 1'
    
    cursor.execute(query)
    zones = [dict(row) for row in cursor.fetchall()]
    
    # Format location
    for zone in zones:
        zone['location'] = {
            'lat': zone['lat'],
            'lng': zone['lng']
        }
    
    conn.close()
    
    return jsonify({
        'success': True,
        'zones': zones,
        'count': len(zones)
    })

@alerts_bp.route('/alerts/geofence', methods=['POST'])
def create_geofence_zone():
    """Create a new geofence zone"""
    data = request.get_json()
    
    required_fields = ['name', 'lat', 'lng', 'radius', 'zone_type']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO geofence_zones (incident_id, name, lat, lng, radius, zone_type, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('incident_id'),
        data['name'],
        data['lat'],
        data['lng'],
        data['radius'],
        data['zone_type'],
        data.get('active', True)
    ))
    
    zone_id = cursor.lastrowid
    
    # Add timeline event if associated with incident
    if data.get('incident_id'):
        cursor.execute('''
            INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
            VALUES (?, ?, ?, ?)
        ''', (
            data['incident_id'],
            'geofence_created',
            f'Geofence zone created: {data["name"]}',
            'System'
        ))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'zone_id': zone_id
    }), 201

@alerts_bp.route('/alerts/geofence/<int:zone_id>', methods=['PUT'])
def update_geofence_zone(zone_id):
    """Update geofence zone"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Build update query
    update_fields = []
    params = []
    
    allowed_fields = ['name', 'lat', 'lng', 'radius', 'zone_type', 'active']
    for field in allowed_fields:
        if field in data:
            update_fields.append(f'{field} = ?')
            params.append(data[field])
    
    if not update_fields:
        conn.close()
        return jsonify({'success': False, 'error': 'No fields to update'}), 400
    
    params.append(zone_id)
    
    query = f"UPDATE geofence_zones SET {', '.join(update_fields)} WHERE id = ?"
    cursor.execute(query, params)
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'zone_id': zone_id
    })
