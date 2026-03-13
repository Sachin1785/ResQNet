from flask import Blueprint, request, jsonify
from database import get_db_connection
from datetime import datetime

comms_bp = Blueprint('comms', __name__)

@comms_bp.route('/comms/incident/<int:incident_id>', methods=['GET'])
def get_incident_comms(incident_id):
    """Get all communications for an incident"""
    limit = request.args.get('limit', type=int, default=100)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM communications
        WHERE incident_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    ''', (incident_id, limit))
    
    comms = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'communications': comms,
        'count': len(comms)
    })

@comms_bp.route('/comms', methods=['POST'])
def send_message():
    """Send a new message"""
    data = request.get_json()
    
    required_fields = ['incident_id', 'message']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO communications (incident_id, sender_id, sender_name, message, type)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        data['incident_id'],
        data.get('sender_id'),
        data.get('sender_name', 'Anonymous'),
        data['message'],
        data.get('type', 'text')
    ))
    
    comm_id = cursor.lastrowid
    
    # Add timeline event
    cursor.execute('''
        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
        VALUES (?, ?, ?, ?)
    ''', (
        data['incident_id'],
        'communication',
        f'Message from {data.get("sender_name", "Anonymous")}',
        data.get('sender_name', 'Anonymous')
    ))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'comm_id': comm_id,
        'created_at': datetime.now().isoformat()
    }), 201

@comms_bp.route('/comms/<int:comm_id>/read', methods=['PUT'])
def mark_message_read(comm_id):
    """Mark a message as read"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE communications
        SET read_status = 1
        WHERE id = ?
    ''', (comm_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'comm_id': comm_id
    })

@comms_bp.route('/comms/unread', methods=['GET'])
def get_unread_messages():
    """Get all unread messages"""
    incident_id = request.args.get('incident_id', type=int)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = 'SELECT * FROM communications WHERE read_status = 0'
    params = []
    
    if incident_id:
        query += ' AND incident_id = ?'
        params.append(incident_id)
    
    query += ' ORDER BY created_at DESC'
    
    cursor.execute(query, params)
    comms = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'communications': comms,
        'count': len(comms)
    })

@comms_bp.route('/comms/broadcast', methods=['GET'])
def get_broadcast_messages():
    """Get all broadcast messages (messages with no incident_id)"""
    limit = request.args.get('limit', type=int, default=100)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM communications
        WHERE incident_id IS NULL AND type = 'broadcast'
        ORDER BY created_at DESC
        LIMIT ?
    ''', (limit,))
    
    comms = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'communications': comms,
        'count': len(comms)
    })

