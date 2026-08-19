import asyncio
import os
import dotenv
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

dotenv.load_dotenv()

from app.models import User, Driver, SiteEmployee, Notification, ConstructionSite, Car, UnloadingSite, SiteUserMapping, SiteProfile, DropOffProfile
from app.core.security import normalize_phone

async def merge_users(session, keep, delete_u):
    print(f"Merging relations from User ID {delete_u.id} to {keep.id}...")
    
    # 1. Update ConstructionSite
    await session.execute(
        update(ConstructionSite).where(ConstructionSite.user_id == delete_u.id).values(user_id=keep.id)
    )
    # 2. Update SiteEmployee
    await session.execute(
        update(SiteEmployee).where(SiteEmployee.user_id == delete_u.id).values(user_id=keep.id)
    )
    # 3. Update UnloadingSite
    await session.execute(
        update(UnloadingSite).where(UnloadingSite.user_id == delete_u.id).values(user_id=keep.id)
    )
    # 4. Update Driver (user_id and owner_id)
    res_drv_keep = await session.execute(select(Driver).where(Driver.user_id == keep.id))
    drv_keep = res_drv_keep.scalars().first()
    if drv_keep:
        await session.execute(
            delete(Driver).where(Driver.user_id == delete_u.id)
        )
    else:
        await session.execute(
            update(Driver).where(Driver.user_id == delete_u.id).values(user_id=keep.id)
        )
    await session.execute(
        update(Driver).where(Driver.owner_id == delete_u.id).values(owner_id=keep.id)
    )
    # 5. Update Car
    await session.execute(
        update(Car).where(Car.owner_id == delete_u.id).values(owner_id=keep.id)
    )
    # 6. Update Notification
    await session.execute(
        update(Notification).where(Notification.sender_id == delete_u.id).values(sender_id=keep.id)
    )
    # 7. Update SiteUserMapping (delete mapping if duplicate exists for the same site)
    # For simplicity, we can delete the delete_u's mappings first
    await session.execute(
        delete(SiteUserMapping).where(SiteUserMapping.user_id == delete_u.id)
    )
    # 8. Delete profiles of delete_u
    await session.execute(
        delete(SiteProfile).where(SiteProfile.user_id == delete_u.id)
    )
    await session.execute(
        delete(DropOffProfile).where(DropOffProfile.user_id == delete_u.id)
    )

async def migrate():
    DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")
    if not DATABASE_URL:
        print("DATABASE_URL is not set!")
        return
        
    print(f"Connecting to DB: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        with session.no_autoflush:
            # 1. Fetch all users
            r = await session.execute(select(User))
            users = r.scalars().all()
            
            # Map normalized phones to list of user objects
            norm_map = {}
            for u in users:
                norm = normalize_phone(u.phone_number)
                norm_map.setdefault(norm, []).append(u)
            
            # Handle duplicates
            for norm, user_list in norm_map.items():
                if len(user_list) > 1:
                    print(f"Duplicate users found for normalized phone {norm}: {[u.id for u in user_list]}")
                    # Keep the one that is approved, or has roles, or has the smaller ID
                    user_list.sort(key=lambda u: (
                        not u.is_approved,
                        -(int(u.is_owner) + int(u.is_driver) + int(u.is_site_manager)),
                        u.id
                    ))
                    keep = user_list[0]
                    to_delete = user_list[1:]
                    for d_user in to_delete:
                        await merge_users(session, keep, d_user)
                        await session.delete(d_user)
            
            # Flush deletes and updates
            await session.flush()

            # Now perform phone normalization
            r = await session.execute(select(User))
            users = r.scalars().all()
            for u in users:
                norm = normalize_phone(u.phone_number)
                if u.phone_number != norm:
                    print(f"Normalizing User {u.id}: {u.phone_number} -> {norm}")
                    u.phone_number = norm

            # 2. Migrate Driver table
            r = await session.execute(select(Driver))
            drivers = r.scalars().all()
            for d in drivers:
                norm = normalize_phone(d.registered_phone)
                if norm != d.registered_phone:
                    print(f"Normalizing Driver {d.id}: {d.registered_phone} -> {norm}")
                    d.registered_phone = norm

            # 3. Migrate SiteEmployee
            r = await session.execute(select(SiteEmployee))
            emps = r.scalars().all()
            for emp in emps:
                norm = normalize_phone(emp.registered_phone)
                if norm != emp.registered_phone:
                    print(f"Normalizing SiteEmployee {emp.id}: {emp.registered_phone} -> {norm}")
                    emp.registered_phone = norm

            # 4. Migrate Notification
            r = await session.execute(select(Notification))
            notifs = r.scalars().all()
            for n in notifs:
                norm = normalize_phone(n.target_phone)
                if norm != n.target_phone:
                    print(f"Normalizing Notification {n.id}: {n.target_phone} -> {norm}")
                    n.target_phone = norm

            # 5. Migrate ConstructionSite manager_phone
            r = await session.execute(select(ConstructionSite))
            sites = r.scalars().all()
            for s in sites:
                if s.manager_phone:
                    norm = normalize_phone(s.manager_phone)
                    if norm != s.manager_phone:
                        print(f"Normalizing ConstructionSite {s.id}: {s.manager_phone} -> {norm}")
                        s.manager_phone = norm

        print("Saving changes to database...")
        await session.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
