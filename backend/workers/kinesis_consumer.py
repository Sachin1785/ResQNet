import os
import sys
import time
import json
import math
import boto3
from datetime import datetime

# Add parent directory to path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config import Config
from database import get_db_connection
from iot_database import get_iot_db_connection
from flask_socketio import SocketIO

# External SocketIO emitter using Redis
socketio_emitter = SocketIO(message_queue=Config.REDIS_URL)

def get_kinesis_client():
    return boto3.client('kinesis', region_name=Config.AWS_REGION)

def process_iot_sensor(data):
    system_id = data.get('system_id')
    if not system_id:
        return

    print(f"📡 Processing IoT stream for system: {system_id}")
    
    # 1. Read config / auto-register node
    iot_conn = get_iot_db_connection()
    iot_cur  = iot_conn.cursor()

    iot_cur.execute('SELECT * FROM iot_configs WHERE system_id = %s', (system_id,))
    config = iot_cur.fetchone()

    if not config:
        iot_cur.execute('''
            INSERT INTO iot_configs (system_id, name, lat, lng, location_name)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (system_id) DO NOTHING
        ''', (system_id, f'Node {system_id}', 28.6139, 77.2090, 'Auto-detected Location'))
        iot_conn.commit()
        iot_cur.execute('SELECT * FROM iot_configs WHERE system_id = %s', (system_id,))
        config = iot_cur.fetchone()

    config = dict(config)

    # 2. Compute Resultant Acceleration
    ax = data.get('accel_x', 0)
    ay = data.get('accel_y', 0)
    az = data.get('accel_z', 0)
    resultant_accl = math.sqrt(ax**2 + ay**2 + az**2)

    # 3. Handle Gas Reading
    gas_val = data.get('ppm') if 'ppm' in data else data.get('gas_voltage')
    if gas_val is None: 
        gas_val = 0

    # 4. Threshold checks
    alerts_triggered = []
    if gas_val > config['threshold_gas']:
        alerts_triggered.append(('fire', 'Gas Leak / Fire Hazard', 'critical'))
    if data.get('temperature', 0) > config['threshold_temp']:
        alerts_triggered.append(('fire', 'Critical High Temperature', 'high'))
    if data.get('water_level', 0) > config['threshold_water']:
        alerts_triggered.append(('natural_disaster', 'Flood Detection', 'high'))
    if resultant_accl > config['threshold_accl']:
        alerts_triggered.append(('natural_disaster', 'Seismic Activity / Earthquake', 'critical'))
    if data.get('rain_level', 0) > config['threshold_rain']:
        alerts_triggered.append(('natural_disaster', 'Heavy Rain Alert', 'medium'))

    # 5. Log Throttling & Saving to DB
    has_alert = len(alerts_triggered) > 0
    throttle_seconds = 10 if has_alert else 120 
    
    try:
        if config.get('updated_at'):
            # Handle ISO timestamp conversions
            ts_str = str(config['updated_at']).replace(' ', 'T')
            # Extract main date time part
            if '.' in ts_str:
                ts_str = ts_str.split('.')[0]
            last_updated = datetime.fromisoformat(ts_str)
        else:
            last_updated = datetime.min
    except Exception:
        last_updated = datetime.min
        
    time_since_last = (datetime.utcnow() - last_updated).total_seconds()

    if time_since_last >= throttle_seconds:
        # Log raw reading to iot_logs
        iot_cur.execute('''
            INSERT INTO iot_logs (
                system_id, gas, temp, water, accl,
                pressure, altitude, rain_level, accel_x, accel_y, accel_z
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            system_id, gas_val, data.get('temperature'), data.get('water_level'),
            round(resultant_accl, 3), data.get('pressure'), data.get('altitude'),
            data.get('rain_level'), ax, ay, az
        ))
        
        # Update config timestamp
        iot_cur.execute('UPDATE iot_configs SET updated_at = NOW() WHERE system_id = %s', (system_id,))
        iot_conn.commit()
    
    iot_conn.close()

    # 6. Create or merge incidents if alert triggered
    if alerts_triggered:
        crisis_conn = get_db_connection()
        crisis_cur  = crisis_conn.cursor()

        for incident_type, alert_title, severity in alerts_triggered:
            crisis_cur.execute('''
                SELECT id, report_count FROM incidents
                WHERE type = %s AND system_id_source = %s AND status = 'active'
            ''', (incident_type, system_id))

            existing = crisis_cur.fetchone()

            if existing:
                new_count = (existing['report_count'] or 1) + 1
                
                # Check for cooldown (1 minute) before updating incident count in DB
                crisis_cur.execute('''
                    SELECT id FROM incidents 
                    WHERE id = %s AND updated_at < NOW() - INTERVAL '1 minute'
                ''', (existing['id'],))
                can_update_main = crisis_cur.fetchone() is not None or existing['report_count'] == 1

                if can_update_main:
                    crisis_cur.execute('''
                        UPDATE incidents SET report_count = %s, updated_at = NOW()
                        WHERE id = %s
                    ''', (new_count, existing['id']))
                
                # Cooldown (5 minutes) for timeline updates
                crisis_cur.execute('''
                    SELECT id FROM incidents 
                    WHERE id = %s AND updated_at < NOW() - INTERVAL '5 minutes'
                ''', (existing['id'],))
                should_add_timeline = crisis_cur.fetchone() is not None or existing['report_count'] == 1

                if should_add_timeline:
                    crisis_cur.execute('''
                        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
                        VALUES (%s, 'sensor_update', %s, 'IoT System')
                    ''', (existing['id'], f'Ongoing alert: {alert_title} (detected {new_count} times)'))
            else:
                # Create brand new incident
                crisis_cur.execute('''
                    INSERT INTO incidents (
                        title, description, type, severity, status,
                        lat, lng, location_name, report_source, system_id_source, report_count
                    ) VALUES (%s, %s, %s, %s, 'active', %s, %s, %s, 'iot_sensor', %s, 1)
                    RETURNING id
                ''', (
                    f'SENSORS: {alert_title} ({system_id})',
                    f'Automated alert from sensor {system_id} at {config["location_name"]}.',
                    incident_type, severity,
                    config['lat'], config['lng'], config['location_name'], system_id
                ))
                new_id = crisis_cur.fetchone()[0]
                
                crisis_cur.execute('''
                    INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
                    VALUES (%s, 'incident_created', %s, 'IoT System')
                ''', (new_id, f'Incident auto-detected by sensor {system_id}'))

        crisis_conn.commit()
        crisis_conn.close()

    # 7. Broadcast live data to dashboard via Redis SocketIO pub/sub
    socketio_emitter.emit('iot_data_stream', {
        'system_id':  system_id,
        'name':       config['name'],
        'values': {
            'gas':      gas_val,
            'gas_unit': data.get('gas_unit', 'V'),
            'temp':     data.get('temperature'),
            'water':    data.get('water_level'),
            'accl':     round(resultant_accl, 3),
            'pressure': data.get('pressure'),
            'altitude': data.get('altitude'),
            'rain':     data.get('rain_level'),
            'accel_x':  ax,
            'accel_y':  ay,
            'accel_z':  az
        },
        'alerts':    [a[1] for a in alerts_triggered],
        'location': {
            'lat':  config['lat'],
            'lng':  config['lng'],
            'name': config['location_name']
        },
        'timestamp': datetime.utcnow().isoformat()
    })

def process_location_update(data):
    personnel_id = data.get('personnel_id')
    lat = data.get('lat')
    lng = data.get('lng')
    
    if not personnel_id or not lat or not lng:
        return
        
    print(f"📍 Processing location update for personnel: {personnel_id} ({lat}, {lng})")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Update personnel location in DB
    cursor.execute('''
        UPDATE personnel
        SET lat = %s, lng = %s, updated_at = NOW()
        WHERE id = %s
    ''', (lat, lng, personnel_id))
    
    # Fetch current state to broadcast
    cursor.execute('SELECT * FROM personnel WHERE id = %s', (personnel_id,))
    person = cursor.fetchone()
    
    conn.commit()
    conn.close()
    
    if not person:
        return
        
    person = dict(person)
    
    # Broadcast location update via Redis SocketIO
    socketio_emitter.emit('personnel_location_updated', {
        'personnel_id': personnel_id,
        'name': person['name'],
        'location': {'lat': lat, 'lng': lng},
        'status': person['status']
    })
    
    # Broadcast to specific incident room if assigned
    if person.get('assigned_incident_id'):
        socketio_emitter.emit('personnel_location_updated', {
            'personnel_id': personnel_id,
            'name': person['name'],
            'location': {'lat': lat, 'lng': lng},
            'status': person['status']
        }, room=f'incident_{person["assigned_incident_id"]}')

def main():
    print("🚀 Starting ResQNet AWS Kinesis Consumer Worker...")
    client = get_kinesis_client()
    
    # Wait for stream to become active
    while True:
        try:
            desc = client.describe_stream(StreamName=Config.KINESIS_STREAM_NAME)
            status = desc['StreamDescription']['StreamStatus']
            if status == 'ACTIVE':
                print(f"✅ Kinesis stream '{Config.KINESIS_STREAM_NAME}' is ACTIVE.")
                break
            print(f"⏳ Waiting for Kinesis stream to become active (status: {status})...")
            time.sleep(2)
        except client.exceptions.ResourceNotFoundException:
            print(f"❌ Kinesis stream '{Config.KINESIS_STREAM_NAME}' not found. Please create it or wait for Terraform to provision it.")
            time.sleep(5)
        except Exception as e:
            print(f"⚠️ Error checking stream status: {e}")
            time.sleep(5)
            
    # Get shard iterators (assuming 1 shard for development/single-shard setup)
    shards = desc['StreamDescription']['Shards']
    shard_id = shards[0]['ShardId']
    
    iterator_resp = client.get_shard_iterator(
        StreamName=Config.KINESIS_STREAM_NAME,
        ShardId=shard_id,
        ShardIteratorType='LATEST'
    )
    shard_iterator = iterator_resp['ShardIterator']
    
    print("🎧 Listening for telemetry records on Kinesis stream...")
    
    while True:
        try:
            records_resp = client.get_records(ShardIterator=shard_iterator, Limit=100)
            records = records_resp.get('Records', [])
            
            for record in records:
                try:
                    payload = json.loads(record['Data'].decode('utf-8'))
                    payload_type = payload.get('payload_type')
                    
                    if payload_type == 'iot_sensor':
                        process_iot_sensor(payload)
                    elif payload_type == 'location_update':
                        process_location_update(payload)
                    else:
                        print(f"⚠️ Unknown payload type received: {payload_type}")
                except Exception as e:
                    print(f"❌ Error processing record: {e}")
                    
            shard_iterator = records_resp.get('NextShardIterator')
            if not shard_iterator:
                # Re-fetch iterator if it expired
                iterator_resp = client.get_shard_iterator(
                    StreamName=Config.KINESIS_STREAM_NAME,
                    ShardId=shard_id,
                    ShardIteratorType='LATEST'
                )
                shard_iterator = iterator_resp['ShardIterator']
                
            time.sleep(1) # Rate limit polling Kinesis to avoid throttling (1 GetRecords per second)
        except Exception as e:
            print(f"⚠️ Error in consumer loop: {e}")
            time.sleep(5)

if __name__ == '__main__':
    main()
