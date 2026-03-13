import sqlite3
import os

db_path = "crisis_management.db"

def migrate():
    if not os.path.exists(db_path):
        print("❌ Database file not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Update iot_configs
    new_config_cols = [
        ("threshold_rain", "REAL DEFAULT 50.0"),
        ("threshold_pressure", "REAL DEFAULT 1050.0")
    ]
    
    for col_name, col_type in new_config_cols:
        try:
            cursor.execute(f"ALTER TABLE iot_configs ADD COLUMN {col_name} {col_type}")
            print(f"✅ Added {col_name} to iot_configs.")
        except sqlite3.OperationalError:
            print(f"⚠️ {col_name} already exists in iot_configs.")

    # 2. Update iot_logs
    new_log_cols = [
        ("pressure", "REAL"),
        ("altitude", "REAL"),
        ("rain_level", "REAL"),
        ("accel_x", "REAL"),
        ("accel_y", "REAL"),
        ("accel_z", "REAL")
    ]
    
    for col_name, col_type in new_log_cols:
        try:
            cursor.execute(f"ALTER TABLE iot_logs ADD COLUMN {col_name} {col_type}")
            print(f"✅ Added {col_name} to iot_logs.")
        except sqlite3.OperationalError:
            print(f"⚠️ {col_name} already exists in iot_logs.")

    conn.commit()
    conn.close()
    print("✨ Migration complete!")

if __name__ == "__main__":
    migrate()
