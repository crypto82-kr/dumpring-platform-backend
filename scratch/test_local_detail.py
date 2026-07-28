import asyncio
from app.core.db import SessionLocal
from app.api.fleet import get_driver_detail
from app.models import User

async def run():
    session = SessionLocal()
    # Mock current_owner
    from sqlalchemy import select
    r = await session.execute(select(User).where(User.phone_number == "010-1111-1111"))
    owner = r.scalars().first()

    try:
        res = await get_driver_detail(driver_id=4, db=session, current_owner=owner)
        print("Success! Result:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
    await session.close()

if __name__ == "__main__":
    asyncio.run(run())
