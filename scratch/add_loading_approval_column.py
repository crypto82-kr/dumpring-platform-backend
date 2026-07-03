import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        print("Checking/adding loading_approval_type column...")
        await conn.execute(text("ALTER TABLE dispatch_tickets ADD COLUMN IF NOT EXISTS loading_approval_type VARCHAR;"))
        print("Column verified/added successfully.")

if __name__ == '__main__':
    asyncio.run(main())
