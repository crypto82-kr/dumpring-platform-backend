import asyncio
from app.core.db import SessionLocal
from sqlalchemy import text

async def run():
    session = SessionLocal()
    try:
        r = await session.execute(text("SELECT owner_id FROM drivers"))
        print("Column owner_id exists! Rows:", r.fetchall()[:3])
    except Exception as e:
        print("Column owner_id DOES NOT EXIST or error:", e)
    await session.close()

if __name__ == "__main__":
    asyncio.run(run())
