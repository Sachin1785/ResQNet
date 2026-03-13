from datetime import datetime, timedelta
from database import get_db_connection

def calculate_response_time(incident_id):
    """
    Calculate response time for an incident
    Returns time in minutes from creation to first personnel arrival
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get incident creation time
    cursor.execute('SELECT created_at FROM incidents WHERE id = ?', (incident_id,))
    incident = cursor.fetchone()
    
    if not incident:
        return None
    
    # Get first "arrived" timeline event
    cursor.execute('''
        SELECT created_at FROM incident_timeline 
        WHERE incident_id = ? AND event_type IN ('personnel_arrived', 'status_update')
        ORDER BY created_at ASC LIMIT 1
    ''', (incident_id,))
    
    arrival = cursor.fetchone()
    conn.close()
    
    if not arrival:
        return None
    
    created = datetime.fromisoformat(incident['created_at'])
    arrived = datetime.fromisoformat(arrival['created_at'])
    
    response_time = (arrived - created).total_seconds() / 60
    return round(response_time, 2)

def get_incident_statistics(time_period_days=30):
    """
    Get comprehensive incident statistics
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cutoff_date = datetime.now() - timedelta(days=time_period_days)
    
    # Total incidents
    cursor.execute('''
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
               SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
               SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical
        FROM incidents
        WHERE created_at >= ?
    ''', (cutoff_date.isoformat(),))
    
    incident_stats = dict(cursor.fetchone())
    
    # Incidents by type
    cursor.execute('''
        SELECT type, COUNT(*) as count
        FROM incidents
        WHERE created_at >= ?
        GROUP BY type
        ORDER BY count DESC
    ''', (cutoff_date.isoformat(),))
    
    incidents_by_type = [dict(row) for row in cursor.fetchall()]
    
    # Incidents by severity
    cursor.execute('''
        SELECT severity, COUNT(*) as count
        FROM incidents
        WHERE created_at >= ?
        GROUP BY severity
    ''', (cutoff_date.isoformat(),))
    
    incidents_by_severity = [dict(row) for row in cursor.fetchall()]
    
    # Average response time
    cursor.execute('''
        SELECT AVG(
            (julianday(t.created_at) - julianday(i.created_at)) * 24 * 60
        ) as avg_response_time
        FROM incidents i
        JOIN incident_timeline t ON i.id = t.incident_id
        WHERE i.created_at >= ?
        AND t.event_type IN ('personnel_arrived', 'status_update')
        AND t.created_at = (
            SELECT MIN(created_at) FROM incident_timeline 
            WHERE incident_id = i.id 
            AND event_type IN ('personnel_arrived', 'status_update')
        )
    ''', (cutoff_date.isoformat(),))
    
    avg_response = cursor.fetchone()
    avg_response_time = round(avg_response['avg_response_time'], 2) if avg_response['avg_response_time'] else 0

    # Average resolution time (Creation to Resolved status)
    cursor.execute('''
        SELECT AVG(
            (julianday(resolved_at) - julianday(created_at)) * 24 * 60
        ) as avg_resolution_time
        FROM incidents
        WHERE created_at >= ? AND status = 'resolved' AND resolved_at IS NOT NULL
    ''', (cutoff_date.isoformat(),))
    
    avg_res = cursor.fetchone()
    avg_resolution_time = round(avg_res['avg_resolution_time'], 2) if avg_res['avg_resolution_time'] else 0
    
    conn.close()
    
    return {
        'incident_stats': incident_stats,
        'incidents_by_type': incidents_by_type,
        'incidents_by_severity': incidents_by_severity,
        'avg_response_time_minutes': avg_response_time,
        'avg_resolution_time_minutes': avg_resolution_time,
        'time_period_days': time_period_days
    }

def get_personnel_efficiency():
    """
    Calculate personnel efficiency metrics
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Personnel by status
    cursor.execute('''
        SELECT status, COUNT(*) as count
        FROM personnel
        GROUP BY status
    ''')
    
    personnel_by_status = [dict(row) for row in cursor.fetchall()]
    
    # Personnel by role
    cursor.execute('''
        SELECT role, COUNT(*) as count,
               SUM(CASE WHEN status = 'on-scene' THEN 1 ELSE 0 END) as active
        FROM personnel
        GROUP BY role
    ''')
    
    personnel_by_role = [dict(row) for row in cursor.fetchall()]
    
    # Active assignments
    cursor.execute('''
        SELECT COUNT(DISTINCT assigned_incident_id) as active_assignments
        FROM personnel
        WHERE assigned_incident_id IS NOT NULL
    ''')
    
    active_assignments = cursor.fetchone()['active_assignments']
    
    conn.close()
    
    return {
        'personnel_by_status': personnel_by_status,
        'personnel_by_role': personnel_by_role,
        'active_assignments': active_assignments
    }

def get_resource_utilization():
    """
    Calculate resource utilization metrics
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Resources by status
    cursor.execute('''
        SELECT status, COUNT(*) as count
        FROM resources
        GROUP BY status
    ''')
    
    resources_by_status = [dict(row) for row in cursor.fetchall()]
    
    # Resources by type
    cursor.execute('''
        SELECT type, COUNT(*) as count,
               SUM(CASE WHEN status = 'deployed' THEN 1 ELSE 0 END) as deployed
        FROM resources
        GROUP BY type
    ''')
    
    resources_by_type = [dict(row) for row in cursor.fetchall()]
    
    # Total resources
    cursor.execute('SELECT COUNT(*) as total FROM resources')
    total_resources = cursor.fetchone()['total']
    
    # Deployed resources
    cursor.execute('SELECT COUNT(*) as deployed FROM resources WHERE status = ?', ('deployed',))
    deployed_resources = cursor.fetchone()['deployed']
    
    utilization_rate = (deployed_resources / total_resources * 100) if total_resources > 0 else 0
    
    conn.close()
    
    return {
        'resources_by_status': resources_by_status,
        'resources_by_type': resources_by_type,
        'total_resources': total_resources,
        'deployed_resources': deployed_resources,
        'utilization_rate': round(utilization_rate, 2)
    }

def get_dashboard_analytics():
    """
    Get comprehensive analytics for dashboard
    """
    return {
        'incidents': get_incident_statistics(),
        'personnel': get_personnel_efficiency(),
        'resources': get_resource_utilization()
    }
