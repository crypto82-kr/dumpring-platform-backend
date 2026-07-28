import asyncio
from app.core.db import SessionLocal
from app.models import Driver, User
from sqlalchemy import select

async def run():
    session = SessionLocal()
    # 1. Get owner
    r = await session.execute(select(User).where(User.phone_number == "010-1111-1111"))
    owner = r.scalars().first()
    print("Owner ID:", owner.id)

    # 2. Create driver
    new_driver = Driver(
        registered_phone="010-8888-7777",
        owner_id=owner.id,
        is_approved=False
    )
    session.add(new_driver)
    await session.commit()
    print("Committed new driver.")

    # 3. Query back
    r = await session.execute(select(Driver).where(Driver.registered_phone == "010-8888-7777"))
    driver = r.scalars().first()
    print("Queried back Driver owner_id:", driver.owner_id)

    # 4. Clean up
    await session.delete(driver)
    await session.commit()
    await session.close()

if __name__ == "__main__":
    asyncio.run(run())
