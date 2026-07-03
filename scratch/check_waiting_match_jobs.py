import asyncio
import sqlalchemy as sa
from sqlalchemy.future import select
from app.core.db import SessionLocal
from app.models import JobPost, ConstructionSite

async def check_jobs():
    async with SessionLocal() as db:
        # Check all job posts in the DB
        query = select(JobPost, ConstructionSite.company_name).join(
            ConstructionSite, JobPost.site_id == ConstructionSite.id
        )
        result = await db.execute(query)
        rows = result.all()
        print(f"Total job posts in DB: {len(rows)}")
        for r in rows:
            job = r[0]
            site_name = r[1]
            print(f"- Job ID: {job.id}, Status: {job.status}, Site: {site_name}, Matched DropOff: {job.matched_drop_off_id}")

if __name__ == "__main__":
    asyncio.run(check_jobs())
