from flask import Blueprint, request, jsonify
from utils.notification_utils import (
    get_user_notifications,
    mark_notification_read,
    broadcast_incident_notification
)

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get notifications for user"""
    user_id = request.args.get('user_id', type=int)
    limit = request.args.get('limit', type=int, default=50)
    
    notifications = get_user_notifications(user_id, limit)
    
    # Count unread
    unread_count = sum(1 for n in notifications if not n['read_status'])
    
    return jsonify({
        'success': True,
        'notifications': notifications,
        'count': len(notifications),
        'unread_count': unread_count
    })

@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_read(notification_id):
    """Mark notification as read"""
    success = mark_notification_read(notification_id)
    
    return jsonify({
        'success': success,
        'notification_id': notification_id
    })

@notifications_bp.route('/notifications/broadcast', methods=['POST'])
def broadcast_notification():
    """Broadcast a notification to all users"""
    data = request.get_json()
    
    required_fields = ['title', 'message']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
    
    notification = broadcast_incident_notification(
        data.get('incident_id'),
        data['title'],
        data['message'],
        data.get('priority', 'medium')
    )
    
    return jsonify({
        'success': True,
        'notification': notification
    }), 201
