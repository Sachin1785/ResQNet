import sqlite3
import os

db_path = "crisis_management.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE incidents ADD COLUMN system_id_source TEXT")
        conn.commit()
        print("✅ Added system_id_source column to incidents table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("⚠️ Column system_id_source already exists.")
        else:
            print(f"❌ Error: {e}")
    conn.close()
else:
    print("❌ Database file not found.")
