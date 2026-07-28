import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Login
        r = await client.post("https://dumpring-api.onrender.com/api/auth/login", json={
            "phone_number": "010-1111-1111",
            "password": "password123"
        })
        if r.status_code != 200:
            print("Login failed:", r.status_code, r.text)
            return
        
        token = r.json()["access_token"]
        print("Logged in successfully. Token:", token[:20] + "...")

        # Fetch cars
        r = await client.get("https://dumpring-api.onrender.com/api/fleet/my-cars", headers={
            "Authorization": f"Bearer {token}"
        })
        print("GET /my-cars Status Code:", r.status_code)
        print("Response Body:")
        for car in r.json():
            print(car)

if __name__ == "__main__":
    asyncio.run(main())
