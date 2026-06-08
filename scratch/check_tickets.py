import sqlite3

def run():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    
    # 1. Print all tables to be sure
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", cursor.fetchall())
    
    # 2. Check users
    cursor.execute("SELECT id, username, email, is_driver, is_approved FROM users;")
    print("\nUsers:")
    for row in cursor.fetchall():
        print(row)
        
    # 3. Check active tickets
    cursor.execute("SELECT id, job_post_id, driver_id, status FROM dispatch_tickets;")
    print("\nDispatch Tickets:")
    for row in cursor.fetchall():
        print(row)

    # 4. Check driver table
    try:
        cursor.execute("SELECT id, user_id, is_approved, current_car_id FROM drivers;")
        print("\nDrivers:")
        for row in cursor.fetchall():
            print(row)
    except Exception as e:
        print("Drivers read error:", e)

    conn.close()

if __name__ == '__main__':
    run()
