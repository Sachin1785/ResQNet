import sqlite3
from config import Config
import shutil
from datetime import datetime

def migrate_add_users_table():
    """Add users table and update communications table"""
    
    # Backup the database first
    backup_path = Config.DATABASE_PATH + f'.backup_users_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    shutil.copy2(Config.DATABASE_PATH, backup_path)
    print(f"✅ Database backed up to: {backup_path}")
    
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'responder')),
                email TEXT,
                phone TEXT,
                avatar TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        # Add sample users (3 regular users)
        users = [
            ('user1', 'password123', 'Command Center Admin', 'user', 'admin@crisis.com', '+91-9876543210'),
            ('user2', 'password123', 'Operations Manager', 'user', 'ops@crisis.com', '+91-9876543211'),
            ('user3', 'password123', 'Dispatch Coordinator', 'user', 'dispatch@crisis.com', '+91-9876543212'),
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO users (username, password, name, role, email, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', users)
        
        # Add sample responders (5 responders)
        responders = [
            ('responder1', 'password123', 'Firefighter John', 'responder', 'john@crisis.com', '+91-9876543220'),
            ('responder2', 'password123', 'Paramedic Sarah', 'responder', 'sarah@crisis.com', '+91-9876543221'),
            ('responder3', 'password123', 'Officer Mike', 'responder', 'mike@crisis.com', '+91-9876543222'),
            ('responder4', 'password123', 'Hazmat Specialist Lisa', 'responder', 'lisa@crisis.com', '+91-9876543223'),
            ('responder5', 'password123', 'EMT David', 'responder', 'david@crisis.com', '+91-9876543224'),
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO users (username, password, name, role, email, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', responders)
        
        # Update communications table to add foreign key (recreate table)
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
                FOREIGN KEY (incident_id) REFERENCES incidents(id),
                FOREIGN KEY (sender_id) REFERENCES users(id)
            )
        ''')
        
        # Copy existing data
        cursor.execute('''
            INSERT INTO communications_new 
            SELECT * FROM communications
        ''')
        
        # Drop old table
        cursor.execute('DROP TABLE communications')
        
        # Rename new table
        cursor.execute('ALTER TABLE communications_new RENAME TO communications')
        
        conn.commit()
        print("✅ Users table created successfully!")
        print(f"   - Added {len(users)} regular users")
        print(f"   - Added {len(responders)} responders")
        print("✅ Communications table updated with user foreign key")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        print(f"   Database can be restored from: {backup_path}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    print("🔄 Starting database migration...")
    migrate_add_users_table()
    print("✅ Migration complete!")
    print("\n📝 Demo Credentials:")
    print("   Responders: responder1-5 / password123")
    print("   Users: user1-3 / password123")
