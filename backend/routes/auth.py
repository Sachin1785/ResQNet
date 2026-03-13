from flask import Blueprint, request, jsonify
from database import get_db_connection
from datetime import datetime
import secrets
import sqlite3

auth_bp = Blueprint('auth', __name__)

# Simple session storage (in production, use Redis or proper session management)
active_sessions = {}

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """Login endpoint"""
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Username and password required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Find user
    cursor.execute('''
        SELECT * FROM users 
        WHERE username = ? AND password = ? AND status = 'active'
    ''', (username, password))
    
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    # Update last login
    cursor.execute('''
        UPDATE users SET last_login = datetime('now') WHERE id = ?
    ''', (user['id'],))
    conn.commit()
    conn.close()
    
    # Create session token
    session_token = secrets.token_urlsafe(32)
    active_sessions[session_token] = {
        'user_id': user['id'],
        'username': user['username'],
        'name': user['name'],
        'role': user['role'],
        'created_at': datetime.now().isoformat()
    }
    
    return jsonify({
        'success': True,
        'token': session_token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'name': user['name'],
            'role': user['role'],
            'email': user['email'],
            'phone': user['phone']
        }
    })

@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    """Logout endpoint"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if token in active_sessions:
        del active_sessions[token]
    
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/auth/me', methods=['GET'])
def get_current_user():
    """Get current user info"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if token not in active_sessions:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    session = active_sessions[token]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'name': user['name'],
            'role': user['role'],
            'email': user['email'],
            'phone': user['phone'],
            'status': user['status']
        }
    })

@auth_bp.route('/auth/users', methods=['GET'])
def get_all_users():
    """Get all users (for testing)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    role = request.args.get('role')
    
    if role:
        cursor.execute('SELECT id, username, name, role, email, phone, status FROM users WHERE role = ?', (role,))
    else:
        cursor.execute('SELECT id, username, name, role, email, phone, status FROM users')
    
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify({
        'success': True,
        'users': users,
        'count': len(users)
    })

@auth_bp.route('/auth/register-responder', methods=['POST'])
def register_responder():
    """Register a new responder (User + Personnel record)"""
    data = request.get_json()
    
    required_fields = ['username', 'password', 'name', 'personnel_role']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
            
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Create User
        cursor.execute('''
            INSERT INTO users (username, password, name, role, email, phone)
            VALUES (?, ?, ?, 'responder', ?, ?)
        ''', (
            data['username'],
            data['password'],
            data['name'],
            data.get('email'),
            data.get('phone')
        ))
        user_id = cursor.lastrowid
        
        # 2. Create Personnel Record
        cursor.execute('''
            INSERT INTO personnel (user_id, name, role, status)
            VALUES (?, ?, ?, 'available')
        ''', (
            user_id,
            data['name'],
            data['personnel_role']
        ))
        personnel_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'personnel_id': personnel_id,
            'message': 'Responder registered successfully'
        }), 201
        
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'error': 'Username already exists'}), 400
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

def verify_token(token):
    """Helper function to verify token"""
    return token in active_sessions

def get_user_from_token(token):
    """Helper function to get user from token"""
    if token in active_sessions:
        return active_sessions[token]
    return None
