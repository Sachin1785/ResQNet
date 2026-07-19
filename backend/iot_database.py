from database import get_db_connection

def get_iot_db_connection():
    """
    Returns a database connection for IoT sensors.
    Since we migrated to PostgreSQL, we no longer need a separate database file
    for IoT. The connection pool handles concurrency natively.
    """
    return get_db_connection()

def init_iot_db():
    """
    No-op since init_db in database.py already initializes 
    iot_configs and iot_logs tables.
    """
    pass
