import asyncio
import os
import dotenv
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
# seed_scenario.py에서 사용되는 모델 임포트
from app.models import User, ConstructionSite

dotenv.load_dotenv()
d_url = os.getenv("DATABASE_URL")
if d_url.startswith("postgresql://"):
    d_url = d_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(d_url, connect_args={"statement_cache_size": 0})

async def check_time():
    async with AsyncSession(engine) as session:
        # 가장 최근에 등록된 유저들의 생성 시간 조회
        res_users = await session.execute(select(User).order_by(User.created_at.desc()).limit(5))
        users = res_users.scalars().all()
        
        print("=== 최근 생성된 테스트 유저 일시 ===")
        for u in users:
            print(f"이름: {u.name}, 휴대폰: {u.phone_number}, 생성일시: {u.created_at}")

        # 가장 최근에 등록된 공사현장 생성 시간 조회
        res_sites = await session.execute(select(ConstructionSite).order_by(ConstructionSite.created_at.desc()).limit(5))
        sites = res_sites.scalars().all()
        
        print("\n=== 최근 생성된 공사현장 일시 ===")
        for s in sites:
            print(f"현장명: {s.site_key} ({s.company_name}), 생성일시: {s.created_at}")

if __name__ == "__main__":
    asyncio.run(check_time())
