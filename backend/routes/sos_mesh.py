from flask import Blueprint, request, jsonify
from database import get_db_connection
from datetime import datetime
import json
from utils.geo_utils import calculate_distance
from utils.notification_utils import broadcast_incident_notification

sos_mesh_bp = Blueprint('sos_mesh', __name__)

@sos_mesh_bp.route('/sosmesh', methods=['POST'])
def receive_sos_mesh():
    """
    Receive SOS messages from Bluetooth mesh network.
    
    Expected JSON structure:
    {
        "msg_id": "89d19edd-...",
        "type": "SOS",
        "name": "John Doe",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "emergency": "Medical Emergency",
        "timestamp": 1770233307256,
        "delivered": false
    }
    """
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['msg_id', 'name', 'latitude', 'longitude', 'emergency', 'timestamp']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Map emergency type to incident type and severity
    emergency_type = data.get('emergency', 'Unknown Emergency')
    incident_type_map = {
        'Medical Emergency': ('medical', 'critical'),
        'Fire': ('fire', 'critical'),
        'Accident': ('accident', 'high'),
        'Crime': ('security', 'high'),
        'Natural Disaster': ('natural_disaster', 'critical'),
        'Other': ('other', 'medium')
    }
    
    incident_type, severity = incident_type_map.get(
        emergency_type,
        ('other', 'high')
    )
    
    # Check for existing active incidents at similar location (within 500m)
    cursor.execute('''
        SELECT id, lat, lng, report_count, sosmesh_messages FROM incidents 
        WHERE type = ? AND status = 'active'
    ''', (incident_type,))
    
    active_incidents = [dict(row) for row in cursor.fetchall()]
    
    duplicate_incident = None
    for incident in active_incidents:
        distance = calculate_distance(
            data['latitude'], data['longitude'],
            incident['lat'], incident['lng']
        )
        if distance <= 500:  # 500 meters threshold
            duplicate_incident = incident
            break
    
    if duplicate_incident:
        # Update existing incident with new SOS mesh message
        new_count = (duplicate_incident['report_count'] or 1) + 1
        
        # Parse existing sosmesh_messages or create new list
        existing_messages = []
        if duplicate_incident['sosmesh_messages']:
            try:
                existing_messages = json.loads(duplicate_incident['sosmesh_messages'])
            except json.JSONDecodeError:
                existing_messages = []
        
        # Check if this message ID already exists (deduplication)
        if any(msg.get('msg_id') == data['msg_id'] for msg in existing_messages):
            conn.close()
            return jsonify({
                'success': True,
                'status': 'already_exists',
                'incident_id': duplicate_incident['id'],
                'msg_id': data['msg_id'],
                'message': 'SOS message already received'
            }), 200
        
        # Add new message to the list
        existing_messages.append({
            'msg_id': data['msg_id'],
            'name': data['name'],
            'latitude': data['latitude'],
            'longitude': data['longitude'],
            'emergency': data['emergency'],
            'timestamp': data['timestamp'],
            'delivered': data.get('delivered', False),
            'received_at': datetime.now().isoformat()
        })
        
        # Update incident
        cursor.execute('''
            UPDATE incidents 
            SET report_count = ?, 
                sosmesh_messages = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_count, json.dumps(existing_messages), duplicate_incident['id']))
        
        # Add timeline event
        cursor.execute('''
            INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
            VALUES (?, ?, ?, ?)
        ''', (
            duplicate_incident['id'], 
            'sosmesh_report', 
            f'SOS Mesh report from {data["name"]} - {data["emergency"]}. Total reports: {new_count}', 
            'SOS Mesh'
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'status': 'merged',
            'incident_id': duplicate_incident['id'],
            'msg_id': data['msg_id'],
            'message': 'SOS message merged with existing incident',
            'report_count': new_count
        }), 200
    
    # Create new incident from SOS mesh message
    title = f"SOS: {data['emergency']} - {data['name']}"
    description = f"Emergency reported via SOS Bluetooth Mesh Network.\n\nReporter: {data['name']}\nEmergency Type: {data['emergency']}\nMessage ID: {data['msg_id']}"
    
    # Create initial sosmesh_messages array
    initial_message = [{
        'msg_id': data['msg_id'],
        'name': data['name'],
        'latitude': data['latitude'],
        'longitude': data['longitude'],
        'emergency': data['emergency'],
        'timestamp': data['timestamp'],
        'delivered': data.get('delivered', False),
        'received_at': datetime.now().isoformat()
    }]
    
    cursor.execute('''
        INSERT INTO incidents (
            title, description, type, severity, status,
            lat, lng, location_name, report_source, report_count, sosmesh_messages
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        title,
        description,
        incident_type,
        severity,
        'active',
        data['latitude'],
        data['longitude'],
        f"SOS Mesh Location ({data['latitude']:.4f}, {data['longitude']:.4f})",
        'sosmesh',
        1,
        json.dumps(initial_message)
    ))
    
    incident_id = cursor.lastrowid
    
    # Add timeline event
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
        VALUES (?, ?, ?, ?)
    ''', (
        incident_id, 
        'incident_created', 
        f'Incident created from SOS Mesh: {data["emergency"]} reported by {data["name"]}', 
        'SOS Mesh'
    ))
    
    conn.commit()
    conn.close()
    
    # Broadcast notification
    notification = broadcast_incident_notification(
        incident_id,
        f"🚨 SOS MESH ALERT: {severity.upper()}",
        f"{data['emergency']} - {data['name']}",
        'critical' if severity == 'critical' else 'high'
    )
    
    print(f"🚨 RECEIVED SOS MESH: {data['name']} - {data['emergency']}")
    print(f"📍 Location: {data['latitude']}, {data['longitude']}")
    print(f"🆔 Message ID: {data['msg_id']}")
    print(f"📋 Created Incident ID: {incident_id}")
    
    return jsonify({
        'success': True,
        'status': 'created',
        'incident_id': incident_id,
        'msg_id': data['msg_id'],
        'message': 'New incident created from SOS mesh message',
        'notification': notification
    }), 201


@sos_mesh_bp.route('/sosmesh/batch', methods=['POST'])
def receive_sos_mesh_batch():
    """
    Receive a batch of SOS messages from Bluetooth mesh network.
    
    Expected JSON structure:
    {
        "messages": [
            {
                "msg_id": "89d19edd-...",
                "type": "SOS",
                "name": "John Doe",
                ...
            },
            ...
        ]
    }
    """
    data = request.get_json()
    if not data or 'messages' not in data or not isinstance(data['messages'], list):
        return jsonify({
            'success': False,
            'error': 'Missing or invalid "messages" array'
        }), 400
        
    messages = data['messages']
    receipts = []
    
    # Process each message individually. Since we already have logic for /sosmesh, 
    # we can adapt it or call it. We will adapt it inline for simplicity and efficiency.
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    for msg in messages:
        # Validate required fields
        required_fields = ['msg_id', 'name', 'latitude', 'longitude', 'emergency', 'timestamp']
        if not all(field in msg for field in required_fields):
            continue
            
        msg_id = msg['msg_id']
        
        # Map emergency type
        emergency_type = msg.get('emergency', 'Unknown Emergency')
        incident_type_map = {
            'Medical Emergency': ('medical', 'critical'),
            'Fire': ('fire', 'critical'),
            'Accident': ('accident', 'high'),
            'Crime': ('security', 'high'),
            'Natural Disaster': ('natural_disaster', 'critical'),
            'Other': ('other', 'medium')
        }
        incident_type, severity = incident_type_map.get(emergency_type, ('other', 'high'))
        
        # Check for existing active incidents at similar location
        cursor.execute('''
            SELECT id, lat, lng, report_count, sosmesh_messages FROM incidents 
            WHERE type = ? AND status = 'active'
        ''', (incident_type,))
        
        active_incidents = [dict(row) for row in cursor.fetchall()]
        
        duplicate_incident = None
        for incident in active_incidents:
            distance = calculate_distance(
                msg['latitude'], msg['longitude'],
                incident['lat'], incident['lng']
            )
            if distance <= 500:  # 500 meters threshold
                duplicate_incident = incident
                break
                
        if duplicate_incident:
            # Parse existing messages
            existing_messages = []
            if duplicate_incident['sosmesh_messages']:
                try:
                    existing_messages = json.loads(duplicate_incident['sosmesh_messages'])
                except json.JSONDecodeError:
                    existing_messages = []
            
            # Deduplication
            if any(m.get('msg_id') == msg_id for m in existing_messages):
                receipts.append(msg_id)
                continue
                
            new_count = (duplicate_incident['report_count'] or 1) + 1
            existing_messages.append({
                'msg_id': msg_id,
                'name': msg['name'],
                'latitude': msg['latitude'],
                'longitude': msg['longitude'],
                'emergency': msg['emergency'],
                'timestamp': msg['timestamp'],
                'delivered': msg.get('delivered', False),
                'received_at': datetime.now().isoformat()
            })
            
            cursor.execute('''
                UPDATE incidents 
                SET report_count = ?, 
                    sosmesh_messages = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (new_count, json.dumps(existing_messages), duplicate_incident['id']))
            
            cursor.execute('''
                INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
                VALUES (?, ?, ?, ?)
            ''', (
                duplicate_incident['id'], 
                'sosmesh_report', 
                f'SOS Mesh report from {msg["name"]} - {msg["emergency"]}. Total reports: {new_count}', 
                'SOS Mesh'
            ))
            
            receipts.append(msg_id)
            print(f"🚨 RECEIVED SOS MESH (BATCH MERGED): {msg['name']} - {msg['emergency']}")
            
        else:
            # Create new incident
            title = f"SOS: {msg['emergency']} - {msg['name']}"
            description = f"Emergency reported via SOS Bluetooth Mesh Network.\n\nReporter: {msg['name']}\nEmergency Type: {msg['emergency']}\nMessage ID: {msg_id}"
            
            initial_message = [{
                'msg_id': msg_id,
                'name': msg['name'],
                'latitude': msg['latitude'],
                'longitude': msg['longitude'],
                'emergency': msg['emergency'],
                'timestamp': msg['timestamp'],
                'delivered': msg.get('delivered', False),
                'received_at': datetime.now().isoformat()
            }]
            
            cursor.execute('''
                INSERT INTO incidents (
                    title, description, type, severity, status,
                    lat, lng, location_name, report_source, report_count, sosmesh_messages
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                title,
                description,
                incident_type,
                severity,
                'active',
                msg['latitude'],
                msg['longitude'],
                f"SOS Mesh Location ({msg['latitude']:.4f}, {msg['longitude']:.4f})",
                'sosmesh',
                1,
                json.dumps(initial_message)
            ))
            
            incident_id = cursor.lastrowid
            
            cursor.execute('''
                INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
                VALUES (?, ?, ?, ?)
            ''', (
                incident_id, 
                'incident_created', 
                f'Incident created from SOS Mesh: {msg["emergency"]} reported by {msg["name"]}', 
                'SOS Mesh'
            ))
            
            try:
                broadcast_incident_notification(
                    incident_id,
                    f"🚨 SOS MESH ALERT: {severity.upper()}",
                    f"{msg['emergency']} - {msg['name']}",
                    'critical' if severity == 'critical' else 'high'
                )
            except Exception as e:
                print(f"Error broadcasting notification: {e}")
                
            receipts.append(msg_id)
            print(f"🚨 RECEIVED SOS MESH (BATCH CREATED): {msg['name']} - {msg['emergency']}")
            
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'receipts': receipts,
        'processed_count': len(receipts)
    }), 200


@sos_mesh_bp.route('/sosmesh/messages', methods=['GET'])
def get_all_sosmesh_messages():
    """Get all SOS mesh messages from all incidents"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, title, type, severity, status, lat, lng, 
               sosmesh_messages, created_at, updated_at, report_count
        FROM incidents 
        WHERE sosmesh_messages IS NOT NULL
        ORDER BY updated_at DESC
    ''')
    
    incidents = []
    for row in cursor.fetchall():
        incident = dict(row)
        
        # Parse sosmesh_messages JSON
        if incident['sosmesh_messages']:
            try:
                incident['sosmesh_messages'] = json.loads(incident['sosmesh_messages'])
            except json.JSONDecodeError:
                incident['sosmesh_messages'] = []
        else:
            incident['sosmesh_messages'] = []
        
        incidents.append(incident)
    
    conn.close()
    
    # Flatten all messages for easier access
    all_messages = []
    for incident in incidents:
        for msg in incident.get('sosmesh_messages', []):
            all_messages.append({
                **msg,
                'incident_id': incident['id'],
                'incident_title': incident['title'],
                'incident_status': incident['status']
            })
    
    return jsonify({
        'success': True,
        'incidents_with_sosmesh': incidents,
        'total_incidents': len(incidents),
        'all_messages': all_messages,
        'total_messages': len(all_messages)
    })


@sos_mesh_bp.route('/sosmesh/messages/<msg_id>', methods=['GET'])
def get_sosmesh_message(msg_id):
    """Get a specific SOS mesh message by its message ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, title, type, severity, status, lat, lng, 
               sosmesh_messages, created_at, updated_at
        FROM incidents 
        WHERE sosmesh_messages IS NOT NULL
    ''')
    
    for row in cursor.fetchall():
        incident = dict(row)
        
        if incident['sosmesh_messages']:
            try:
                messages = json.loads(incident['sosmesh_messages'])
                for msg in messages:
                    if msg.get('msg_id') == msg_id:
                        conn.close()
                        return jsonify({
                            'success': True,
                            'message': msg,
                            'incident': {
                                'id': incident['id'],
                                'title': incident['title'],
                                'status': incident['status'],
                                'severity': incident['severity']
                            }
                        })
            except json.JSONDecodeError:
                continue
    
    conn.close()
    return jsonify({
        'success': False,
        'error': 'Message not found'
    }), 404
