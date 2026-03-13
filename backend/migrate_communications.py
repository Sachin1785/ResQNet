import sqlite3
from config import Config
import shutil
from datetime import datetime

def migrate_communications_table():
    """Migrate communications table to allow NULL incident_id for broadcast messages"""
    
    # Backup the database first
    backup_path = Config.DATABASE_PATH + f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    shutil.copy2(Config.DATABASE_PATH, backup_path)
    print(f"✅ Database backed up to: {backup_path}")
    
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Create new communications table with nullable incident_id
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS communications_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id INTEGER,
                sender_id INTEGER,
                sender_name TEXT,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                read_status BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (incident_id) REFERENCES incidents(id)
            )
        ''')
        
        # Copy data from old table to new table
        cursor.execute('''
            INSERT INTO communications_new 
            SELECT * FROM communications
        ''')
        
        # Drop old table
        cursor.execute('DROP TABLE communications')
        
        # Rename new table to original name
        cursor.execute('ALTER TABLE communications_new RENAME TO communications')
        
        conn.commit()
        print("✅ Communications table migrated successfully!")
        print("   - incident_id is now nullable for broadcast messages")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        print(f"   Database can be restored from: {backup_path}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    print("🔄 Starting database migration...")
    migrate_communications_table()
    print("✅ Migration complete!")
