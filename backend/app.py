from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from config import Config
from database import init_db, seed_sample_data, get_db_connection
import os

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
Config.init_app(app)

# Enable CORS
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

# Initialize SocketIO for WebSocket support
socketio = SocketIO(app, cors_allowed_origins=Config.CORS_ORIGINS)

# Import and register blueprints
from routes.incidents import incidents_bp
from routes.personnel import personnel_bp
from routes.alerts import alerts_bp
from routes.communications import comms_bp
from routes.analytics import analytics_bp
from routes.notifications import notifications_bp
from routes.auth import auth_bp
from routes.resources import resources_bp
from routes.sos_mesh import sos_mesh_bp
from routes.sms import sms_bp
from routes.iot import iot_bp
from routes.voice_bot import voice_bot_bp

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(incidents_bp, url_prefix='/api')
app.register_blueprint(personnel_bp, url_prefix='/api')
app.register_blueprint(alerts_bp, url_prefix='/api')
app.register_blueprint(comms_bp, url_prefix='/api')
app.register_blueprint(analytics_bp, url_prefix='/api')
app.register_blueprint(notifications_bp, url_prefix='/api')
app.register_blueprint(resources_bp, url_prefix='/api')
app.register_blueprint(sos_mesh_bp, url_prefix='/api')
app.register_blueprint(sms_bp, url_prefix='/api')
app.register_blueprint(iot_bp, url_prefix='/api')
app.register_blueprint(voice_bot_bp, url_prefix='/api')


# Root endpoint
@app.route('/')
def index():
    return jsonify({
        'message': 'Crisis Management Backend API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'incidents': '/api/incidents',
            'personnel': '/api/personnel',
            'alerts': '/api/alerts',
            'communications': '/api/comms',
            'analytics': '/api/analytics',
            'notifications': '/api/notifications',
            'sosmesh': '/api/sosmesh',
            'sms_webhook': '/api/sms/webhook',
            'websocket': 'ws://localhost:5000'
        }
    })

# Health check endpoint
@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'database': 'connected'})

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

# ==================== WebSocket Events ====================

# Track connected clients
connected_clients = {}

@socketio.on('connect')
def handle_connect(auth=None):
    """Handle client connection"""
    from flask import request as flask_request
    sid = flask_request.sid if hasattr(flask_request, 'sid') else 'unknown'
    print(f'Client connected: {sid}')
    emit('connection_established', {
        'message': 'Connected to Crisis Management Server',
        'sid': sid
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    from flask import request as flask_request
    sid = flask_request.sid if hasattr(flask_request, 'sid') else 'unknown'
    if sid in connected_clients:
        del connected_clients[sid]
    print(f'Client disconnected: {sid}')

@socketio.on('join_incident')
def handle_join_incident(data):
    """Join incident-specific room for updates"""
    incident_id = data.get('incident_id')
    if incident_id:
        room = f'incident_{incident_id}'
        join_room(room)
        emit('joined_incident', {
            'incident_id': incident_id,
            'message': f'Joined incident {incident_id} updates'
        })
        print(f'Client {request.sid} joined incident {incident_id}')

@socketio.on('leave_incident')
def handle_leave_incident(data):
    """Leave incident-specific room"""
    incident_id = data.get('incident_id')
    if incident_id:
        room = f'incident_{incident_id}'
        leave_room(room)
        emit('left_incident', {
            'incident_id': incident_id,
            'message': f'Left incident {incident_id} updates'
        })

@socketio.on('location_update')
def handle_location_update(data):
    """Handle real-time location updates from personnel"""
    personnel_id = data.get('personnel_id')
    lat = data.get('lat')
    lng = data.get('lng')
    
    if personnel_id and lat and lng:
        # Update database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE personnel
            SET lat = ?, lng = ?, updated_at = datetime('now')
            WHERE id = ?
        ''', (lat, lng, personnel_id))
        
        # Get personnel info
        cursor.execute('SELECT * FROM personnel WHERE id = ?', (personnel_id,))
        person = dict(cursor.fetchone())
        
        conn.commit()
        conn.close()
        
        # Broadcast to all clients
        socketio.emit('personnel_location_updated', {
            'personnel_id': personnel_id,
            'name': person['name'],
            'location': {'lat': lat, 'lng': lng},
            'status': person['status']
        })
        
        # If assigned to incident, broadcast to incident room
        if person['assigned_incident_id']:
            socketio.emit('personnel_location_updated', {
                'personnel_id': personnel_id,
                'name': person['name'],
                'location': {'lat': lat, 'lng': lng},
                'status': person['status']
            }, room=f'incident_{person["assigned_incident_id"]}')

@socketio.on('incident_update')
def handle_incident_update(data):
    """Handle real-time incident updates"""
    incident_id = data.get('incident_id')
    update_type = data.get('type')
    update_data = data.get('data', {})
    
    if incident_id:
        # Broadcast to incident room
        socketio.emit('incident_updated', {
            'incident_id': incident_id,
            'type': update_type,
            'data': update_data,
            'timestamp': data.get('timestamp')
        }, room=f'incident_{incident_id}')
        
        # Also broadcast to all clients for dashboard
        socketio.emit('incident_updated', {
            'incident_id': incident_id,
            'type': update_type,
            'data': update_data,
            'timestamp': data.get('timestamp')
        })

@socketio.on('new_message')
def handle_new_message(data):
    """Handle new communication message"""
    incident_id = data.get('incident_id')
    message = data.get('message')
    sender_name = data.get('sender_name', 'Anonymous')
    
    if incident_id and message:
        # Save to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO communications (incident_id, sender_name, message, type)
            VALUES (?, ?, ?, ?)
        ''', (incident_id, sender_name, message, 'text'))
        
        comm_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Broadcast to incident room
        socketio.emit('message_received', {
            'comm_id': comm_id,
            'incident_id': incident_id,
            'sender_name': sender_name,
            'message': message,
            'timestamp': data.get('timestamp')
        }, room=f'incident_{incident_id}')

@socketio.on('status_update')
def handle_status_update(data):
    """Handle personnel status updates"""
    personnel_id = data.get('personnel_id')
    status = data.get('status')
    
    if personnel_id and status:
        # Update database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE personnel
            SET status = ?, updated_at = datetime('now')
            WHERE id = ?
        ''', (status, personnel_id))
        
        cursor.execute('SELECT * FROM personnel WHERE id = ?', (personnel_id,))
        person = dict(cursor.fetchone())
        
        conn.commit()
        conn.close()
        
        # Broadcast to all clients
        socketio.emit('personnel_status_updated', {
            'personnel_id': personnel_id,
            'name': person['name'],
            'status': status,
            'assigned_incident_id': person['assigned_incident_id']
        })

@socketio.on('geofence_breach')
def handle_geofence_breach(data):
    """Handle geofence breach alert"""
    zone_id = data.get('zone_id')
    personnel_id = data.get('personnel_id')
    location = data.get('location')
    
    # Broadcast critical alert
    socketio.emit('geofence_alert', {
        'zone_id': zone_id,
        'personnel_id': personnel_id,
        'location': location,
        'alert_type': 'breach',
        'priority': 'critical'
    })

@socketio.on('broadcast_message')
def handle_broadcast_message(data):
    """Handle broadcast message to all responders"""
    from datetime import datetime
    
    message = data.get('message')
    sender_name = data.get('sender_name', 'Anonymous')
    sender_id = data.get('sender_id')
    
    if message:
        # Save to database with incident_id = NULL for broadcast messages
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO communications (incident_id, sender_name, message, type)
            VALUES (?, ?, ?, ?)
        ''', (None, sender_name, message, 'broadcast'))
        
        comm_id = cursor.lastrowid
        
        # Get the created timestamp from database
        cursor.execute('SELECT created_at FROM communications WHERE id = ?', (comm_id,))
        created_at = cursor.fetchone()[0]
        
        conn.commit()
        conn.close()
        
        # Broadcast to ALL connected clients
        socketio.emit('broadcast_received', {
            'comm_id': comm_id,
            'sender_name': sender_name,
            'sender_id': sender_id,
            'message': message,
            'timestamp': created_at,
            'type': 'broadcast'
        })


# Helper function to broadcast from routes
def broadcast_event(event_name, data, room=None):
    """Broadcast event to all clients or specific room"""
    if room:
        socketio.emit(event_name, data, room=room)
    else:
        socketio.emit(event_name, data)

# Make broadcast function available to routes
app.broadcast_event = broadcast_event

# ==================== Initialize Database ====================

def initialize_app():
    """Initialize application on startup"""
    print("🚀 Initializing Crisis Management Backend...")
    
    # Check if main database exists
    db_exists = os.path.exists(Config.DATABASE_PATH)
    
    if not db_exists:
        print("📦 Creating main database...")
        init_db()
        seed_sample_data()
    else:
        print("✅ Database already exists")

    # Always ensure the IoT sensor database is initialized (separate file)
    from iot_database import init_iot_db
    init_iot_db()
    
    print(f"📁 Upload folder: {Config.UPLOAD_FOLDER}")
    print(f"🌐 CORS enabled for: {Config.CORS_ORIGINS}")
    print("✅ Backend initialized successfully!")

if __name__ == '__main__':
    initialize_app()
    
    print("\n" + "="*50)
    print("🚀 Starting Crisis Management Backend Server")
    print("="*50)
    print(f"📡 HTTP Server: http://localhost:5000")
    print(f"🔌 WebSocket Server: ws://localhost:5000")
    print(f"📊 API Endpoints: http://localhost:5000/api")
    print("="*50 + "\n")
    
    # Run with SocketIO
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
