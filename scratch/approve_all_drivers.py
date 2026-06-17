import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        # 1. Update users table: set is_approved = True for all drivers
        res1 = await conn.execute(text("UPDATE users SET is_approved = True WHERE is_driver = True;"))
        print(f"Updated {res1.rowcount} users to approved.")
        
        # 2. Update drivers table: set is_approved = True for all drivers
        res2 = await conn.execute(text("UPDATE drivers SET is_approved = True;"))
        print(f"Updated {res2.rowcount} drivers to approved.")

if __name__ == '__main__':
    asyncio.run(main())
