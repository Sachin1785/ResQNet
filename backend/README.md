# Crisis Management Backend API

A comprehensive Flask-based backend server for crisis management with real-time WebSocket support, geofencing, analytics, and file uploads.

## 🚀 Features

- **Incident Management**: Create, update, and track emergency incidents
- **Personnel Tracking**: Real-time location tracking of responders
- **Resource Management**: Track and assign emergency resources
- **Real-time WebSocket**: Live updates for incidents, locations, and communications
- **Geofencing**: Danger zone alerts and breach detection
- **File Uploads**: Attach photos/videos to incidents
- **Timeline Tracking**: Complete incident history
- **Analytics**: Response times, personnel efficiency, resource utilization
- **Notifications**: Push notifications for critical updates
- **Communications**: In-incident messaging system

## 📁 Project Structure

```
backend/
├── app.py                      # Main Flask application with WebSocket
├── config.py                   # Configuration settings
├── database.py                 # Database initialization and seeding
├── requirements.txt            # Python dependencies
├── routes/
│   ├── incidents.py           # Incident management endpoints
│   ├── personnel.py           # Personnel tracking endpoints
│   ├── alerts.py              # Alerts and geofencing endpoints
│   ├── communications.py      # Messaging endpoints
│   ├── analytics.py           # Analytics endpoints
│   └── notifications.py       # Notification endpoints
└── utils/
    ├── geo_utils.py           # Geospatial calculations
    ├── analytics_utils.py     # Analytics calculations
    ├── file_utils.py          # File upload handling
    └── notification_utils.py  # Notification management
```

## 🛠️ Installation

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Initialize the database:**
```bash
python database.py
```

3. **Run the server:**
```bash
python app.py
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Incidents
- `GET /api/incidents` - Get all incidents (with filters)
- `GET /api/incidents/:id` - Get incident details
- `POST /api/incidents` - Create new incident
- `PUT /api/incidents/:id` - Update incident
- `POST /api/incidents/:id/assign` - Assign personnel/resources
- `POST /api/incidents/:id/upload` - Upload file attachment
- `GET /api/incidents/:id/timeline` - Get incident timeline
- `POST /api/incidents/:id/timeline` - Add timeline event

### Personnel
- `GET /api/personnel` - Get all personnel
- `GET /api/personnel/:id` - Get personnel details
- `PUT /api/personnel/:id/location` - Update location
- `PUT /api/personnel/:id/status` - Update status
- `POST /api/personnel` - Create personnel record
- `GET /api/personnel/available` - Get available personnel

### Alerts & Geofencing
- `GET /api/alerts/nearby` - Get nearby alerts
- `POST /api/alerts` - Create alert
- `POST /api/alerts/geofence/check` - Check geofence breach
- `GET /api/alerts/geofence` - Get geofence zones
- `POST /api/alerts/geofence` - Create geofence zone
- `PUT /api/alerts/geofence/:id` - Update geofence zone

### Communications
- `GET /api/comms/incident/:id` - Get incident messages
- `POST /api/comms` - Send message
- `PUT /api/comms/:id/read` - Mark as read
- `GET /api/comms/unread` - Get unread messages

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/incidents` - Get incident statistics
- `GET /api/analytics/personnel` - Get personnel efficiency
- `GET /api/analytics/resources` - Get resource utilization
- `GET /api/analytics/response-time/:id` - Get incident response time

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/broadcast` - Broadcast notification

## 🔌 WebSocket Events

### Client → Server
- `connect` - Establish connection
- `join_incident` - Join incident room
- `leave_incident` - Leave incident room
- `location_update` - Update personnel location
- `incident_update` - Update incident
- `new_message` - Send message
- `status_update` - Update personnel status
- `geofence_breach` - Report geofence breach

### Server → Client
- `connection_established` - Connection confirmed
- `personnel_location_updated` - Location updated
- `incident_updated` - Incident changed
- `message_received` - New message
- `personnel_status_updated` - Status changed
- `geofence_alert` - Geofence breach alert

## 🗄️ Database Schema

The SQLite database includes:
- **incidents** - Emergency incidents
- **personnel** - Responder personnel
- **resources** - Emergency resources
- **communications** - Messages
- **alerts** - Alert notifications
- **incident_timeline** - Event history
- **attachments** - File uploads
- **geofence_zones** - Danger zones
- **notifications** - Push notifications

## 🌐 CORS Configuration

By default, CORS is enabled for:
- `http://localhost:3000` (Crisis Command Dashboard)
- `http://localhost:3001` (Field Responder UI)

Update `config.py` to add more origins.

## 📦 Sample Data

The database is automatically seeded with sample data including:
- 4 incidents across Delhi, Mumbai, Bangalore, and Pune
- 18 personnel with various roles
- 9 resources (vehicles, equipment)
- Timeline events
- Geofence zones

## 🔧 Configuration

Edit `config.py` to customize:
- Database path
- Upload folder and file size limits
- CORS origins
- Geofencing radii
- Analytics thresholds

## 🚨 Real-time Features

### Location Tracking
Personnel locations are updated in real-time via WebSocket. Connect and emit `location_update` events:

```javascript
socket.emit('location_update', {
  personnel_id: 1,
  lat: 28.7041,
  lng: 77.1025
});
```

### Incident Updates
Subscribe to incident updates:

```javascript
socket.emit('join_incident', { incident_id: 1 });
```

### Geofence Alerts
Automatic alerts when entering danger zones. Check location:

```javascript
POST /api/alerts/geofence/check
{
  "lat": 28.7041,
  "lng": 77.1025
}
```

## 📊 Analytics

Get comprehensive analytics:

```javascript
GET /api/analytics/dashboard
```

Returns:
- Incident statistics by type, severity, status
- Average response times
- Personnel efficiency by role
- Resource utilization rates

## 🔐 Security Notes

- Authentication is currently disabled for development
- File uploads are validated for type and size
- SQL injection protection via parameterized queries
- CORS restricted to specified origins

## 🐛 Troubleshooting

**Database locked error:**
- Close any other connections to the database
- Restart the server

**WebSocket connection failed:**
- Check CORS origins in config.py
- Ensure gevent is installed

**File upload failed:**
- Check file size (max 16MB)
- Verify allowed extensions in config.py
- Ensure uploads folder exists

## 📝 License

MIT License - Crisis Management System
