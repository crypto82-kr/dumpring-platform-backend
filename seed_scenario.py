"""
덤프링 상황별 샘플 시나리오 시드 스크립트
===========================================
실제 앱의 각 화면/상황을 테스트하기 위한 풍부한 샘플 데이터를 Supabase DB에 삽입합니다.

[포함 시나리오]
- 관리자 계정 (admin)
- 차주 (승인/미승인)
- 기사 (승인/미승인, 차량 배정/미배정)
- 현장관리자 / 현장담당자
- 하차지 지주
- DispatchTicket: ACCEPTED / DRIVING / ARRIVED / APPROVED / REJECTED / CANCELLED 전 상황
- JobPost: OPEN / WAITING_APPROVAL / WAITING_MATCH / COMPLETED / CANCELLED 전 상황
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.models import (
    Base, User, ConstructionSite, Car, Driver, DropOff, DropOffRequest,
    JobPost, DispatchTicket, CommonCode, SiteProfile, DropOffProfile
)
from app.core.security import get_password_hash
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL 환경변수가 설정되지 않았습니다.")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"statement_cache_size": 0})
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

KST = timezone(timedelta(hours=9))
NOW = datetime.now(tz=KST)
PW = get_password_hash("password123")  # 모든 샘플 계정 공통 비밀번호


async def get_or_create_user(session, phone, name, **kwargs):
    """폰 번호로 유저를 조회하거나 새로 생성"""
    r = await session.execute(select(User).where(User.phone_number == phone))
    user = r.scalars().first()
    if user:
        user.name = name
        for k, v in kwargs.items():
            setattr(user, k, v)
    else:
        user = User(phone_number=phone, password=PW, name=name, **kwargs)
        session.add(user)
    return user


async def get_or_create_car(session, owner_id, car_number, tonnage):
    r = await session.execute(select(Car).where(Car.car_number == car_number))
    car = r.scalars().first()
    if car:
        car.owner_id = owner_id
        car.tonnage = tonnage
    else:
        car = Car(owner_id=owner_id, car_number=car_number, tonnage=tonnage)
        session.add(car)
    return car


async def get_or_create_driver(session, user_id, car_id, phone, is_approved):
    r = await session.execute(select(Driver).where(Driver.registered_phone == phone))
    drv = r.scalars().first()
    if drv:
        drv.user_id = user_id
        drv.current_car_id = car_id
        drv.is_approved = is_approved
    else:
        drv = Driver(user_id=user_id, current_car_id=car_id, registered_phone=phone, is_approved=is_approved)
        session.add(drv)
    return drv


async def get_or_create_drop_off(session, owner_id, name, address, lat, lng, permit):
    r = await session.execute(select(DropOff).where(DropOff.permit_number == permit))
    do = r.scalars().first()
    if do:
        do.owner_id = owner_id
        do.name = name
    else:
        do = DropOff(
            owner_id=owner_id, name=name, address=address,
            latitude=lat, longitude=lng, radius_meter=200.0,
            permit_number=permit, status="ACTIVE"
        )
        session.add(do)
    return do


async def create_ticket(session, job_post_id, driver_id, car_id, status,
                        fare=0, distance=0.0, drive_time=0,
                        driving_started_at=None, arrived_at=None, completed_at=None):
    """DispatchTicket 생성 (중복 체크 없이 매번 새로 생성)"""
    ticket = DispatchTicket(
        job_post_id=job_post_id,
        driver_id=driver_id,
        car_id=car_id,
        status=status,
        accumulated_fare=fare,
        drive_distance_km=distance,
        drive_time_seconds=drive_time,
        accepted_at=NOW - timedelta(hours=2),
        driving_started_at=driving_started_at,
        arrived_at=arrived_at,
        completed_at=completed_at,
    )
    session.add(ticket)
    return ticket


async def seed_scenario_data():
    async with AsyncSessionLocal() as session:
        print("=" * 60)
        print("🌱 덤프링 상황별 샘플 데이터 삽입 시작")
        print("=" * 60)

        # ──────────────────────────────────────────
        # 1. 공통 코드 (이미 있으면 무시)
        # ──────────────────────────────────────────
        print("\n[1/8] 공통 코드 확인/삽입...")
        codes = [
            ("MATERIAL_TYPE", "GOOD_SOIL", "양질토", 1),
            ("MATERIAL_TYPE", "MUD_SOIL", "뻘흙", 2),
            ("MATERIAL_TYPE", "ROCK", "암버럭", 3),
            ("MATERIAL_TYPE", "MIXED", "혼합", 4),
            ("TRUCK_TYPE", "T_15", "15톤", 1),
            ("TRUCK_TYPE", "T_25", "25톤", 2),
            ("TRUCK_TYPE", "T_27", "27톤", 3),
            ("PAYER_TYPE", "SITE_PAYS", "현장 지불", 1),
            ("PAYER_TYPE", "DROP_OFF_PAYS", "하차지 지불", 2),
            ("PAYER_TYPE", "FREE", "무상", 3),
            ("PAYMENT_METHOD", "MONTHLY", "월대", 1),
            ("PAYMENT_METHOD", "DAILY", "당일지급", 2),
            ("DISPATCH_STATUS", "ACCEPTED", "배차 수락", 1),
            ("DISPATCH_STATUS", "DRIVING", "운행 중", 2),
            ("DISPATCH_STATUS", "ARRIVED", "도착 완료", 3),
            ("DISPATCH_STATUS", "APPROVED", "반입 승인", 4),
            ("DISPATCH_STATUS", "REJECTED", "반입 반려", 5),
            ("DISPATCH_STATUS", "CANCELLED", "운행 취소", 6),
            ("METER_EXCEPTION_RULES", "MAX_OFFLINE_COUNT", "3", 1),
            ("METER_EXCEPTION_RULES", "MAX_SINGLE_OFFLINE_SECONDS", "600", 2),
            ("METER_EXCEPTION_RULES", "MAX_TOTAL_OFFLINE_SECONDS", "1800", 3),
        ]
        for gc, c, cn, do in codes:
            r = await session.execute(select(CommonCode).where(CommonCode.group_code == gc, CommonCode.code == c))
            if not r.scalars().first():
                session.add(CommonCode(group_code=gc, code=c, code_name=cn, display_order=do))
        await session.commit()

        # ──────────────────────────────────────────
        # 2. 사용자 계정 (총 11명)
        # ──────────────────────────────────────────
        print("[2/8] 사용자 계정 생성...")

        # 관리자
        admin = await get_or_create_user(session, "010-0000-0000", "시스템관리자",
                                          is_admin=True, is_approved=True)

        # 차주 (승인 완료)
        owner1 = await get_or_create_user(session, "010-1111-1111", "김차주(승인)",
                                           is_owner=True, is_approved=True)
        # 차주 (승인 대기)
        owner2 = await get_or_create_user(session, "010-1111-2222", "박차주(대기)",
                                           is_owner=True, is_approved=False)

        # 기사들 (다양한 상황)
        driver1 = await get_or_create_user(session, "010-2222-1111", "이기사(ACCEPTED)",
                                            is_driver=True, is_approved=True)
        driver2 = await get_or_create_user(session, "010-2222-2222", "최기사(DRIVING)",
                                            is_driver=True, is_approved=True)
        driver3 = await get_or_create_user(session, "010-2222-3333", "강기사(ARRIVED)",
                                            is_driver=True, is_approved=True)
        driver4 = await get_or_create_user(session, "010-2222-4444", "조기사(APPROVED)",
                                            is_driver=True, is_approved=True)
        driver5 = await get_or_create_user(session, "010-2222-5555", "윤기사(REJECTED)",
                                            is_driver=True, is_approved=True)
        driver6 = await get_or_create_user(session, "010-2222-6666", "장기사(미승인)",
                                            is_driver=True, is_approved=False)

        # 현장관리자
        site_mgr = await get_or_create_user(session, "010-3333-1111", "정소장(현장관리자)",
                                             is_site_manager=True, is_approved=True)
        # 하차지 지주
        drop_owner = await get_or_create_user(session, "010-4444-1111", "오지주(하차지)",
                                               is_drop_off=True, is_approved=True)

        await session.commit()
        for u in [admin, owner1, owner2, driver1, driver2, driver3, driver4, driver5, driver6, site_mgr, drop_owner]:
            await session.refresh(u)

        print(f"  ✅ 총 11명 생성 완료")
        print(f"  📋 로그인 공통 비밀번호: password123")
        print(f"  👤 관리자: 010-0000-0000")
        print(f"  🚗 차주(승인): 010-1111-1111 / 차주(대기): 010-1111-2222")
        print(f"  🚛 기사 1(ACCEPTED):010-2222-1111, 2(DRIVING):010-2222-2222")
        print(f"     기사 3(ARRIVED):010-2222-3333, 4(APPROVED):010-2222-4444")
        print(f"     기사 5(REJECTED):010-2222-5555, 6(미승인):010-2222-6666")
        print(f"  🏗️ 현장관리자: 010-3333-1111")
        print(f"  🌍 하차지지주: 010-4444-1111")

        # ──────────────────────────────────────────
        # 3. 차량 (Cars)
        # ──────────────────────────────────────────
        print("\n[3/8] 차량 등록...")
        car1 = await get_or_create_car(session, owner1.id, "서울80사1111", 25.0)
        car2 = await get_or_create_car(session, owner1.id, "경기80사2222", 15.0)
        car3 = await get_or_create_car(session, owner1.id, "인천80사3333", 25.0)
        car4 = await get_or_create_car(session, owner1.id, "경기80사4444", 25.0)
        car5 = await get_or_create_car(session, owner1.id, "서울80사5555", 25.0)
        car6 = await get_or_create_car(session, owner2.id, "경남80사9999", 27.0)
        await session.commit()
        for c in [car1, car2, car3, car4, car5, car6]:
            await session.refresh(c)
        print(f"  ✅ 차량 6대 등록 완료")

        # ──────────────────────────────────────────
        # 4. 기사 Driver 레코드 (Driver 테이블)
        # ──────────────────────────────────────────
        print("\n[4/8] 기사 정보 등록...")
        drv1 = await get_or_create_driver(session, driver1.id, car1.id, "010-2222-1111", True)
        drv2 = await get_or_create_driver(session, driver2.id, car2.id, "010-2222-2222", True)
        drv3 = await get_or_create_driver(session, driver3.id, car3.id, "010-2222-3333", True)
        drv4 = await get_or_create_driver(session, driver4.id, car4.id, "010-2222-4444", True)
        drv5 = await get_or_create_driver(session, driver5.id, car5.id, "010-2222-5555", True)
        drv6 = await get_or_create_driver(session, driver6.id, None, "010-2222-6666", False)
        await session.commit()
        print(f"  ✅ 기사 6명 등록 완료")

        # ──────────────────────────────────────────
        # 5. 공사현장
        # ──────────────────────────────────────────
        print("\n[5/8] 공사현장 등록...")
        r = await session.execute(select(ConstructionSite).where(ConstructionSite.site_key == "SITE-HD-001"))
        site1 = r.scalars().first()
        if not site1:
            site1 = ConstructionSite(
                user_id=site_mgr.id, company_name="현대건설",
                business_number="120-00-12345", billing_email="billing@hyundai.com",
                site_key="SITE-HD-001", latitude=37.5665, longitude=126.9780, geofencing_radius=300.0
            )
            session.add(site1)

        r2 = await session.execute(select(ConstructionSite).where(ConstructionSite.site_key == "SITE-GS-002"))
        site2 = r2.scalars().first()
        if not site2:
            site2 = ConstructionSite(
                user_id=site_mgr.id, company_name="GS건설",
                business_number="110-00-54321", billing_email="billing@gs.com",
                site_key="SITE-GS-002", latitude=37.4979, longitude=127.0276, geofencing_radius=200.0
            )
            session.add(site2)
        await session.commit()
        await session.refresh(site1)
        await session.refresh(site2)
        print("  ✅ 공사현장 2개 등록 완료")

        # ──────────────────────────────────────────
        # 6. 하차지 (DropOff)
        # ──────────────────────────────────────────
        print("\n[6/8] 하차지 등록...")
        do1 = await get_or_create_drop_off(session, drop_owner.id, "인천 검단 사토장",
                                            "인천 서구 검단동 123-45", 37.5950, 126.7200, "PERMIT-2026-0001")
        do2 = await get_or_create_drop_off(session, drop_owner.id, "김포 고촌 매립지",
                                            "경기 김포시 고촌읍 567-89", 37.6010, 126.7820, "PERMIT-2026-0002")
        await session.commit()
        await session.refresh(do1)
        await session.refresh(do2)

        # DropOffRequest
        r = await session.execute(select(DropOffRequest).where(DropOffRequest.drop_off_id == do1.id, DropOffRequest.material_type == "GOOD_SOIL"))
        req1 = r.scalars().first()
        if not req1:
            req1 = DropOffRequest(
                drop_off_id=do1.id, material_type="GOOD_SOIL", truck_type="T_25",
                target_quantity=100, current_quantity=40,
                payer_type="SITE_PAYS", payment_method="DAILY", unit_price=45000,
                has_washing_facility=True, night_work_allowed=False, rain_work_allowed=True,
                start_date=NOW - timedelta(days=7), end_date=NOW + timedelta(days=30), status="OPEN"
            )
            session.add(req1)
        r2 = await session.execute(select(DropOffRequest).where(DropOffRequest.drop_off_id == do2.id, DropOffRequest.material_type == "ROCK"))
        req2 = r2.scalars().first()
        if not req2:
            req2 = DropOffRequest(
                drop_off_id=do2.id, material_type="ROCK", truck_type="T_25",
                target_quantity=50, current_quantity=10,
                payer_type="DROP_OFF_PAYS", payment_method="MONTHLY", unit_price=60000,
                has_washing_facility=False, night_work_allowed=True, rain_work_allowed=False,
                start_date=NOW - timedelta(days=3), end_date=NOW + timedelta(days=15), status="OPEN"
            )
            session.add(req2)
        await session.commit()
        await session.refresh(req1)
        await session.refresh(req2)
        print("  ✅ 하차지 2개 + 수용공고 2건 등록 완료")

        # ──────────────────────────────────────────
        # 7. JobPost (오더) - 다양한 상태
        # ──────────────────────────────────────────
        print("\n[7/8] 오더(JobPost) 등록 - 5가지 상태...")

        async def get_or_create_job(session, site_id, req_id, **kwargs):
            if req_id:
                r = await session.execute(select(JobPost).where(JobPost.site_id == site_id, JobPost.drop_off_request_id == req_id))
            else:
                r = await session.execute(select(JobPost).where(JobPost.site_id == site_id, JobPost.status == kwargs.get("status")))
            jp = r.scalars().first()
            if not jp:
                jp = JobPost(site_id=site_id, drop_off_request_id=req_id, **kwargs)
                session.add(jp)
            else:
                for k, v in kwargs.items():
                    setattr(jp, k, v)
            return jp

        # OPEN 오더 (기사 모집 중)
        jp_open = await get_or_create_job(
            session, site1.id, req1.id,
            author_id=site_mgr.id,
            material_type="GOOD_SOIL", truck_type="T_25",
            offered_unit_price=45000, payer_type="SITE_PAYS",
            memo="현대건설 아파트 현장. 세륜기 완비. 일 10대 모집.",
            matched_drop_off_id=do1.id,
            work_date=NOW, required_trucks=10, status="OPEN"
        )

        # WAITING_APPROVAL 오더 (하차지 승인 대기)
        jp_waiting = await get_or_create_job(
            session, site2.id, None,
            author_id=site_mgr.id,
            material_type="ROCK", truck_type="T_25",
            offered_unit_price=65000, payer_type="SITE_PAYS",
            memo="GS건설 터파기 암버럭. 하차지 승인 대기 중.",
            matched_drop_off_id=None,
            work_date=NOW + timedelta(days=2), required_trucks=5, status="WAITING_APPROVAL"
        )

        # WAITING_MATCH 오더 (하차지 매칭 대기)
        jp_match = await get_or_create_job(
            session, site1.id, None,
            author_id=site_mgr.id,
            material_type="MUD_SOIL", truck_type="T_15",
            offered_unit_price=35000, payer_type="FREE",
            memo="강남 재개발 현장 뻘흙. 하차지 찾는 중.",
            matched_drop_off_id=None,
            work_date=NOW + timedelta(days=3), required_trucks=8, status="WAITING_MATCH"
        )

        # COMPLETED 오더 (완료)
        jp_completed = await get_or_create_job(
            session, site2.id, req2.id,
            author_id=site_mgr.id,
            material_type="ROCK", truck_type="T_27",
            offered_unit_price=70000, payer_type="DROP_OFF_PAYS",
            memo="완료된 오더. 김포 암버럭 반출 완료.",
            matched_drop_off_id=do2.id,
            work_date=NOW - timedelta(days=5), required_trucks=3, status="COMPLETED"
        )

        # CANCELLED 오더 (취소)
        jp_cancelled = await get_or_create_job(
            session, site1.id, None,
            author_id=site_mgr.id,
            material_type="MIXED", truck_type="T_25",
            offered_unit_price=50000, payer_type="SITE_PAYS",
            memo="우천으로 인한 작업 취소.",
            matched_drop_off_id=None,
            work_date=NOW - timedelta(days=2), required_trucks=4, status="CANCELLED"
        )

        await session.commit()
        for jp in [jp_open, jp_waiting, jp_match, jp_completed, jp_cancelled]:
            await session.refresh(jp)

        # ──────────────────────────────────────────
        # [페이징 테스트] 추가 100건 대량의 DropOff, DropOffRequest, JobPost 생성
        # ──────────────────────────────────────────
        from sqlalchemy import delete
        # 먼저 기존 대량 테스트 데이터 삭제
        await session.execute(delete(JobPost).where(JobPost.memo.like("%무한 스크롤 및 지역 검색 테스트용 데이터입니다.%")))
        await session.execute(delete(DropOff).where(DropOff.permit_number.like("BULK-PERMIT-%")))
        await session.commit()

        regions_map = {
            "서울특별시": ["영등포구", "강남구", "마포구", "서초구", "송파구"],
            "경기도": ["김포시", "고양시", "성남시", "수원시"],
            "인천광역시": ["서구", "중구", "남동구", "부평구"],
            "강원도": ["춘천시", "원주시", "강릉시"]
        }
        sido_list = list(regions_map.keys())

        print("  ⏳ 페이징 테스트용 대량 덤프 모집 공고 및 하차지 100건 생성 중...")
        for i in range(1, 101):
            sido = sido_list[i % len(sido_list)]
            sigungu = regions_map[sido][i % len(regions_map[sido])]
            
            # 1. 하차지 생성 (주소에 sido와 sigungu가 들어가야 지역 검색이 가능함)
            bulk_do = DropOff(
                owner_id=drop_owner.id,
                name=f"벌크 하차지 {i}호 ({sido} {sigungu})",
                address=f"{sido} {sigungu} 벌크 매립구역 {i}번지",
                latitude=37.5 + (i * 0.005),
                longitude=126.8 + (i * 0.005),
                radius_meter=200.0,
                permit_number=f"BULK-PERMIT-{i:03d}",
                status="ACTIVE"
            )
            session.add(bulk_do)
            await session.flush() # ID 획득

            # 2. 수용 공고 생성
            bulk_req = DropOffRequest(
                drop_off_id=bulk_do.id,
                material_type="GOOD_SOIL" if (i % 2 == 0) else "ROCK",
                truck_type="T_25",
                target_quantity=100,
                current_quantity=10,
                payer_type="SITE_PAYS",
                payment_method="DAILY",
                unit_price=45000 + (i * 1000) % 25000,
                has_washing_facility=True,
                night_work_allowed=False,
                rain_work_allowed=True,
                start_date=NOW - timedelta(days=7),
                end_date=NOW + timedelta(days=30),
                status="OPEN"
            )
            session.add(bulk_req)
            await session.flush()

            # 3. 덤프 모집 공고 생성
            target_site = site1 if (i % 3 == 0) else site2
            bulk_job = JobPost(
                site_id=target_site.id,
                drop_off_request_id=bulk_req.id,
                author_id=site_mgr.id,
                material_type=bulk_req.material_type,
                truck_type="T_25",
                offered_unit_price=bulk_req.unit_price,
                payer_type="SITE_PAYS",
                memo=f"무한 스크롤 및 지역 검색 테스트용 데이터입니다. 현장 번호: {i}번 ({sido} {sigungu} 방면 반출)",
                matched_drop_off_id=bulk_do.id,
                work_date=NOW + timedelta(days=1) + timedelta(hours=i),
                required_trucks=i % 8 + 3,
                status="OPEN"
            )
            session.add(bulk_job)
        await session.commit()

        print("  ✅ JobPost 105건 등록 완료 (기본 5건 + 테스트 벌크 100건)")
        print(f"     OPEN: id={jp_open.id}, WAITING_APPROVAL: id={jp_waiting.id}")
        print(f"     WAITING_MATCH: id={jp_match.id}, COMPLETED: id={jp_completed.id}, CANCELLED: id={jp_cancelled.id}")

        # ──────────────────────────────────────────
        # 8. DispatchTicket (배차 티켓) - 6가지 상태
        # ──────────────────────────────────────────
        print("\n[8/8] DispatchTicket 등록 - 6가지 운행 상태...")

        # 기존 티켓 모두 삭제 후 재생성 (테스트 데이터 리셋)
        from sqlalchemy import delete
        await session.execute(delete(DispatchTicket).where(DispatchTicket.job_post_id == jp_open.id))
        await session.execute(delete(DispatchTicket).where(DispatchTicket.job_post_id == jp_completed.id))
        await session.commit()

        # 시나리오 1: ACCEPTED - 배차 수락, 아직 출발 안 함
        t1 = await create_ticket(
            session, jp_open.id, driver1.id, car1.id,
            status="ACCEPTED",
            fare=0, distance=0.0, drive_time=0
        )

        # 시나리오 2: DRIVING - 현재 운행 중 (미터기 ON)
        t2 = await create_ticket(
            session, jp_open.id, driver2.id, car2.id,
            status="DRIVING",
            fare=28500, distance=19.2, drive_time=2340,
            driving_started_at=NOW - timedelta(minutes=39),
        )

        # 시나리오 3: ARRIVED - 하차지 도착 완료, 도장 대기
        t3 = await create_ticket(
            session, jp_open.id, driver3.id, car3.id,
            status="ARRIVED",
            fare=45000, distance=31.5, drive_time=3720,
            driving_started_at=NOW - timedelta(hours=1, minutes=20),
            arrived_at=NOW - timedelta(minutes=12),
        )

        # 시나리오 4: APPROVED - 하차지 도장 승인 완료 (정산 완료)
        t4 = await create_ticket(
            session, jp_completed.id, driver4.id, car4.id,
            status="APPROVED",
            fare=45000, distance=33.7, drive_time=4080,
            driving_started_at=NOW - timedelta(hours=6),
            arrived_at=NOW - timedelta(hours=4, minutes=50),
            completed_at=NOW - timedelta(hours=4, minutes=45),
        )

        # 시나리오 5: REJECTED - 반려/회차 (도착 거부)
        t5 = await create_ticket(
            session, jp_completed.id, driver5.id, car5.id,
            status="REJECTED",
            fare=0, distance=28.1, drive_time=3300,
            driving_started_at=NOW - timedelta(hours=5),
            arrived_at=NOW - timedelta(hours=3, minutes=45),
            completed_at=NOW - timedelta(hours=3, minutes=40),
        )

        # 시나리오 6: CANCELLED - 출발 전 취소
        t6 = await create_ticket(
            session, jp_open.id, driver6.id, None,
            status="CANCELLED",
            fare=0, distance=0.0, drive_time=0
        )
        # car_id nullable 처리
        t6.car_id = car1.id  # 차량 없이 취소된 케이스용 임시

        await session.commit()
        print("  ✅ DispatchTicket 6건 등록 완료")
        print(f"     ACCEPTED: 이기사(010-2222-1111), 서울80사1111")
        print(f"     DRIVING:  최기사(010-2222-2222), 경기80사2222  [38분 운행 중, 28,500원]")
        print(f"     ARRIVED:  강기사(010-2222-3333), 인천80사3333  [도착, 45,000원]")
        print(f"     APPROVED: 조기사(010-2222-4444), 경기80사4444  [정산완료, 45,000원]")
        print(f"     REJECTED: 윤기사(010-2222-5555), 서울80사5555  [반려]")
        print(f"     CANCELLED:장기사(010-2222-6666)               [취소]")

        print("\n" + "=" * 60)
        print("✅ 모든 샘플 데이터 삽입 완료!")
        print("=" * 60)
        print("\n📱 앱 테스트 계정 목록 (비밀번호: password123)")
        print("-" * 45)
        print("역할            | 전화번호         | 이름")
        print("-" * 45)
        print("관리자          | 010-0000-0000   | 시스템관리자")
        print("차주(승인)      | 010-1111-1111   | 김차주")
        print("차주(대기)      | 010-1111-2222   | 박차주")
        print("기사(ACCEPTED)  | 010-2222-1111   | 이기사")
        print("기사(DRIVING)   | 010-2222-2222   | 최기사")
        print("기사(ARRIVED)   | 010-2222-3333   | 강기사")
        print("기사(APPROVED)  | 010-2222-4444   | 조기사")
        print("기사(REJECTED)  | 010-2222-5555   | 윤기사")
        print("기사(미승인)    | 010-2222-6666   | 장기사")
        print("현장관리자      | 010-3333-1111   | 정소장")
        print("하차지지주      | 010-4444-1111   | 오지주")
        print("-" * 45)


if __name__ == "__main__":
    asyncio.run(seed_scenario_data())
