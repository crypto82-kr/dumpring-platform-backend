import asyncio
import os
import math
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.db import SessionLocal
from app.models import JobPost, ConstructionSite, DropOff
from dotenv import load_dotenv

load_dotenv()

async def update_jobs():
    print("Recalculating and updating distance/time for all existing job posts...")
    async with SessionLocal() as db:
        # Query all jobs with site and matched_drop_off loaded
        query = select(JobPost).options(
            selectinload(JobPost.site),
            selectinload(JobPost.matched_drop_off)
        )
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        updated_count = 0
        for j in jobs:
            site = j.site
            dropoff = j.matched_drop_off
            
            if site and dropoff and site.latitude and site.longitude and dropoff.latitude and dropoff.longitude:
                lat1, lon1 = math.radians(site.latitude), math.radians(site.longitude)
                lat2, lon2 = math.radians(dropoff.latitude), math.radians(dropoff.longitude)
                
                # Haversine calculation
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                distance = round(6371.0 * c, 1)
                estimated_time = int(distance * 1.5 + 5)
                
                j.distance = distance
                j.estimated_time = estimated_time
                updated_count += 1
                print(f"Job #{j.id}: distance={distance}km, estimated_time={estimated_time}min calculated.")
        
        if updated_count > 0:
            await db.commit()
            print(f"Successfully updated {updated_count} job posts.")
        else:
            print("No job posts updated.")

if __name__ == "__main__":
    asyncio.run(update_jobs())
