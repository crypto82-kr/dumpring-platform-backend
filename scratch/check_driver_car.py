import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        print("--- Users ---")
        users = await conn.execute(text("SELECT id, phone_number, name, is_driver, is_approved FROM users;"))
        for u in users:
            print(dict(u))
            
        print("\n--- Drivers ---")
        drivers = await conn.execute(text("SELECT id, user_id, current_car_id, is_approved, registered_phone FROM drivers;"))
        for d in drivers:
            print(dict(d))
            
        print("\n--- Cars ---")
        cars = await conn.execute(text("SELECT id, owner_id, car_number, tonnage FROM cars;"))
        for c in cars:
            print(dict(c))
            
        print("\n--- JobPosts ---")
        jobs = await conn.execute(text("SELECT id, site_id, status, required_trucks FROM job_posts;"))
        for j in jobs:
            print(dict(j))

if __name__ == '__main__':
    asyncio.run(main())
