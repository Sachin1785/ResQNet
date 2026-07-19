from flask import Blueprint, request, jsonify
from utils.kinesis_client import put_telemetry_record
from iot_database import get_iot_db_connection
from datetime import datetime

iot_bp = Blueprint('iot', __name__)

# ─────────────────────────────────────────────────────────────
#  POST /api/iot/stream  — Receive live data from Raspberry Pi
# ─────────────────────────────────────────────────────────────
@iot_bp.route('/iot/stream', methods=['POST'])
def handle_iot_stream():
    """
    Receives sensor data from ESP32 (via Raspberry Pi) and routes it to Kinesis.
    """
    data = request.get_json()
    system_id = data.get('system_id')

    if not system_id:
        return jsonify({'success': False, 'error': 'Missing system_id'}), 400

    # Enrich payload with routing information
    data['payload_type'] = 'iot_sensor'
    if 'timestamp' not in data:
        data['timestamp'] = datetime.utcnow().isoformat()

    # Publish to Kinesis Data Stream
    put_telemetry_record(system_id, data)

    return jsonify({'success': True, 'message': 'Payload streamed to ingestion buffer'}), 202


# ─────────────────────────────────────────────────────────────
#  GET /api/iot/configs — Fetch all node configurations
# ─────────────────────────────────────────────────────────────
@iot_bp.route('/iot/configs', methods=['GET'])
def get_iot_configs():
    conn = get_iot_db_connection()
    cur  = conn.cursor()
    cur.execute('SELECT * FROM iot_configs ORDER BY created_at DESC')
    configs = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify({'success': True, 'configs': configs})


# ─────────────────────────────────────────────────────────────
#  POST /api/iot/configs — Upsert a node configuration
# ─────────────────────────────────────────────────────────────
@iot_bp.route('/iot/configs', methods=['POST'])
def update_iot_config():
    data      = request.get_json()
    system_id = data.get('system_id')

    if not system_id:
        return jsonify({'success': False, 'error': 'Missing system_id'}), 400

    conn = get_iot_db_connection()
    cur  = conn.cursor()

    cur.execute('SELECT id FROM iot_configs WHERE system_id = %s', (system_id,))
    exists = cur.fetchone()
    now    = datetime.utcnow().isoformat()

    if exists:
        cur.execute('''
            UPDATE iot_configs
            SET name = %s, lat = %s, lng = %s, location_name = %s,
                threshold_gas = %s, threshold_temp = %s, threshold_water = %s,
                threshold_accl = %s, threshold_rain = %s, threshold_pressure = %s,
                updated_at = %s
            WHERE system_id = %s
        ''', (
            data.get('name'), data.get('lat'), data.get('lng'), data.get('location_name'),
            data.get('threshold_gas'), data.get('threshold_temp'), data.get('threshold_water'),
            data.get('threshold_accl'), data.get('threshold_rain'), data.get('threshold_pressure'),
            now, system_id
        ))
    else:
        cur.execute('''
            INSERT INTO iot_configs (
                system_id, name, lat, lng, location_name,
                threshold_gas, threshold_temp, threshold_water,
                threshold_accl, threshold_rain, threshold_pressure
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            system_id, data.get('name'), data.get('lat'), data.get('lng'),
            data.get('location_name'), data.get('threshold_gas', 2.5),
            data.get('threshold_temp', 50.0), data.get('threshold_water', 20.0),
            data.get('threshold_accl', 15.0), data.get('threshold_rain', 50.0),
            data.get('threshold_pressure', 1050.0)
        ))

    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ─────────────────────────────────────────────────────────────
#  GET /api/iot/logs/<system_id> — Fetch historical sensor data
# ─────────────────────────────────────────────────────────────
@iot_bp.route('/iot/logs/<system_id>', methods=['GET'])
def get_iot_logs(system_id):
    limit = request.args.get('limit', 100, type=int)
    conn  = get_iot_db_connection()
    cur   = conn.cursor()
    cur.execute('''
        SELECT * FROM iot_logs
        WHERE system_id = %s
        ORDER BY timestamp DESC
        LIMIT %s
    ''', (system_id, limit))
    logs = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify({'success': True, 'logs': logs})
