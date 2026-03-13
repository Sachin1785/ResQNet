from flask import Blueprint, request, jsonify
from database import get_db_connection
import sqlite3
import requests

resources_bp = Blueprint('resources', __name__)

@resources_bp.route('/resources', methods=['GET'])
def get_resources():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    status = request.args.get('status')
    type_filter = request.args.get('type')
    is_public = request.args.get('is_public')
    
    query = "SELECT * FROM resources"
    params = []
    conditions = []
    
    if status:
        conditions.append("status = ?")
        params.append(status)
        
    if type_filter:
        conditions.append("type = ?")
        params.append(type_filter)
        
    if is_public is not None:
        conditions.append("is_public = ?")
        params.append(1 if is_public.lower() == 'true' else 0)
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    cursor.execute(query, params)
    resources = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'count': len(resources),
        'resources': resources
    })

@resources_bp.route('/resources/public', methods=['GET'])
def get_public_resources():
    """Get only resources marked for public access"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch only active/deployed resources that are public
    cursor.execute('''
        SELECT * FROM resources 
        WHERE is_public = 1 
        AND status != 'maintenance'
    ''')
    
    resources = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'count': len(resources),
        'resources': resources
    })

@resources_bp.route('/resources', methods=['POST'])
def create_resource():
    data = request.json
    
    if not data or not data.get('name') or not data.get('type'):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO resources (name, type, status, lat, lng, is_public)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['name'], 
            data['type'], 
            data.get('status', 'available'),
            data.get('lat', 0),
            data.get('lng', 0),
            data.get('is_public', False)
        ))
        
        resource_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({
            'success': True,
            'id': resource_id,
            'message': 'Resource created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@resources_bp.route('/resources/<int:id>', methods=['PUT'])
def update_resource(id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Build update query dynamically
        fields = []
        params = []
        
        allowed_fields = ['name', 'type', 'status', 'lat', 'lng', 'is_public', 'assigned_incident_id']
        
        for field in allowed_fields:
            if field in data:
                fields.append(f"{field} = ?")
                params.append(data[field])
                
        if not fields:
            return jsonify({'success': False, 'error': 'No valid fields to update'}), 400
            
        params.append(id)
        
        cursor.execute(f'''
            UPDATE resources 
            SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', params)
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Resource updated'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
