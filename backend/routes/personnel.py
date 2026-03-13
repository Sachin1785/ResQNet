from flask import Blueprint, request, jsonify, current_app
from database import get_db_connection
from datetime import datetime

personnel_bp = Blueprint('personnel', __name__)

@personnel_bp.route('/personnel', methods=['GET'])
def get_personnel():
    """Get all personnel with optional filters"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get query parameters
    status = request.args.get('status')
    role = request.args.get('role')
    incident_id = request.args.get('incident_id')
    
    query = 'SELECT * FROM personnel WHERE 1=1'
    params = []
    
    if status:
        query += ' AND status = ?'
        params.append(status)
    
    if role:
        query += ' AND role = ?'
        params.append(role)
    
    if incident_id:
        query += ' AND assigned_incident_id = ?'
        params.append(incident_id)
    
    query += ' ORDER BY name'
    
    cursor.execute(query, params)
    personnel = [dict(row) for row in cursor.fetchall()]
    
    # Format location for each
    for person in personnel:
        if person['lat'] and person['lng']:
            person['location'] = {
                'lat': person['lat'],
                'lng': person['lng']
            }
    
    conn.close()
    
    return jsonify({
        'success': True,
        'personnel': personnel,
        'count': len(personnel)
    })

@personnel_bp.route('/personnel/<int:personnel_id>', methods=['GET'])
def get_personnel_detail(personnel_id):
    """Get detailed personnel information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM personnel WHERE id = ?', (personnel_id,))
    person = cursor.fetchone()
    
    if not person:
        conn.close()
        return jsonify({'success': False, 'error': 'Personnel not found'}), 404
    
    person = dict(person)
    
    # Get assigned incident if any
    if person['assigned_incident_id']:
        cursor.execute('SELECT * FROM incidents WHERE id = ?', (person['assigned_incident_id'],))
        incident = cursor.fetchone()
        if incident:
            person['assigned_incident'] = dict(incident)
    
    # Format location
    if person['lat'] and person['lng']:
        person['location'] = {
            'lat': person['lat'],
            'lng': person['lng']
        }
    
    conn.close()
    
    return jsonify({
        'success': True,
        'personnel': person
    })

@personnel_bp.route('/personnel/<int:personnel_id>/location', methods=['PUT'])
def update_personnel_location(personnel_id):
    """Update personnel location"""
    data = request.get_json()
    
    if 'lat' not in data or 'lng' not in data:
        return jsonify({'success': False, 'error': 'Missing lat or lng'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE personnel
        SET lat = ?, lng = ?, updated_at = ?
        WHERE id = ?
    ''', (data['lat'], data['lng'], datetime.now().isoformat(), personnel_id))
    
    conn.commit()
    
    # Get personnel info for broadcasting
    cursor.execute('SELECT name, status, assigned_incident_id FROM personnel WHERE id = ?', (personnel_id,))
    person = cursor.fetchone()
    
    conn.close()
    
    if person:
        # Broadcast to all
        current_app.broadcast_event('personnel_location_updated', {
            'personnel_id': personnel_id,
            'name': person['name'],
            'location': {'lat': data['lat'], 'lng': data['lng']},
            'status': person['status']
        })
        
        # If assigned, broadcast to incident room
        if person['assigned_incident_id']:
            current_app.broadcast_event('personnel_location_updated', {
                'personnel_id': personnel_id,
                'name': person['name'],
                'location': {'lat': data['lat'], 'lng': data['lng']},
                'status': person['status']
            }, room=f'incident_{person["assigned_incident_id"]}')
    
    return jsonify({
        'success': True,
        'personnel_id': personnel_id,
        'location': {'lat': data['lat'], 'lng': data['lng']}
    })


@personnel_bp.route('/personnel/<int:personnel_id>/status', methods=['PUT'])
def update_personnel_status(personnel_id):
    """Update personnel status"""
    data = request.get_json()
    
    if 'status' not in data:
        return jsonify({'success': False, 'error': 'Missing status'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get current personnel info
    cursor.execute('SELECT * FROM personnel WHERE id = ?', (personnel_id,))
    person = cursor.fetchone()
    
    if not person:
        conn.close()
        return jsonify({'success': False, 'error': 'Personnel not found'}), 404
    
    person = dict(person)
    
    # Update status
    cursor.execute('''
        UPDATE personnel
        SET status = ?, updated_at = ?
        WHERE id = ?
    ''', (data['status'], datetime.now().isoformat(), personnel_id))
    
    # If status changed to available, clear assignment
    if data['status'] == 'available' and person['assigned_incident_id']:
        cursor.execute('''
            UPDATE personnel
            SET assigned_incident_id = NULL
            WHERE id = ?
        ''', (personnel_id,))
        
        # Add timeline event to incident
        cursor.execute('''
            INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
            VALUES (?, ?, ?, ?)
        ''', (
            person['assigned_incident_id'],
            'personnel_status_update',
            f'{person["name"]} marked as available',
            'System'
        ))
    
    conn.commit()
    conn.close()
    
    # Broadcast status change
    current_app.broadcast_event('personnel_status_updated', {
        'personnel_id': personnel_id,
        'name': person['name'],
        'status': data['status'],
        'assigned_incident_id': person['assigned_incident_id'] if data['status'] != 'available' else None
    })
    
    return jsonify({
        'success': True,
        'personnel_id': personnel_id,
        'status': data['status']
    })


@personnel_bp.route('/personnel/user/<int:user_id>', methods=['GET'])
def get_personnel_by_user(user_id):
    """Get personnel info by user ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM personnel WHERE user_id = ?', (user_id,))
    person = cursor.fetchone()
    
    if not person:
        conn.close()
        return jsonify({'success': False, 'error': 'Personnel not found for this user'}), 404
    
    person = dict(person)
    
    # Get assigned incident if any
    if person['assigned_incident_id']:
        cursor.execute('SELECT * FROM incidents WHERE id = ?', (person['assigned_incident_id'],))
        incident = cursor.fetchone()
        if incident:
            person['assigned_incident'] = dict(incident)
    
    # Format location
    if person['lat'] and person['lng']:
        person['location'] = {
            'lat': person['lat'],
            'lng': person['lng']
        }
    
    conn.close()
    
    return jsonify({
        'success': True,
        'personnel': person
    })

@personnel_bp.route('/personnel', methods=['POST'])
def create_personnel():
    """Create new personnel record"""
    data = request.get_json()
    
    required_fields = ['name', 'role']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user exists if user_id is provided
    if data.get('user_id'):
        cursor.execute('SELECT id FROM users WHERE id = ?', (data['user_id'],))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Linked user not found'}), 404
    
    cursor.execute('''
        INSERT INTO personnel (name, role, status, lat, lng, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data['role'],
        data.get('status', 'available'),
        data.get('lat'),
        data.get('lng'),
        data.get('user_id')
    ))
    
    personnel_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'personnel_id': personnel_id
    }), 201

@personnel_bp.route('/personnel/available', methods=['GET'])
def get_available_personnel():
    """Get all available personnel"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM personnel
        WHERE status = 'available'
        ORDER BY role, name
    ''')
    
    personnel = [dict(row) for row in cursor.fetchall()]
    
    # Format location
    for person in personnel:
        if person['lat'] and person['lng']:
            person['location'] = {
                'lat': person['lat'],
                'lng': person['lng']
            }
    
    conn.close()
    
    return jsonify({
        'success': True,
        'personnel': personnel,
        'count': len(personnel)
    })

@personnel_bp.route('/personnel/<int:personnel_id>/assign', methods=['POST'])
def assign_personnel_to_incident(personnel_id):
    """Assign personnel to an incident (Self-Assignment)"""
    data = request.get_json()
    
    if 'incident_id' not in data:
        return jsonify({'success': False, 'error': 'Missing incident_id'}), 400
    
    incident_id = data['incident_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if personnel exists
    cursor.execute('SELECT * FROM personnel WHERE id = ?', (personnel_id,))
    person = cursor.fetchone()
    if not person:
        conn.close()
        return jsonify({'success': False, 'error': 'Personnel not found'}), 404
        
    person = dict(person)
    
    # Check if incident exists
    cursor.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'error': 'Incident not found'}), 404
        
    # Perform assignment
    cursor.execute('''
        UPDATE personnel
        SET assigned_incident_id = ?, status = 'responding', updated_at = ?
        WHERE id = ?
    ''', (incident_id, datetime.now().isoformat(), personnel_id))
    
    # Add timeline event to incident
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
        VALUES (?, ?, ?, ?)
    ''', (
        incident_id,
        'personnel_assigned',
        f'{person["name"]} self-assigned to incident',
        'System'
    ))
    
    conn.commit()
    conn.close()
    
    # Broadcast status change
    current_app.broadcast_event('personnel_status_updated', {
        'personnel_id': personnel_id,
        'name': person['name'],
        'status': 'responding',
        'assigned_incident_id': incident_id
    })
    
    # Broadcast assignment
    current_app.broadcast_event('personnel_assigned', {
        'personnel_id': personnel_id,
        'incident_id': incident_id
    })
    
    return jsonify({
        'success': True,
        'personnel_id': personnel_id,
        'incident_id': incident_id,
        'status': 'responding'
    })


