import psycopg2
from psycopg2 import pool
from psycopg2.extensions import cursor
import os
from datetime import datetime
from config import Config

# Custom row representation to behave exactly like sqlite3.Row
class PostgresRow(dict):
    def __init__(self, description, values):
        self._keys = [desc[0] for desc in description]
        self._values = values
        super().__init__(zip(self._keys, values))

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)

# Custom cursor to return PostgresRow instead of plain tuple
class PostgresRowCursor(cursor):
    def execute(self, query, vars=None):
        if query and isinstance(query, str):
            # Transparently convert SQLite style "?" placeholders to PostgreSQL "%s" format
            query = query.replace('?', '%s')
        return super().execute(query, vars)

    def executemany(self, query, vars_list):
        if query and isinstance(query, str):
            # Transparently convert SQLite style "?" placeholders to PostgreSQL "%s" format
            query = query.replace('?', '%s')
        return super().executemany(query, vars_list)

    def fetchone(self):
        row = super().fetchone()
        if row is None:
            return None
        return PostgresRow(self.description, row)

    def fetchall(self):
        rows = super().fetchall()
        if rows is None:
            return []
        return [PostgresRow(self.description, row) for row in rows]

    def fetchmany(self, size=None):
        rows = super().fetchmany(size)
        if rows is None:
            return []
        return [PostgresRow(self.description, row) for row in rows]

# Connection pool
db_pool = None

def get_db_connection():
    """Create and return a PostgreSQL database connection from the pool"""
    global db_pool
    if db_pool is None:
        # Create connection pool
        db_pool = pool.ThreadedConnectionPool(1, 30, dsn=Config.DATABASE_URI)
        
    conn = db_pool.getconn()
    
    # Configure custom cursor factory by default
    conn.cursor_factory = PostgresRowCursor
    
    # Override close method to return connection to the pool
    original_close = conn.close
    def release_to_pool():
        if db_pool:
            db_pool.putconn(conn)
    conn.close = release_to_pool
    
    return conn

def init_db():
    """Initialize the database with all required tables and compatibility functions"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create compatibility functions for SQLite compatibility (datetime)
    cursor.execute('''
        CREATE OR REPLACE FUNCTION datetime(val text) RETURNS timestamp AS $$
        BEGIN
            IF val = 'now' THEN
                RETURN NOW();
            END IF;
            RETURN val::timestamp;
        END;
        $$ LANGUAGE plpgsql;
    ''')
    
    cursor.execute('''
        CREATE OR REPLACE FUNCTION datetime(val text, modifier text) RETURNS timestamp AS $$
        DECLARE
            amt integer;
        BEGIN
            IF modifier LIKE '-% minutes' THEN
                amt := substring(modifier from '-([0-9]+)')::integer;
                RETURN NOW() - (amt || ' minutes')::interval;
            END IF;
            RETURN NOW();
        END;
        $$ LANGUAGE plpgsql;
    ''')
    
    # 2. Users table for authentication
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL CHECK(role IN ('user', 'responder')),
            email VARCHAR(255),
            phone VARCHAR(50),
            avatar TEXT,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # 3. Incidents table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(100) NOT NULL,
            severity VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL,
            location_name VARCHAR(255),
            report_source VARCHAR(100),
            reported_by INTEGER,
            reporter_phone VARCHAR(50),
            victims_count INTEGER DEFAULT 0,
            report_count INTEGER DEFAULT 1,
            sosmesh_messages TEXT,
            is_verified INTEGER DEFAULT 0,
            verification_score INTEGER DEFAULT 0,
            ai_analysis TEXT,
            system_id_source VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP
        )
    ''')
    
    # 4. Personnel table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS personnel (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            assigned_incident_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (assigned_incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # 5. Resources table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS resources (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            lat DOUBLE PRECISION DEFAULT 0,
            lng DOUBLE PRECISION DEFAULT 0,
            is_public BOOLEAN DEFAULT FALSE,
            assigned_incident_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # 6. Communications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS communications (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER,
            sender_id INTEGER,
            sender_name VARCHAR(255),
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'text',
            read_status BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )
    ''')
    
    # 7. Alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER,
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL,
            radius DOUBLE PRECISION NOT NULL,
            message TEXT NOT NULL,
            severity VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # 8. Incident timeline/history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_timeline (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            user_id INTEGER,
            user_name VARCHAR(255),
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # 9. File attachments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attachments (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER NOT NULL,
            filename VARCHAR(255) NOT NULL,
            filepath TEXT NOT NULL,
            file_type VARCHAR(100) NOT NULL,
            file_size INTEGER,
            uploaded_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # 10. Geofence zones table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS geofence_zones (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER,
            name VARCHAR(255) NOT NULL,
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL,
            radius DOUBLE PRECISION NOT NULL,
            zone_type VARCHAR(100) NOT NULL,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # 11. Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            incident_id INTEGER,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(100) NOT NULL,
            priority VARCHAR(50) NOT NULL,
            read_status BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # 12. IoT Configs table for thresholds and locations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS iot_configs (
            id SERIAL PRIMARY KEY,
            system_id VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255),
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            location_name VARCHAR(255),
            threshold_gas DOUBLE PRECISION DEFAULT 2.5,
            threshold_temp DOUBLE PRECISION DEFAULT 50.0,
            threshold_water DOUBLE PRECISION DEFAULT 20.0,
            threshold_accl DOUBLE PRECISION DEFAULT 15.0,
            threshold_rain DOUBLE PRECISION DEFAULT 50.0,
            threshold_pressure DOUBLE PRECISION DEFAULT 1050.0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 13. IoT Logs table for historical sensor data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS iot_logs (
            id SERIAL PRIMARY KEY,
            system_id VARCHAR(100) NOT NULL,
            gas DOUBLE PRECISION,
            temp DOUBLE PRECISION,
            water DOUBLE PRECISION,
            accl DOUBLE PRECISION,
            pressure DOUBLE PRECISION,
            altitude DOUBLE PRECISION,
            rain_level DOUBLE PRECISION,
            accel_x DOUBLE PRECISION,
            accel_y DOUBLE PRECISION,
            accel_z DOUBLE PRECISION,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES iot_configs(system_id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ PostgreSQL Database initialized successfully!")

def seed_sample_data():
    """Seed database with ONLY user accounts for authentication"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if users already exist
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] > 0:
        print("⚠️  Users already exist. Skipping seed.")
        conn.close()
        return
    
    print("🌱 Seeding user accounts...")
    
    # Sample users (3 regular users)
    users = [
        ('user1', 'password123', 'Command Center Admin', 'user', 'admin@crisis.com', '+91-9876543210'),
        ('user2', 'password123', 'Operations Manager', 'user', 'ops@crisis.com', '+91-9876543211'),
        ('user3', 'password123', 'Dispatch Coordinator', 'user', 'dispatch@crisis.com', '+91-9876543212'),
    ]
    
    cursor.executemany('''
        INSERT INTO users (username, password, name, role, email, phone)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', users)
    
    # Sample responders (5 responders)
    responders = [
        ('responder1', 'password123', 'Firefighter John', 'responder', 'john@crisis.com', '+91-9876543220'),
        ('responder2', 'password123', 'Paramedic Sarah', 'responder', 'sarah@crisis.com', '+91-9876543221'),
        ('responder3', 'password123', 'Officer Mike', 'responder', 'mike@crisis.com', '+91-9876543222'),
        ('responder4', 'password123', 'Hazmat Specialist Lisa', 'responder', 'lisa@crisis.com', '+91-9876543223'),
        ('responder5', 'password123', 'EMT David', 'responder', 'david@crisis.com', '+91-9876543224'),
    ]
    
    cursor.executemany('''
        INSERT INTO users (username, password, name, role, email, phone)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', responders)
    
    conn.commit()
    conn.close()
    print(f"✅ Seeding completed.")

if __name__ == '__main__':
    init_db()
    seed_sample_data()
