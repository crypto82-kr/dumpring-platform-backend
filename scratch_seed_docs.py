import asyncio
import os
import dotenv
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import Driver, User, UserUploadedDocument

dotenv.load_dotenv()
d_url = os.getenv("DATABASE_URL")
if d_url.startswith("postgresql://"):
    d_url = d_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# PgBouncer Transaction Mode 지원을 위한 statement_cache_size=0 옵션 추가
engine = create_async_engine(d_url, connect_args={"statement_cache_size": 0})

async def seed_documents():
    async with AsyncSession(engine) as session:
        # 이기사 계정 조회
        res_user = await session.execute(select(User).where(User.phone_number == '010-2222-1111'))
        u = res_user.scalars().first()
        if not u:
            print("이기사 유저가 존재하지 않습니다.")
            return
            
        # 이기사 필수 서류 3종
        required_docs = [
            {"code": "LICENSE", "file": "driver_license_test.jpg"},
            {"code": "QUALIFICATION", "file": "truck_qualification_test.jpg"},
            {"code": "BANKBOOK", "file": "driver_bankbook_test.jpg"}
        ]
        
        for doc in required_docs:
            doc_query = select(UserUploadedDocument).where(
                UserUploadedDocument.user_id == u.id,
                UserUploadedDocument.document_code == doc["code"]
            )
            res_doc = await session.execute(doc_query)
            existing_doc = res_doc.scalars().first()
            
            if not existing_doc:
                new_doc = UserUploadedDocument(
                    user_id=u.id,
                    document_code=doc["code"],
                    file_name=doc["file"]
                )
                session.add(new_doc)
                print(f"이기사 필수서류 추가 완료: {doc['code']}")
            else:
                existing_doc.file_name = doc["file"]
                print(f"이기사 필수서류 갱신 완료: {doc['code']}")
                
        await session.commit()
        print("서류 데이터 시딩 성공.")

if __name__ == "__main__":
    asyncio.run(seed_documents())
