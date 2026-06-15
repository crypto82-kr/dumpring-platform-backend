import asyncio
import os
from sqlalchemy import text
from app.core.db import engine
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    print("Starting database migration for job_posts table...")
    async with engine.begin() as conn:
        # Check database type
        db_type = conn.dialect.name
        print(f"Database dialect: {db_type}")

        # Add distance column
        try:
            print("Adding distance column...")
            await conn.execute(text("ALTER TABLE job_posts ADD COLUMN distance FLOAT"))
            print("Added distance column successfully.")
        except Exception as e:
            print(f"Distance column might already exist or failed: {e}")

        # Add estimated_time column
        try:
            print("Adding estimated_time column...")
            if db_type == "postgresql":
                await conn.execute(text("ALTER TABLE job_posts ADD COLUMN estimated_time INTEGER"))
            else: # sqlite
                await conn.execute(text("ALTER TABLE job_posts ADD COLUMN estimated_time INTEGER"))
            print("Added estimated_time column successfully.")
        except Exception as e:
            print(f"Estimated_time column might already exist or failed: {e}")

    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
