import asyncio
import os
import sys
import dotenv
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import User, ConstructionSite, SiteUserMapping, SiteUserStatus

# Windows console encoding fix
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

dotenv.load_dotenv()
d_url = os.getenv("DATABASE_URL")
if d_url.startswith("postgresql://"):
    d_url = d_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(d_url, connect_args={"statement_cache_size": 0})

async def map_manager():
    async with AsyncSession(engine) as session:
        res_user = await session.execute(select(User).where(User.phone_number == "010-3333-1111"))
        mgr = res_user.scalars().first()
        if not mgr:
            print(" 정소장 계정을 찾을 수 없습니다.")
            return

        res_sites = await session.execute(select(ConstructionSite).where(ConstructionSite.user_id == mgr.id))
        sites = res_sites.scalars().all()
        
        for site in sites:
            res_map = await session.execute(
                select(SiteUserMapping).where(
                    SiteUserMapping.site_id == site.id,
                    SiteUserMapping.user_id == mgr.id
                )
            )
            mapping = res_map.scalars().first()
            if not mapping:
                mapping = SiteUserMapping(
                    site_id=site.id,
                    user_id=mgr.id,
                    status=SiteUserStatus.APPROVED
                )
                session.add(mapping)
                print(f"현장 '{site.company_name}' 매핑 추가 완료")
            else:
                mapping.status = SiteUserStatus.APPROVED
                print(f"현장 '{site.company_name}' 이미 매핑되어 있음")
        
        await session.commit()

if __name__ == "__main__":
    asyncio.run(map_manager())
