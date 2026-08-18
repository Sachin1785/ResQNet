import sqlite3
from datetime import datetime
from config import Config

def get_iot_db_connection():
    """Create and return a database connection to the IoT sensor database with WAL mode enabled"""
    conn = sqlite3.connect(Config.IOT_DATABASE_PATH, timeout=30)
    # Enable Write-Ahead Logging (WAL) for better concurrency
    conn.execute('PRAGMA journal_mode=WAL')
    # Extra safety for busy timeouts
    conn.execute('PRAGMA busy_timeout=30000')
    conn.row_factory = sqlite3.Row
    return conn

def init_iot_db():
    """Initialize the IoT database with all required tables"""
    conn = get_iot_db_connection()
    cursor = conn.cursor()
    
    # IoT configurations table
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
    ''')
    
    # IoT logs table
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
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(system_id) REFERENCES iot_configs(system_id)
        )
    ''')
    
    conn.commit()
    conn.close()
