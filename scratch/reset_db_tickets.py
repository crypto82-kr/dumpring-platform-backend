import asyncio
import sys
import os

# Add the project root to sys.path to resolve imports correctly
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
            
        # Update status
        await conn.execute(text(
            "UPDATE dispatch_tickets SET status = 'APPROVED' WHERE status IN ('ACCEPTED', 'DRIVING', 'ARRIVED');"
        ))
        print("Successfully updated active tickets to APPROVED.")

if __name__ == '__main__':
    asyncio.run(main())
