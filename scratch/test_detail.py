import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Owner Login
        r = await client.post("https://dumpring-api.onrender.com/api/auth/login", json={
            "phone_number": "010-1111-1111",
            "password": "password123"
        })
        token = r.json()["access_token"]
        print("Logged in.")

        # Get driver detail for legacy driver ID 4
        r = await client.get("https://dumpring-api.onrender.com/api/fleet/driver-detail/4", headers={
            "Authorization": f"Bearer {token}"
        })
        print("Detail Response Status:", r.status_code)
        print("Detail Response Body:", r.text)

if __name__ == "__main__":
    asyncio.run(main())
