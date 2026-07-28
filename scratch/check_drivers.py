import asyncio
from app.core.db import SessionLocal
from app.models import Driver
from sqlalchemy import select

async def run():
    session = SessionLocal()
    result = await session.execute(select(Driver))
    drivers = result.scalars().all()
    print("ALL DRIVERS IN DB:")
    for d in drivers:
        print(f"ID: {d.id}, Phone: {d.registered_phone}, OwnerID: {getattr(d, 'owner_id', 'MISSING')}, CarID: {d.current_car_id}, UserID: {d.user_id}")
    await session.close()

if __name__ == "__main__":
    asyncio.run(run())
