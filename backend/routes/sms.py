from flask import Blueprint, request, jsonify, current_app
from database import get_db_connection
from datetime import datetime
import requests
from twilio.twiml.messaging_response import MessagingResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

sms_bp = Blueprint('sms', __name__)

def geocode_location(location_name):
    """
    Try to geocode a location string using Nominatim (OpenStreetMap).
    Returns (lat, lng) or (default_lat, default_lng)
    """
    if not location_name:
        return 28.6139, 77.2090 # Delhi default
        
    try:
        # User-Agent is required for Nominatim
        headers = {'User-Agent': 'Hackfusion-Crisis-Management/1.0'}
        url = f"https://nominatim.openstreetmap.org/search?q={location_name}&format=json&limit=1"
        response = requests.get(url, headers=headers, timeout=5)
        data = response.json()
        
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Geocoding error for '{location_name}': {e}")
        
    # Return Delhi default if geocoding fails
    return 28.6139, 77.2090

def parse_sms_content(body):
    """
    Extremely simple NLP to extract incident type and location.
    Format expected: [Type] at [Location]. [Details]
    Example: 'Fire at Connaught Place. 3rd floor.'
    """
    body_lower = body.lower()
    
    # Identify type
    incident_type = "general"
    if "fire" in body_lower: incident_type = "fire"
    elif "accident" in body_lower or "crash" in body_lower: incident_type = "accident"
    elif "medical" in body_lower or "ambulance" in body_lower or "sick" in body_lower: incident_type = "medical"
    elif "rescue" in body_lower or "trapped" in body_lower: incident_type = "rescue"
    
    # Simple split for location if 'at' is present
    location_name = "Unknown Location"
    if " at " in body_lower:
        parts = body.split(" at ", 1)
        # Type might be before 'at', location after
        location_name = parts[1].split(".", 1)[0].strip()
    else:
        # Just use the whole thing as description and set unknown location
        location_name = "SMS Reported Location"

    # Severity inference
    severity = "medium"
    if any(word in body_lower for word in ["urgent", "critical", "dying", "trapped", "huge", "help me"]):
        severity = "high"
    elif any(word in body_lower for word in ["small", "minor"]):
        severity = "low"

    return {
        'type': incident_type,
        'location_name': location_name,
        'severity': severity,
        'title': f"SMS: {incident_type.capitalize()} Report",
        'description': body
    }

@sms_bp.route('/sms/webhook', methods=['POST'])
def sms_webhook():
    """Twilio SMS Webhook handler"""
    # Twilio sends data as Form URL Encoded
    incoming_msg = request.values.get('Body', '').strip()
    from_number = request.values.get('From', 'Unknown')
    
    if not incoming_msg:
        return str(MessagingResponse().message("Please provide incident details."))

    # Parse content
    incident_data = parse_sms_content(incoming_msg)
    
    # Geocode
    lat, lng = geocode_location(incident_data['location_name'])
    
    # Save to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO incidents (
                title, description, type, severity, status, 
                lat, lng, location_name, report_source, reporter_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            incident_data['title'],
            incident_data['description'],
            incident_data['type'],
            incident_data['severity'],
            'active',
            lat,
            lng,
            incident_data['location_name'],
            'SMS',
            from_number
        ))
        
        incident_id = cursor.lastrowid
        
        # Add timeline event
        cursor.execute('''
            INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
            VALUES (?, ?, ?, ?)
        ''', (
            incident_id,
            'incident_created',
            f'Incident reported via SMS from {from_number}',
            'System (SMS Gateway)'
        ))
        
        conn.commit()
    except Exception as e:
        print(f"Database error saving SMS incident: {e}")
        conn.rollback()
        conn.close()
        return str(MessagingResponse().message("Error processing report. Please try again."))

    # Broadcast via WebSocket
    if hasattr(current_app, 'broadcast_event'):
        current_app.broadcast_event('incident_created', {
            'id': incident_id,
            'title': incident_data['title'],
            'type': incident_data['type'],
            'severity': incident_data['severity'],
            'location': {'lat': lat, 'lng': lng},
            'location_name': incident_data['location_name'],
            'status': 'active',
            'report_source': 'SMS'
        })

    conn.close()

    # Respond with TwiML
    resp = MessagingResponse()
    resp.message(f"Report received. Incident #{incident_id} created. Emergency services alerted.")
    
    return str(resp)
