import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from app.models import Base, User, ConstructionSite, SiteEmployee, UnloadingSite, Car, Driver, CommonCode, DropOff, DropOffRequest, JobPost
from app.core.security import get_password_hash
from dotenv import load_dotenv

# .env 로드
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environmental variables or .env file.")

# asyncpg URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

print(f"Connecting to database: {DATABASE_URL}")

engine = create_async_engine(DATABASE_URL, echo=True, connect_args={"statement_cache_size": 0})
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_data():
    async with AsyncSessionLocal() as session:
        # 1. 공통 코드 (CommonCode)
        print("Inserting Common Codes...")
        common_codes = [
            # 토사 종류
            CommonCode(group_code="MATERIAL_TYPE", code="GOOD_SOIL", code_name="양질토", display_order=1),
            CommonCode(group_code="MATERIAL_TYPE", code="MUD_SOIL", code_name="뻘흙", display_order=2),
            CommonCode(group_code="MATERIAL_TYPE", code="ROCK", code_name="암버럭", display_order=3),
            CommonCode(group_code="MATERIAL_TYPE", code="MIXED", code_name="혼합", display_order=4),
            
            # 차량 규격
            CommonCode(group_code="TRUCK_TYPE", code="T_15", code_name="15톤", display_order=1),
            CommonCode(group_code="TRUCK_TYPE", code="T_25", code_name="25톤", display_order=2),
            CommonCode(group_code="TRUCK_TYPE", code="T_27", code_name="27톤", display_order=3),
            
            # 비용 지급 주체
            CommonCode(group_code="PAYER_TYPE", code="SITE_PAYS", code_name="현장 지불", display_order=1),
            CommonCode(group_code="PAYER_TYPE", code="DROP_OFF_PAYS", code_name="하차지 지불", display_order=2),
            CommonCode(group_code="PAYER_TYPE", code="FREE", code_name="무상", display_order=3),
            
            # 정산 방식
            CommonCode(group_code="PAYMENT_METHOD", code="MONTHLY", code_name="월대", display_order=1),
            CommonCode(group_code="PAYMENT_METHOD", code="DAILY", code_name="당일지급", display_order=2),
        ]
        
        from sqlalchemy import select
        for cc in common_codes:
            result = await session.execute(
                select(CommonCode).where(
                    CommonCode.group_code == cc.group_code,
                    CommonCode.code == cc.code
                )
            )
            existing = result.scalars().first()
            if existing:
                existing.code_name = cc.code_name
                existing.display_order = cc.display_order
            else:
                session.add(cc)
        
        await session.commit()
        
        # 2. 사용자 (Users)
        print("Inserting Users...")
        hashed_password = get_password_hash("password123")
        
        users_to_seed = [
            # phone, name, is_owner, is_driver, is_site_manager, is_site_worker, is_drop_off, is_approved
            ("010-1111-1111", "김차주", True, False, False, False, False, True),
            ("010-1111-2222", "박차주(미승인)", True, False, False, False, False, False),
            ("010-2222-1111", "이기사", False, True, False, False, False, True),
            ("010-2222-2222", "최기사(미승인)", False, True, False, False, False, False),
            ("010-3333-1111", "정관리자", False, False, True, False, False, True),
            ("010-3333-2222", "이담당자", False, False, False, True, False, True),
            ("010-4444-1111", "오지주", False, False, False, False, True, True),
        ]
        
        db_users = {}
        for phone, name, is_owner, is_driver, is_site_manager, is_site_worker, is_drop_off, is_approved in users_to_seed:
            result = await session.execute(select(User).where(User.phone_number == phone))
            existing_user = result.scalars().first()
            if existing_user:
                existing_user.name = name
                existing_user.is_owner = is_owner
                existing_user.is_driver = is_driver
                existing_user.is_site_manager = is_site_manager
                existing_user.is_site_worker = is_site_worker
                existing_user.is_drop_off = is_drop_off
                existing_user.is_approved = is_approved
                db_users[phone] = existing_user
            else:
                new_user = User(
                    phone_number=phone,
                    password=hashed_password,
                    name=name,
                    is_owner=is_owner,
                    is_driver=is_driver,
                    is_site_manager=is_site_manager,
                    is_site_worker=is_site_worker,
                    is_drop_off=is_drop_off,
                    is_approved=is_approved
                )
                session.add(new_user)
                db_users[phone] = new_user
                
        await session.commit()
        # Refresh to get IDs
        for phone in db_users:
            await session.refresh(db_users[phone])
        
        owner_approved = db_users["010-1111-1111"]
        owner_unapproved = db_users["010-1111-2222"]
        driver_approved = db_users["010-2222-1111"]
        driver_unapproved = db_users["010-2222-2222"]
        site_manager = db_users["010-3333-1111"]
        drop_off_owner = db_users["010-4444-1111"]
        
        # 3. 차주 소유 차량 (Cars)
        print("Inserting Cars...")
        cars_to_seed = [
            (owner_approved.id, "서울80사1111", 25.5),
            (owner_approved.id, "경기80사2222", 15.0),
            (owner_unapproved.id, "인천80사3333", 27.0),
        ]
        db_cars = {}
        for owner_id, car_num, tonnage in cars_to_seed:
            result = await session.execute(select(Car).where(Car.car_number == car_num))
            existing_car = result.scalars().first()
            if existing_car:
                existing_car.owner_id = owner_id
                existing_car.tonnage = tonnage
                db_cars[car_num] = existing_car
            else:
                new_car = Car(owner_id=owner_id, car_number=car_num, tonnage=tonnage)
                session.add(new_car)
                db_cars[car_num] = new_car
        await session.commit()
        for car_num in db_cars:
            await session.refresh(db_cars[car_num])
            
        car_1 = db_cars["서울80사1111"]
        car_2 = db_cars["경기80사2222"]
        car_3 = db_cars["인천80사3333"]
        
        # 4. 기사 정보 (Drivers)
        print("Inserting Drivers...")
        drivers_to_seed = [
            (driver_approved.id, car_1.id, "010-2222-1111", True),
            (driver_unapproved.id, car_2.id, "010-2222-2222", False),
            (None, car_2.id, "010-5555-5555", True),
            (None, None, "010-6666-6666", False),
        ]
        for user_id, car_id, phone, is_approved in drivers_to_seed:
            result = await session.execute(select(Driver).where(Driver.registered_phone == phone))
            existing_driver = result.scalars().first()
            if existing_driver:
                existing_driver.user_id = user_id
                existing_driver.current_car_id = car_id
                existing_driver.is_approved = is_approved
            else:
                new_driver = Driver(
                    user_id=user_id,
                    current_car_id=car_id,
                    registered_phone=phone,
                    is_approved=is_approved
                )
                session.add(new_driver)
        await session.commit()
        
        # 5. 공사현장 (ConstructionSite)
        print("Inserting Construction Sites...")
        sites_to_seed = [
            ("SITE-HD-001", "현대건설", "120-00-12345", "billing@hyundai.com", 37.5665, 126.9780, 300.0),
            ("SITE-GS-002", "GS건설", "110-00-54321", "billing@gs.com", 37.4979, 127.0276, 200.0),
        ]
        db_sites = {}
        for site_key, comp_name, biz_num, email, lat, lng, radius in sites_to_seed:
            result = await session.execute(select(ConstructionSite).where(ConstructionSite.site_key == site_key))
            existing_site = result.scalars().first()
            if existing_site:
                existing_site.user_id = site_manager.id
                existing_site.company_name = comp_name
                existing_site.business_number = biz_num
                existing_site.billing_email = email
                existing_site.latitude = lat
                existing_site.longitude = lng
                existing_site.geofencing_radius = radius
                db_sites[site_key] = existing_site
            else:
                new_site = ConstructionSite(
                    user_id=site_manager.id,
                    company_name=comp_name,
                    business_number=biz_num,
                    billing_email=email,
                    site_key=site_key,
                    latitude=lat,
                    longitude=lng,
                    geofencing_radius=radius
                )
                session.add(new_site)
                db_sites[site_key] = new_site
        await session.commit()
        for site_key in db_sites:
            await session.refresh(db_sites[site_key])
            
        site_1 = db_sites["SITE-HD-001"]
        site_2 = db_sites["SITE-GS-002"]
        
        # 6. 하차지 마스터 (DropOff)
        print("Inserting DropOff sites...")
        drop_offs_to_seed = [
            ("인천 검단 사토장", "인천 서구 검단동 123-45", 37.5950, 126.7200, 250.0, "PERMIT-2026-0001"),
            ("김포 고촌 매립지", "경기 김포시 고촌읍 567-89", 37.6010, 126.7820, 300.0, "PERMIT-2026-0002"),
        ]
        db_drop_offs = {}
        for name, address, lat, lng, radius, permit in drop_offs_to_seed:
            result = await session.execute(select(DropOff).where(DropOff.permit_number == permit))
            existing_do = result.scalars().first()
            if existing_do:
                existing_do.owner_id = drop_off_owner.id
                existing_do.name = name
                existing_do.address = address
                existing_do.latitude = lat
                existing_do.longitude = lng
                existing_do.radius_meter = radius
                db_drop_offs[permit] = existing_do
            else:
                new_do = DropOff(
                    owner_id=drop_off_owner.id,
                    name=name,
                    address=address,
                    latitude=lat,
                    longitude=lng,
                    radius_meter=radius,
                    permit_number=permit,
                    status="ACTIVE"
                )
                session.add(new_do)
                db_drop_offs[permit] = new_do
        await session.commit()
        for permit in db_drop_offs:
            await session.refresh(db_drop_offs[permit])
            
        drop_off_1 = db_drop_offs["PERMIT-2026-0001"]
        drop_off_2 = db_drop_offs["PERMIT-2026-0002"]
        
        # 7. 하차지 매립 수용 공고 (DropOffRequest)
        print("Inserting DropOff Requests...")
        requests_to_seed = [
            (drop_off_1.id, "GOOD_SOIL", "T_25", 100, 24, "SITE_PAYS", "DAILY", 45000, True, False, True, 30),
            (drop_off_2.id, "ROCK", "T_25", 50, 10, "DROP_OFF_PAYS", "MONTHLY", 60000, False, True, False, 15),
        ]
        db_requests = []
        for do_id, mat, truck, target, current, payer, pay_method, price, wash, night, rain, days in requests_to_seed:
            result = await session.execute(
                select(DropOffRequest).where(
                    DropOffRequest.drop_off_id == do_id,
                    DropOffRequest.material_type == mat,
                    DropOffRequest.truck_type == truck
                )
            )
            existing_req = result.scalars().first()
            if existing_req:
                existing_req.target_quantity = target
                existing_req.unit_price = price
                db_requests.append(existing_req)
            else:
                new_req = DropOffRequest(
                    drop_off_id=do_id,
                    material_type=mat,
                    truck_type=truck,
                    target_quantity=target,
                    current_quantity=current,
                    payer_type=payer,
                    payment_method=pay_method,
                    unit_price=price,
                    has_washing_facility=wash,
                    night_work_allowed=night,
                    rain_work_allowed=rain,
                    start_date=datetime.now(),
                    end_date=datetime.now() + timedelta(days=days),
                    status="OPEN"
                )
                session.add(new_req)
                db_requests.append(new_req)
        await session.commit()
        for r in db_requests:
            await session.refresh(r)
            
        req_1 = db_requests[0]
        req_2 = db_requests[1]
        
        # 8. 현장 덤프 모집 오더 (JobPost)
        print("Inserting Job Posts...")
        job_posts_to_seed = [
            (site_1.id, req_1.id, site_manager.id, "GOOD_SOIL", "T_25", 45000, "SITE_PAYS", "현대건설 아파트 현장 양질토 출토. 세륜기 구비 완료.", drop_off_1.id, 1, 10),
            (site_2.id, req_2.id, site_manager.id, "ROCK", "T_25", 60000, "DROP_OFF_PAYS", "GS건설 터파기 현장 암버럭 출토. 야간작업 진행 가능.", drop_off_2.id, 2, 5),
        ]
        for s_id, req_id, auth_id, mat, truck, price, payer, memo, m_do_id, days, req_trucks in job_posts_to_seed:
            result = await session.execute(
                select(JobPost).where(
                    JobPost.site_id == s_id,
                    JobPost.drop_off_request_id == req_id
                )
            )
            existing_jp = result.scalars().first()
            if existing_jp:
                existing_jp.offered_unit_price = price
                existing_jp.memo = memo
                existing_jp.required_trucks = req_trucks
            else:
                new_jp = JobPost(
                    site_id=s_id,
                    drop_off_request_id=req_id,
                    author_id=auth_id,
                    material_type=mat,
                    truck_type=truck,
                    offered_unit_price=price,
                    payer_type=payer,
                    memo=memo,
                    matched_drop_off_id=m_do_id,
                    work_date=datetime.now() + timedelta(days=days),
                    required_trucks=req_trucks,
                    status="OPEN"
                )
                session.add(new_jp)
        await session.commit()
        
        print("Successfully seeded all sample data.")

if __name__ == "__main__":
    asyncio.run(seed_data())
