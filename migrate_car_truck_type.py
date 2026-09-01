import asyncio
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

sys.stdout.reconfigure(encoding='utf-8')

async def migrate():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding truck_type column to cars table...")
        await conn.execute(text("ALTER TABLE cars ADD COLUMN IF NOT EXISTS truck_type VARCHAR DEFAULT 'T_25';"))
        
        # Update existing records to match truck_type
        print("Backfilling truck_type based on existing tonnage...")
        await conn.execute(text("UPDATE cars SET truck_type = 'T_15' WHERE tonnage <= 15.0;"))
        await conn.execute(text("UPDATE cars SET truck_type = 'T_25' WHERE tonnage > 15.0 AND tonnage <= 25.5;"))
        await conn.execute(text("UPDATE cars SET truck_type = 'T_27' WHERE tonnage > 25.5;"))
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
