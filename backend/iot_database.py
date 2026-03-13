import sqlite3
from config import Config

def get_iot_db_connection():
    """
    Returns a connection to the DEDICATED IoT sensor database.
    This is isolated from crisis_management.db to prevent lock contention.
    Both databases can now read/write fully independently.
    """
    conn = sqlite3.connect(Config.IOT_DATABASE_PATH, timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=10000')
    conn.execute('PRAGMA synchronous=NORMAL')
    conn.row_factory = sqlite3.Row
    return conn

def init_iot_db():
    """Initialize the IoT sensor database with its tables."""
    conn = get_iot_db_connection()
    cursor = conn.cursor()

    # IoT Configs table — per-node threshold and location settings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS iot_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            system_id TEXT UNIQUE NOT NULL,
            name TEXT,
            lat REAL,
            lng REAL,
            location_name TEXT,
            threshold_gas REAL DEFAULT 2.5,
            threshold_temp REAL DEFAULT 50.0,
            threshold_water REAL DEFAULT 20.0,
            threshold_accl REAL DEFAULT 15.0,
            threshold_rain REAL DEFAULT 50.0,
            threshold_pressure REAL DEFAULT 1050.0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # IoT Logs table — high-frequency raw sensor readings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS iot_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            system_id TEXT NOT NULL,
            gas REAL,
            temp REAL,
            water REAL,
            accl REAL,
            pressure REAL,
            altitude REAL,
            rain_level REAL,
            accel_x REAL,
            accel_y REAL,
            accel_z REAL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    print("✅ IoT sensor database initialized: iot_sensors.db")
