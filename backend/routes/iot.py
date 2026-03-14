from flask import Blueprint, request, jsonify, current_app
from iot_database import get_iot_db_connection
from database import get_db_connection       # Only used for incident creation
from datetime import datetime
import math

iot_bp = Blueprint('iot', __name__)

# ─────────────────────────────────────────────────────────────
#  POST /api/iot/stream  — Receive live data from Raspberry Pi
# ─────────────────────────────────────────────────────────────
@iot_bp.route('/iot/stream', methods=['POST'])
def handle_iot_stream():
    """
    Receives sensor data from ESP32 (via Raspberry Pi).

    Expected JSON:
    {
        "system_id":   "system1A",
        "temperature": 30.91,
        "pressure":    984.10,
        "altitude":    245.60,
        "accel_x":    -0.204,
        "accel_y":     0.065,
        "accel_z":    10.101,
        "gas_voltage": 1.96,
        "water_level": 2,
        "rain_level":  18,
        "timestamp":  "ISO_DATE"   (added by the Raspberry Pi gateway)
    }
    """
    data = request.get_json()
    system_id = data.get('system_id')

    if not system_id:
        return jsonify({'success': False, 'error': 'Missing system_id'}), 400

    # ── IoT DB: Read config / auto-register node ──────────────
    iot_conn = get_iot_db_connection()
    iot_cur  = iot_conn.cursor()

    iot_cur.execute('SELECT * FROM iot_configs WHERE system_id = ?', (system_id,))
    config = iot_cur.fetchone()

    if not config:
        iot_cur.execute('''
            INSERT INTO iot_configs (system_id, name, lat, lng, location_name)
            VALUES (?, ?, ?, ?, ?)
        ''', (system_id, f'Node {system_id}', 28.6139, 77.2090, 'Auto-detected Location'))
        iot_conn.commit()
        iot_cur.execute('SELECT * FROM iot_configs WHERE system_id = ?', (system_id,))
        config = iot_cur.fetchone()

    config = dict(config)

    # ── Compute Resultant Acceleration (m/s²) ────────────────
    ax = data.get('accel_x', 0)
    ay = data.get('accel_y', 0)
    az = data.get('accel_z', 0)
    resultant_accl = math.sqrt(ax**2 + ay**2 + az**2)

    # ── Handle Gas Reading (ppm or gas_voltage) ──────────────
    # New gateway uses 'ppm', legacy uses 'gas_voltage'
    gas_val = data.get('ppm') if 'ppm' in data else data.get('gas_voltage')
    if gas_val is None: gas_val = 0

    # ── IoT DB: Log raw reading ───────────────────────────────
    iot_cur.execute('''
        INSERT INTO iot_logs (
            system_id, gas, temp, water, accl,
            pressure, altitude, rain_level, accel_x, accel_y, accel_z
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        system_id,
        gas_val,
        data.get('temperature'),
        data.get('water_level'),
        round(resultant_accl, 3),
        data.get('pressure'),
        data.get('altitude'),
        data.get('rain_level'),
        ax, ay, az
    ))
    iot_conn.commit()
    iot_conn.close()   # ← Release IoT DB lock immediately

    # ── Threshold check ──────────────────────────────────────
    alerts_triggered = []

    # Gas Check (Detects leak if above threshold)
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

    # ── Main DB: Create/merge incidents (only if alert) ──────
    # This DB write is rare (only on threshold breach) so lock
    # contention here is minimal.
    if alerts_triggered:
        crisis_conn = get_db_connection()
        crisis_cur  = crisis_conn.cursor()

        for incident_type, alert_title, severity in alerts_triggered:
            crisis_cur.execute('''
                SELECT id, report_count FROM incidents
                WHERE type = ? AND system_id_source = ? AND status = 'active'
            ''', (incident_type, system_id))

            existing = crisis_cur.fetchone()

            if existing:
                new_count = (existing['report_count'] or 1) + 1
                
                # Check for 5-minute cooldown on timeline entries to prevent log flooding
                # SQLite CURRENT_TIMESTAMP is in UTC. We check if updated_at was > 5 mins ago.
                crisis_cur.execute('''
                    SELECT id FROM incidents 
                    WHERE id = ? AND updated_at < datetime('now', '-5 minutes')
                ''', (existing['id'],))
                should_add_timeline = crisis_cur.fetchone() is not None or existing['report_count'] == 1

                crisis_cur.execute('''
                    UPDATE incidents SET report_count = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (new_count, existing['id']))
                
                if should_add_timeline:
                    crisis_cur.execute('''
                        INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
                        VALUES (?, 'sensor_update', ?, 'IoT System')
                    ''', (existing['id'], f'Ongoing alert: {alert_title} (detected {new_count} times)'))
            else:
                crisis_cur.execute('''
                    INSERT INTO incidents (
                        title, description, type, severity, status,
                        lat, lng, location_name, report_source, system_id_source, report_count
                    ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 'iot_sensor', ?, 1)
                ''', (
                    f'SENSORS: {alert_title} ({system_id})',
                    f'Automated alert from sensor {system_id} at {config["location_name"]}.',
                    incident_type, severity,
                    config['lat'], config['lng'], config['location_name'], system_id
                ))
                new_id = crisis_cur.lastrowid
                crisis_cur.execute('''
                    INSERT INTO incident_timeline (incident_id, event_type, description, user_name)
                    VALUES (?, 'incident_created', ?, 'IoT System')
                ''', (new_id, f'Incident auto-detected by sensor {system_id}'))

        crisis_conn.commit()
        crisis_conn.close()  # ← Release main DB lock immediately

    # ── WebSocket: Broadcast live data to dashboard ──────────
    if hasattr(current_app, 'broadcast_event'):
        current_app.broadcast_event('iot_data_stream', {
            'system_id':  system_id,
            'name':       config['name'],
            'values': {
                'gas':      gas_val,
                'gas_unit': 'ppm' if 'ppm' in data else 'V',
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

    return jsonify({'success': True, 'alerts_triggered': len(alerts_triggered)}), 200


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

    cur.execute('SELECT id FROM iot_configs WHERE system_id = ?', (system_id,))
    exists = cur.fetchone()
    now    = datetime.utcnow().isoformat()

    if exists:
        cur.execute('''
            UPDATE iot_configs
            SET name = ?, lat = ?, lng = ?, location_name = ?,
                threshold_gas = ?, threshold_temp = ?, threshold_water = ?,
                threshold_accl = ?, threshold_rain = ?, threshold_pressure = ?,
                updated_at = ?
            WHERE system_id = ?
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        WHERE system_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (system_id, limit))
    logs = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify({'success': True, 'logs': logs})
