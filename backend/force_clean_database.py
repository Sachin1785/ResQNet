import sqlite3
from config import Config
import shutil
from datetime import datetime

def force_clean_database():
    """Forcefully remove ALL mock data from database"""
    
    # Backup first
    backup_path = Config.DATABASE_PATH + f'.backup_force_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    shutil.copy2(Config.DATABASE_PATH, backup_path)
    print(f"✅ Database backed up to: {backup_path}")
    
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    print("\n🔍 Current database contents:")
    
    # Check current state
    cursor.execute('SELECT COUNT(*) FROM incidents')
    inc_count = cursor.fetchone()[0]
    print(f"  Incidents: {inc_count}")
    
    cursor.execute('SELECT COUNT(*) FROM personnel')
    pers_count = cursor.fetchone()[0]
    print(f"  Personnel: {pers_count}")
    
    cursor.execute('SELECT COUNT(*) FROM resources')
    res_count = cursor.fetchone()[0]
    print(f"  Resources: {res_count}")
    
    cursor.execute('SELECT COUNT(*) FROM communications')
    comm_count = cursor.fetchone()[0]
    print(f"  Communications: {comm_count}")
    
    cursor.execute('SELECT COUNT(*) FROM users')
    user_count = cursor.fetchone()[0]
    print(f"  Users: {user_count}")
    
    print("\n🗑️  Deleting ALL mock data...")
    
    try:
        # Delete in correct order (respecting foreign keys)
        cursor.execute('DELETE FROM communications')
        print("  ✓ Deleted communications")
        
        cursor.execute('DELETE FROM notifications')
        print("  ✓ Deleted notifications")
        
        cursor.execute('DELETE FROM attachments')
        print("  ✓ Deleted attachments")
        
        cursor.execute('DELETE FROM incident_timeline')
        print("  ✓ Deleted incident timeline")
        
        cursor.execute('DELETE FROM alerts')
        print("  ✓ Deleted alerts")
        
        cursor.execute('DELETE FROM geofence_zones')
        print("  ✓ Deleted geofence zones")
        
        cursor.execute('DELETE FROM resources')
        print("  ✓ Deleted resources")
        
        cursor.execute('DELETE FROM personnel')
        print("  ✓ Deleted personnel")
        
        cursor.execute('DELETE FROM incidents')
        print("  ✓ Deleted incidents")
        
        # Reset autoincrement counters
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('incidents', 'personnel', 'resources', 'communications', 'alerts', 'incident_timeline', 'notifications', 'attachments', 'geofence_zones')")
        print("  ✓ Reset ID counters")
        
        conn.commit()
        
        # Verify cleanup
        print("\n✅ CLEANUP COMPLETE!")
        print("\n📊 Final database state:")
        
        cursor.execute('SELECT COUNT(*) FROM incidents')
        print(f"  Incidents: {cursor.fetchone()[0]}")
        
        cursor.execute('SELECT COUNT(*) FROM personnel')
        print(f"  Personnel: {cursor.fetchone()[0]}")
        
        cursor.execute('SELECT COUNT(*) FROM resources')
        print(f"  Resources: {cursor.fetchone()[0]}")
        
        cursor.execute('SELECT COUNT(*) FROM communications')
        print(f"  Communications: {cursor.fetchone()[0]}")
        
        cursor.execute('SELECT COUNT(*) FROM users')
        print(f"  Users: {cursor.fetchone()[0]} (KEPT)")
        
        cursor.execute('SELECT username, name, role FROM users')
        print("\n👥 Remaining users:")
        for user in cursor.fetchall():
            print(f"  - {user[0]} ({user[1]}) - {user[2]}")
        
        print("\n✨ Database is now completely clean!")
        print("   Only user accounts remain for authentication.")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        print(f"   Restore from: {backup_path}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    force_clean_database()
