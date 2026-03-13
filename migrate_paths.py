import sqlite3
import os

def migrate_filepaths():
    db_path = 'backend/crisis_management.db'
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT id, filepath FROM attachments")
    rows = cursor.fetchall()

    updated_count = 0
    for row_id, filepath in rows:
        if 'uploads' in filepath and os.path.isabs(filepath):
            # Find the position of 'uploads' and take everything from there
            index = filepath.find('uploads')
            if index != -1:
                new_path = filepath[index:].replace('\\', '/')
                cursor.execute("UPDATE attachments SET filepath = ? WHERE id = ?", (new_path, row_id))
                print(f"Updated ID {row_id}: {filepath} -> {new_path}")
                updated_count += 1

    conn.commit()
    conn.close()
    print(f"Migration complete. Updated {updated_count} records.")

if __name__ == '__main__':
    migrate_filepaths()
