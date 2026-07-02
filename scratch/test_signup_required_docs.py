import asyncio
import os
import random
import httpx
import dotenv
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import User, UserUploadedDocument

dotenv.load_dotenv()
d_url = os.getenv("DATABASE_URL")
if d_url.startswith("postgresql://"):
    d_url = d_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(d_url, connect_args={"statement_cache_size": 0})

async def test_flow():
    # 1. 테스트용 임의의 기사/차주 휴대폰 번호 생성
    driver_phone = f"010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
    owner_phone = f"010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

    async with httpx.AsyncClient() as client:
        print(f"--- 1. 기사 회원가입 테스트 (Phone: {driver_phone}) ---")
        driver_payload = {
            "phone_number": driver_phone,
            "password": "password123",
            "name": "홍기사",
            "license_file": "driver_license_test.jpg",
            "safety_training_file": "driver_safety_training_test.jpg",
            "special_labor_training_file": "driver_special_labor_training_test.jpg"
        }
        res_driver = await client.post("http://127.0.0.1:8000/api/auth/register-driver", json=driver_payload)
        print(f"Driver Register Status: {res_driver.status_code}")
        print(f"Response: {res_driver.json()}")
        assert res_driver.status_code == 201

        print(f"\n--- 2. 차주(기사 겸직) 회원가입 테스트 (Phone: {owner_phone}) ---")
        owner_payload = {
            "phone_number": owner_phone,
            "password": "password123",
            "name": "강차주",
            "is_direct_driver": True,
            "biz_license_file": "biz_license_test.jpg",
            "machinery_reg_file": "machinery_reg_test.jpg",
            "insurance_file": "insurance_test.jpg",
            "license_file": "owner_license_test.jpg",
            "safety_training_file": "owner_safety_training_test.jpg",
            "special_labor_training_file": "owner_special_labor_training_test.jpg"
        }
        res_owner = await client.post("http://127.0.0.1:8000/api/auth/register-owner", json=owner_payload)
        print(f"Owner Register Status: {res_owner.status_code}")
        print(f"Response: {res_owner.json()}")
        assert res_owner.status_code == 201

    # 3. 데이터베이스 조회 검증
    async with AsyncSession(engine) as session:
        # 기사 유저 조회
        res = await session.execute(select(User).where(User.phone_number == driver_phone))
        driver_user = res.scalars().first()
        assert driver_user is not None
        
        # 기사 제출 서류 조회
        res_docs = await session.execute(select(UserUploadedDocument).where(UserUploadedDocument.user_id == driver_user.id))
        driver_docs = res_docs.scalars().all()
        print(f"\n기사 등록 서류 개수: {len(driver_docs)}")
        for d in driver_docs:
            print(f"- 서류코드: {d.document_code}, 파일명: {d.file_name}")
        assert len(driver_docs) == 3

        # 차주 유저 조회
        res = await session.execute(select(User).where(User.phone_number == owner_phone))
        owner_user = res.scalars().first()
        assert owner_user is not None
        
        # 차주 제출 서류 조회 (직접 운전하므로 차주 서류 3종 + 기사 서류 3종 = 총 6종이어야 함)
        res_docs = await session.execute(select(UserUploadedDocument).where(UserUploadedDocument.user_id == owner_user.id))
        owner_docs = res_docs.scalars().all()
        print(f"\n차주 등록 서류 개수: {len(owner_docs)}")
        for d in owner_docs:
            print(f"- 서류코드: {d.document_code}, 파일명: {d.file_name}")
        assert len(owner_docs) == 6

    print("\n✅ 회원가입 필수 서류 통합 및 매핑 가입 테스트 전원 통과!")

if __name__ == "__main__":
    asyncio.run(test_flow())
