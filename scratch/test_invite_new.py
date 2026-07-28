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

        # Invite a brand new driver
        new_phone = "010-7777-6666"
        r = await client.post("https://dumpring-api.onrender.com/api/fleet/invite-driver", json={
            "phone_number": new_phone,
            "name": "새기사"
        }, headers={"Authorization": f"Bearer {token}"})
        print("Invite status:", r.status_code, r.text)

        # Get drivers list
        r = await client.get("https://dumpring-api.onrender.com/api/fleet/my-drivers", headers={
            "Authorization": f"Bearer {token}"
        })
        print("My Drivers:")
        for driver in r.json():
            print(driver)

if __name__ == "__main__":
    asyncio.run(main())
