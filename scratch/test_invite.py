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
        print("Logged in as Owner.")

        # Invite a new driver
        invite_phone = "010-9999-8888"
        r = await client.post("https://dumpring-api.onrender.com/api/fleet/invite-driver", json={
            "phone_number": invite_phone,
            "name": "초대받은기사"
        }, headers={"Authorization": f"Bearer {token}"})
        print("Invite response:", r.status_code, r.text)

        # Check owner's driver list
        r = await client.get("https://dumpring-api.onrender.com/api/fleet/my-drivers", headers={
            "Authorization": f"Bearer {token}"
        })
        print("My Drivers:")
        for driver in r.json():
            if driver['phone_number'] == invite_phone:
                print("FOUND:", driver)

if __name__ == "__main__":
    asyncio.run(main())
