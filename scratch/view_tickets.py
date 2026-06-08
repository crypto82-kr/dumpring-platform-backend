import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, job_post_id, driver_id, status FROM dispatch_tickets;"))
        rows = res.fetchall()
        print("Tickets in database:")
        for r in rows:
            print(r)

if __name__ == '__main__':
    asyncio.run(main())
