import asyncio
import httpx

async def main():
    # 1. Login to get token
    async with httpx.AsyncClient() as client:
        login_res = await client.post(
            "https://dumpring-api.onrender.com/api/auth/login",
            json={
                "phone_number": "010-2222-1111",
                "password": "password123"
            }
        )
        if login_res.status_code != 200:
            print("Login failed on Render server:", login_res.status_code)
            print(login_res.text)
            return
        
        token_data = login_res.json()
        token = token_data.get("access_token")
        print("Logged in successfully. Token:", token[:15] + "...")

        # 2. Get ticket 42
        ticket_res = await client.get(
            "https://dumpring-api.onrender.com/api/dispatch/tickets/42",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Ticket 42 response status:", ticket_res.status_code)
        print("Ticket 42 response text:")
        print(ticket_res.text)

if __name__ == '__main__':
    asyncio.run(main())
