
import sqlite3

def list_tracking_ids():
    conn = sqlite3.connect('patio_sur.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, project_id, nombre_proyecto FROM project_tracking LIMIT 10")
    rows = cursor.fetchall()
    print("Project Tracking IDs:")
    for row in rows:
        print(row)
    conn.close()

if __name__ == "__main__":
    list_tracking_ids()
