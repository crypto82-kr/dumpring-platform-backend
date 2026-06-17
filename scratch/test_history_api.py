import asyncio
import os
import dotenv
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

dotenv.load_dotenv()
d_url = os.getenv("DATABASE_URL")
if d_url.startswith("postgresql://"):
    d_url = d_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(d_url, connect_args={"statement_cache_size": 0})
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test_endpoint_directly():
    from app.main import app
    from app.models import User
    
    # 1. 기사(driver4 - 조기사) 유저 조회
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.phone_number == "010-2222-4444"))
        user = res.scalars().first()
        if not user:
            print("driver4 (010-2222-4444) not found in database. Please seed first.")
            return
        print(f"Found user: {user.name}, ID: {user.id}, is_driver: {user.is_driver}")

    # 2. TestClient를 이용해 로그인 및 tickets/history API 호출
    with TestClient(app) as client:
        # 로그인 진행
        login_res = client.post(
            "/api/auth/login",
            json={
                "phone_number": "010-2222-4444",
                "password": "password123"
            }
        )
        if login_res.status_code != 200:
            print("Login failed:", login_res.status_code, login_res.text)
            return
        
        token_data = login_res.json()
        token = token_data.get("access_token")
        print("Logged in successfully.")

        # 이력 조회 API 호출
        history_res = client.get(
            "/api/dispatch/tickets/history",
            headers={"Authorization": f"Bearer {token}"},
            params={"limit": 5, "offset": 0}
        )
        print("History API Status Code:", history_res.status_code)
        if history_res.status_code == 200:
            tickets = history_res.json()
            print(f"Successfully retrieved {len(tickets)} tickets.")
            for ticket in tickets:
                print(f"Ticket ID: {ticket.get('id')}, Status: {ticket.get('status')}, Fare: {ticket.get('accumulated_fare')}, Completed At: {ticket.get('completed_at')}")
        else:
            print("Error response:", history_res.text)

if __name__ == "__main__":
    asyncio.run(test_endpoint_directly())
