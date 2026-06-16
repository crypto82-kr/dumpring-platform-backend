import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        # 1. Print all users
        res = await conn.execute(text("SELECT id, phone_number, name, is_driver, is_approved FROM users WHERE is_driver = True;"))
        print("Driver Users in database:")
        for r in res.fetchall():
            print(f"User ID: {r[0]} | Phone: {r[1]} | Name: {r[2]} | Approved: {r[4]}")
            
        # 2. Print all drivers table entries
        res = await conn.execute(text("SELECT id, user_id, current_car_id, registered_phone, is_approved FROM drivers;"))
        print("\nDrivers table entries:")
        for r in res.fetchall():
            print(f"Driver ID: {r[0]} | UserID: {r[1]} | CarID: {r[2]} | Phone: {r[3]} | Approved: {r[4]}")

        # 3. Print all dispatch tickets
        res = await conn.execute(text("SELECT id, job_post_id, driver_id, status, accepted_at, driving_started_at FROM dispatch_tickets ORDER BY id DESC;"))
        print("\nDispatch Tickets in database (Newest first):")
        for r in res.fetchall():
            print(f"Ticket ID: {r[0]} | JobID: {r[1]} | UserID: {r[2]} | Status: {r[3]} | AcceptedAt: {r[4]} | StartedAt: {r[5]}")

if __name__ == '__main__':
    asyncio.run(main())
