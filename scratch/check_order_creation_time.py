import asyncio
import os
import dotenv
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import JobPost

dotenv.load_dotenv()
d_url = os.getenv("DATABASE_URL")
if d_url.startswith("postgresql://"):
    d_url = d_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(d_url, connect_args={"statement_cache_size": 0})

async def check_order_time():
    async with AsyncSession(engine) as session:
        # 작업일이 2026-07-02인 오더 조회
        res = await session.execute(select(JobPost).order_by(JobPost.created_at.desc()).limit(10))
        posts = res.scalars().all()
        
        print("=== 오더(JobPost) 정보 ===")
        for p in posts:
            print(f"ID: {p.id}, 작업일(work_date): {p.work_date}, 생성일시(created_at): {p.created_at}, 상태: {p.status}, 메모: {p.memo[:20]}...")

if __name__ == "__main__":
    asyncio.run(check_order_time())
