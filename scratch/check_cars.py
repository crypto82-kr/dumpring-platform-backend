import asyncio
from app.core.db import SessionLocal
from app.models import Car
from sqlalchemy import select

async def run():
    session = SessionLocal()
    result = await session.execute(select(Car))
    cars = result.scalars().all()
    for c in cars:
        print(f"ID: {c.id}, CarNumber: {c.car_number}, MachineryRegFile: {c.machinery_reg_file}, MachineryRegUrl: {c.machinery_reg_url}, BizFile: {c.biz_license_file}, BizUrl: {c.biz_license_url}")
    await session.close()

if __name__ == "__main__":
    asyncio.run(run())
