from database import get_db_connection
from datetime import datetime

def create_notification(user_id, incident_id, title, message, notification_type, priority):
    """
    Create a new notification
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO notifications (user_id, incident_id, title, message, type, priority)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, incident_id, title, message, notification_type, priority))
    
    notification_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return notification_id

def broadcast_incident_notification(incident_id, title, message, priority='high'):
    """
    Broadcast notification to all relevant users for an incident
    For now, broadcasts to all (no auth system yet)
    """
    notification_id = create_notification(
        None,  # Broadcast to all
        incident_id,
        title,
        message,
        'incident_update',
        priority
    )
    
    return {
        'id': notification_id,
        'title': title,
        'message': message,
        'type': 'incident_update',
        'priority': priority,
        'incident_id': incident_id,
        'created_at': datetime.now().isoformat()
    }

def create_geofence_alert(zone, user_location):
    """
    Create alert when user enters geofence zone
    """
    title = f"⚠️ Entering {zone['zone_type'].upper()} Zone"
    message = f"You are entering {zone['name']}. Please exercise caution."
    
    notification_id = create_notification(
        None,
        zone['incident_id'],
        title,
        message,
        'geofence_alert',
        'critical'
    )
    
    return {
        'id': notification_id,
        'title': title,
        'message': message,
        'type': 'geofence_alert',
        'priority': 'critical',
        'zone': zone,
        'created_at': datetime.now().isoformat()
    }

def get_user_notifications(user_id=None, limit=50):
    """
    Get notifications for a user
    If user_id is None, get broadcast notifications
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_id:
        cursor.execute('''
            SELECT * FROM notifications
            WHERE user_id = ? OR user_id IS NULL
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
    else:
        cursor.execute('''
            SELECT * FROM notifications
            WHERE user_id IS NULL
            ORDER BY created_at DESC
            LIMIT ?
        ''', (limit,))
    
    notifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return notifications

def mark_notification_read(notification_id):
    """
    Mark notification as read
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE notifications
        SET read_status = 1
        WHERE id = ?
    ''', (notification_id,))
    
    conn.commit()
    conn.close()
    
    return True
