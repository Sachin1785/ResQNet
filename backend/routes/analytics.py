from flask import Blueprint, request, jsonify
from utils.analytics_utils import (
    get_dashboard_analytics,
    get_incident_statistics,
    get_personnel_efficiency,
    get_resource_utilization,
    calculate_response_time
)

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get comprehensive dashboard analytics"""
    analytics = get_dashboard_analytics()
    
    return jsonify({
        'success': True,
        'analytics': analytics
    })

@analytics_bp.route('/analytics/incidents', methods=['GET'])
def get_incident_analytics():
    """Get incident-specific analytics"""
    time_period = request.args.get('days', type=int, default=30)
    
    stats = get_incident_statistics(time_period)
    
    return jsonify({
        'success': True,
        'statistics': stats
    })

@analytics_bp.route('/analytics/personnel', methods=['GET'])
def get_personnel_analytics():
    """Get personnel efficiency analytics"""
    efficiency = get_personnel_efficiency()
    
    return jsonify({
        'success': True,
        'efficiency': efficiency
    })

@analytics_bp.route('/analytics/resources', methods=['GET'])
def get_resource_analytics():
    """Get resource utilization analytics"""
    utilization = get_resource_utilization()
    
    return jsonify({
        'success': True,
        'utilization': utilization
    })

@analytics_bp.route('/analytics/response-time/<int:incident_id>', methods=['GET'])
def get_incident_response_time(incident_id):
    """Get response time for a specific incident"""
    response_time = calculate_response_time(incident_id)
    
    if response_time is None:
        return jsonify({
            'success': False,
            'error': 'Could not calculate response time'
        }), 404
    
    return jsonify({
        'success': True,
        'incident_id': incident_id,
        'response_time_minutes': response_time
    })
