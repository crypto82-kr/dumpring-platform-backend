import asyncio
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

sys.stdout.reconfigure(encoding='utf-8')

async def add_column():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("Checking/Adding inspection_date column to cars table...")
        await conn.execute(text("ALTER TABLE cars ADD COLUMN IF NOT EXISTS inspection_date VARCHAR DEFAULT '2026-12-31';"))
        print("Column inspection_date successfully added or verified!")

if __name__ == "__main__":
    asyncio.run(add_column())
