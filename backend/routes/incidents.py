from flask import Blueprint, request, jsonify
from database import get_db_connection
from datetime import datetime, timedelta
from utils.file_utils import save_file
from utils.geo_utils import calculate_distance
from utils.notification_utils import broadcast_incident_notification
from utils.ai_utils import ai_handler
from config import Config
import threading
import os

incidents_bp = Blueprint('incidents', __name__)

@incidents_bp.route('/attachments', methods=['GET'])
def get_all_attachments():
    """Get all file attachments across all incidents for Evidence Gallery"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    limit = request.args.get('limit', 100)
    
    cursor.execute('''
        SELECT a.*, i.title as incident_title, i.severity as incident_severity
        FROM attachments a
        JOIN incidents i ON a.incident_id = i.id
        ORDER BY a.created_at DESC
        LIMIT ?
    ''', (limit,))
    
    attachments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'count': len(attachments),
        'attachments': attachments
    })

@incidents_bp.route('/incidents', methods=['GET'])
def get_incidents():
    """Get all incidents with optional filters"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get query parameters
    status = request.args.get('status')
    severity = request.args.get('severity')
    incident_type = request.args.get('type')
    
    query = 'SELECT * FROM incidents WHERE 1=1'
    params = []
    
    if status:
        query += ' AND status = ?'
        params.append(status)
    
    if severity:
        query += ' AND severity = ?'
        params.append(severity)
    
    if incident_type:
        query += ' AND type = ?'
        params.append(incident_type)
    
    query += ' ORDER BY created_at DESC'
    
    cursor.execute(query, params)
    incidents = [dict(row) for row in cursor.fetchall()]
    
    # Get personnel and resources for each incident
    for incident in incidents:
        # Get assigned personnel
        cursor.execute('''
            SELECT name, role, status FROM personnel
            WHERE assigned_incident_id = ?
        ''', (incident['id'],))
        incident['responders'] = [dict(row) for row in cursor.fetchall()]
        
        # Get assigned resources
        cursor.execute('''
            SELECT name, type, status FROM resources
            WHERE assigned_incident_id = ?
        ''', (incident['id'],))
        incident['resources'] = [dict(row) for row in cursor.fetchall()]
        
        # Get attachments
        cursor.execute('''
            SELECT * FROM attachments
            WHERE incident_id = ?
            ORDER BY created_at DESC
        ''', (incident['id'],))
        incident['attachments'] = [dict(row) for row in cursor.fetchall()]
        incident['attachments_count'] = len(incident['attachments'])
        
        # Format location
        incident['location'] = {
            'lat': incident['lat'],
            'lng': incident['lng']
        }
    
    conn.close()
    
    return jsonify({
        'success': True,
        'incidents': incidents,
        'count': len(incidents)
    })

@incidents_bp.route('/incidents/<int:incident_id>', methods=['GET'])
def get_incident(incident_id):
    """Get detailed incident information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,))
    incident = cursor.fetchone()
    
    if not incident:
        conn.close()
        return jsonify({'success': False, 'error': 'Incident not found'}), 404
    
    incident = dict(incident)
    
    # Get personnel
    cursor.execute('''
        SELECT * FROM personnel
        WHERE assigned_incident_id = ?
    ''', (incident_id,))
    incident['responders'] = [dict(row) for row in cursor.fetchall()]
    
    # Get resources
    cursor.execute('''
        SELECT * FROM resources
        WHERE assigned_incident_id = ?
    ''', (incident_id,))
    incident['resources'] = [dict(row) for row in cursor.fetchall()]
    
    # Get timeline
    cursor.execute('''
        SELECT * FROM incident_timeline
        WHERE incident_id = ?
        ORDER BY created_at DESC
    ''', (incident_id,))
    incident['timeline'] = [dict(row) for row in cursor.fetchall()]
    
    # Get attachments
    cursor.execute('''
        SELECT * FROM attachments
        WHERE incident_id = ?
        ORDER BY created_at DESC
    ''', (incident_id,))
    incident['attachments'] = [dict(row) for row in cursor.fetchall()]
    
    # Get communications
    cursor.execute('''
        SELECT * FROM communications
        WHERE incident_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    ''', (incident_id,))
    incident['communications'] = [dict(row) for row in cursor.fetchall()]
    
    # Format location
    incident['location'] = {
        'lat': incident['lat'],
        'lng': incident['lng']
    }
    
    conn.close()
    
    return jsonify({
        'success': True,
        'incident': incident
    })

@incidents_bp.route('/incidents', methods=['POST'])
def create_incident():
    """Create a new incident"""
    data = request.get_json()
    
    required_fields = ['title', 'type', 'severity', 'lat', 'lng']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Define severity ranking for upgrades
    severity_rank = {'critical': 3, 'high': 2, 'medium': 1, 'low': 0}
    
    # 1. Search for potential duplicates (Active within last 24 hours)
    cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
    cursor.execute('''
        SELECT id, lat, lng, report_count, severity FROM incidents 
        WHERE type = ? AND status = 'active' AND created_at >= ?
    ''', (data['type'], cutoff))
    
    active_incidents = [dict(row) for row in cursor.fetchall()]
    
    # Check for duplicates (within 500m)
    duplicate_incident = None
    for incident in active_incidents:
        distance = calculate_distance(
            data['lat'], data['lng'],
            incident['lat'], incident['lng']
        )
        if distance <= 500:  # 500 meters threshold
            duplicate_incident = incident
            break
            
    if duplicate_incident:
        # Increment report count
        new_count = (duplicate_incident['report_count'] or 1) + 1
        now = datetime.now().isoformat()
        
        # Determine if severity upgrade is needed
        new_severity = data['severity']
        old_severity = duplicate_incident['severity']
        upgrade_needed = severity_rank.get(new_severity, 0) > severity_rank.get(old_severity, 0)
        
        update_query = '''
            UPDATE incidents 
            SET report_count = ?, updated_at = ?
        '''
        update_params = [new_count, now]
        
        timeline_desc = f'Additional report received. Total reports: {new_count}'
        
        if upgrade_needed:
            update_query += ', severity = ?'
            update_params.append(new_severity)
            timeline_desc += f'. Severity upgraded from {old_severity.upper()} to {new_severity.upper()} based on new report.'
            
        update_query += ' WHERE id = ?'
        update_params.append(duplicate_incident['id'])
        
        cursor.execute(update_query, update_params)
        
        # Add timeline event for duplicate/merged report
        cursor.execute('''
            INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
            VALUES (?, ?, ?, ?)
        ''', (
            duplicate_incident['id'], 
            'duplicate_report', 
            timeline_desc, 
            'System'
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'incident_id': duplicate_incident['id'],
            'message': 'Report merged with existing incident',
            'is_duplicate': True,
            'severity_upgraded': upgrade_needed
        }), 200

    now = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO incidents (
            title, description, type, severity, status,
            lat, lng, location_name, report_source, report_count,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ''', (
        data['title'],
        data.get('description', ''),
        data['type'],
        data['severity'],
        data.get('status', 'active'),
        data['lat'],
        data['lng'],
        data.get('location_name', ''),
        data.get('report_source', 'web'),
        now,
        now
    ))
    
    incident_id = cursor.lastrowid
    
    # Add timeline event
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
        VALUES (?, ?, ?, ?)
    ''', (incident_id, 'incident_created', f'Incident reported: {data["title"]}', 'System'))
    
    conn.commit()
    conn.close()
    
    # Broadcast notification
    notification = broadcast_incident_notification(
        incident_id,
        f"New {data['severity'].upper()} Incident",
        data['title'],
        'critical' if data['severity'] == 'critical' else 'high'
    )
    
    return jsonify({
        'success': True,
        'incident_id': incident_id,
        'notification': notification
    }), 201

@incidents_bp.route('/incidents/<int:incident_id>', methods=['PUT'])
def update_incident(incident_id):
    """Update incident details"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if incident exists
    cursor.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'error': 'Incident not found'}), 404
    
    # Build update query dynamically
    update_fields = []
    params = []
    
    allowed_fields = ['title', 'description', 'type', 'severity', 'status', 'lat', 'lng', 'location_name', 'victims_count']
    for field in allowed_fields:
        if field in data:
            update_fields.append(f'{field} = ?')
            params.append(data[field])
    
    if not update_fields:
        conn.close()
        return jsonify({'success': False, 'error': 'No fields to update'}), 400
    
    # Add updated_at
    now = datetime.now().isoformat()
    update_fields.append('updated_at = ?')
    params.append(now)
    
    # If status is being updated to resolved, set resolved_at
    if data.get('status') == 'resolved':
        update_fields.append('resolved_at = ?')
        params.append(now)
    elif 'status' in data and data.get('status') != 'resolved':
        # Optional: Clear resolved_at if status changes away from resolved
        update_fields.append('resolved_at = NULL')
    
    # Add incident_id for WHERE clause
    params.append(incident_id)
    
    query = f"UPDATE incidents SET {', '.join(update_fields)} WHERE id = ?"
    cursor.execute(query, params)
    
    # Add timeline event
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
        VALUES (?, ?, ?, ?)
    ''', (incident_id, 'incident_updated', f'Incident updated', 'System'))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'incident_id': incident_id
    })

@incidents_bp.route('/incidents/<int:incident_id>/assign', methods=['POST'])
def assign_resources(incident_id):
    """Assign personnel and resources to incident"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if incident exists
    cursor.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'error': 'Incident not found'}), 404
    
    assigned = {'personnel': [], 'resources': []}
    
    # Assign personnel
    if 'personnel_ids' in data:
        for personnel_id in data['personnel_ids']:
            cursor.execute('''
                UPDATE personnel
                SET assigned_incident_id = ?, status = 'en-route', updated_at = ?
                WHERE id = ?
            ''', (incident_id, datetime.now().isoformat(), personnel_id))
            assigned['personnel'].append(personnel_id)
    
    # Assign resources
    if 'resource_ids' in data:
        for resource_id in data['resource_ids']:
            cursor.execute('''
                UPDATE resources
                SET assigned_incident_id = ?, status = 'en-route', updated_at = ?
                WHERE id = ?
            ''', (incident_id, datetime.now().isoformat(), resource_id))
            assigned['resources'].append(resource_id)
    
    # Add timeline event
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
        VALUES (?, ?, ?, ?)
    ''', (
        incident_id,
        'resources_assigned',
        f'Assigned {len(assigned["personnel"])} personnel and {len(assigned["resources"])} resources',
        'Dispatcher'
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'assigned': assigned
    })

@incidents_bp.route('/incidents/<int:incident_id>/upload', methods=['POST'])
def upload_attachment(incident_id):
    """Upload file attachment to incident"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Save file
    file_info = save_file(file, incident_id)
    
    if not file_info:
        return jsonify({'success': False, 'error': 'Invalid file or file type not allowed'}), 400
    
    # Save to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO attachments (incident_id, filename, filepath, file_type, file_size)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        incident_id,
        file_info['filename'],
        file_info['filepath'],
        file_info['file_type'],
        file_info['file_size']
    ))
    
    attachment_id = cursor.lastrowid
    
    # Trigger AI Verification in background if it's an image
    if file_info['file_type'] == 'image':
        def run_verification(inc_id, photo_path):
            incident_type = None
            incident_desc = None
            
            # Step 1: Get incident data and close connection immediately
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT type, description FROM incidents WHERE id = ?', (inc_id,))
                incident = cursor.fetchone()
                if incident:
                    incident_type = incident['type']
                    incident_desc = incident['description'] or "No description provided"
            
            if not incident_type:
                return

            # Step 2: Call AI (This is the slow part, no DB connection held)
            print(f"🤖 AI: Starting verification for incident {inc_id}...")
            result = ai_handler.verify_incident_photo(photo_path, incident_type, incident_desc)
            
            # Step 3: Re-open connection to save results (with retry)
            import time
            import random
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    with get_db_connection() as conn:
                        # Explicitly begin transaction
                        conn.execute('BEGIN IMMEDIATE')
                        cursor = conn.cursor()
                        # Update incident with verification results
                        cursor.execute('''
                            UPDATE incidents 
                            SET is_verified = ?, verification_score = ?, ai_analysis = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        ''', (
                            result['is_verified'], # Now an integer: 1, 0, or -1
                            result['confidence_score'],
                            result['analysis'],
                            inc_id
                        ))
                        
                        # Add timeline event
                        status_map = {1: "VERIFIED", 0: "UNVERIFIED", -1: "FAKE/FRAUD"}
                        verification_status = status_map.get(result['is_verified'], "UNKNOWN")
                        
                        cursor.execute('''
                            INSERT INTO incident_timeline (incident_id, event_type, description, user_name, metadata)
                            VALUES (?, ?, ?, ?, ?)
                        ''', (
                            inc_id,
                            'ai_verification',
                            f"AI Verification Result: {verification_status} (Score: {result['confidence_score']}%)",
                            'Gemini Flash',
                            result['analysis']
                        ))
                        conn.commit()
                        print(f"✅ AI Verification saved successfully on attempt {attempt + 1}")
                        break # Success!
                except Exception as db_err:
                    # Check if it's a lock error
                    if 'locked' in str(db_err) and attempt < max_retries - 1:
                        wait_time = (0.5 * (2 ** attempt)) + (random.random() * 0.2)
                        print(f"⚠️ DB Locked. Retrying in {wait_time:.2f}s... (Attempt {attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        print(f"🤖 DB Error saving verification: {db_err}")
                        break
            else:
                print(f"🤖 AI Error: {result.get('error')}")

        # Start verification in a separate thread to not block the response
        full_photo_path = os.path.join(Config.BASE_DIR, file_info['filepath'])
        threading.Thread(target=run_verification, args=(incident_id, full_photo_path)).start()

    # Add timeline event for the upload itself
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
        VALUES (?, ?, ?, ?)
    ''', (incident_id, 'attachment_added', f'File uploaded: {file_info["filename"]}', 'User'))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'attachment_id': attachment_id,
        'file_info': file_info
    }), 201

@incidents_bp.route('/incidents/<int:incident_id>/timeline', methods=['GET'])
def get_incident_timeline(incident_id):
    """Get incident timeline/history"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM incident_timeline
        WHERE incident_id = ?
        ORDER BY created_at DESC
    ''', (incident_id,))
    
    timeline = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'timeline': timeline,
        'count': len(timeline)
    })

@incidents_bp.route('/incidents/<int:incident_id>/timeline', methods=['POST'])
def add_timeline_event(incident_id):
    """Add event to incident timeline"""
    data = request.get_json()
    
    required_fields = ['event_type', 'description']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        incident_id,
        data['event_type'],
        data['description'],
        data.get('user_name', 'System'),
        data.get('metadata', ''),
        now
    ))
    
    timeline_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'timeline_id': timeline_id
    }), 201

@incidents_bp.route('/incidents/<int:incident_id>/resolve', methods=['POST'])
def resolve_incident(incident_id):
    """Resolve incident and release all assigned resources"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Verify incident exists
    cursor.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,))
    incident = cursor.fetchone()
    if not incident:
        conn.close()
        return jsonify({'success': False, 'error': 'Incident not found'}), 404
        
    try:
        # Check for confirmation flag
        data = request.get_json() or {}
        confirm = data.get('confirm', False)

        # If not confirmed, just set to pending_review
        if not confirm:
            now = datetime.now().isoformat()
            cursor.execute('''
                UPDATE incidents 
                SET status = 'pending_review', updated_at = ?
                WHERE id = ?
            ''', (now, incident_id))
            
            # Add Timeline Event
            cursor.execute('''
                INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
                VALUES (?, ?, ?, ?)
            ''', (
                incident_id, 
                'resolution_submitted', 
                'Incident submitted for resolution. Review required.', 
                'Responder'
            ))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'Incident submitted for review',
                'status': 'pending_review',
                'released_personnel': 0,
                'released_resources': 0
            })

        # 2. Update Incident Status
        now = datetime.now().isoformat()
        cursor.execute('''
            UPDATE incidents 
            SET status = 'resolved', updated_at = ?, resolved_at = ?
            WHERE id = ?
        ''', (now, now, incident_id))
        
        # 3. Release Personnel
        cursor.execute('''
            UPDATE personnel
            SET status = 'available', assigned_incident_id = NULL, updated_at = ?
            WHERE assigned_incident_id = ?
        ''', (datetime.now().isoformat(), incident_id))
        affected_personnel = cursor.rowcount
        
        # 4. Release Resources
        cursor.execute('''
            UPDATE resources
            SET status = 'available', assigned_incident_id = NULL, updated_at = ?
            WHERE assigned_incident_id = ?
        ''', (datetime.now().isoformat(), incident_id))
        affected_resources = cursor.rowcount
        
        # 5. Add Timeline Event
        cursor.execute('''
            INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
            VALUES (?, ?, ?, ?)
        ''', (
            incident_id, 
            'incident_resolved', 
            f'Incident resolution confirmed. Released {affected_personnel} personnel and {affected_resources} resources.', 
            'Supervisor'
        ))
        
        conn.commit()
        
        # Broadcast update (optional but good practice)
        # We generally rely on the polling/websocket to pick up status changes
        
        return jsonify({
            'success': True,
            'message': 'Incident resolved successfully',
            'released_personnel': affected_personnel,
            'released_resources': affected_resources
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
