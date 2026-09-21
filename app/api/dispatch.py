from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, update
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel

from app.core.db import get_db
from app.models import (
    User, JobPost, DropOff, DropOffRequest, ConstructionSite, 
    DriverFavoriteRegion, DispatchTicket, Driver, Car, CommonCode
)
from app.api.auth import get_current_user
from app.schemas.dispatch import (
    FavoriteRegionCreate, FavoriteRegionResponse,
    DispatchTicketResponse, InspectionRequest, ArriveRequest,
    ApproveLoadingRequest
)
from app.schemas.jobs import JobPostResponse

router = APIRouter()

async def validate_dispatch_status(status_code: str, db: AsyncSession) -> None:
    """공통코드(common_codes) 테이블에 활성화된 DISPATCH_STATUS 코드가 존재하는지 검증"""
    query = select(CommonCode).where(
        CommonCode.group_code == "DISPATCH_STATUS",
        CommonCode.code == status_code,
        CommonCode.is_active == True
    )
    result = await db.execute(query)
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않거나 비활성화된 운행 상태 코드입니다: {status_code}"
        )

async def get_active_pricing_policy(db: AsyncSession):
    from app.schemas.dispatch import MeterPricingPolicy
    query = select(CommonCode).where(
        CommonCode.group_code == "METER_PRICING_POLICY",
        CommonCode.is_active == True
    )
    res = await db.execute(query)
    codes = res.scalars().all()
    
    # Default values
    policy = {
        "calculation_method": "CONTINUOUS",
        "continuous_distance_unit_fare": 1200,
        "continuous_time_unit_fare": 150,
        "over_plan_distance_unit_fare": 1500,
        "over_plan_time_unit_fare": 200,
    }
    
    for c in codes:
        try:
            if c.code == "CALCULATION_METHOD":
                policy["calculation_method"] = c.code_name
            elif c.code == "CONTINUOUS_DISTANCE_UNIT_FARE":
                policy["continuous_distance_unit_fare"] = int(c.code_name)
            elif c.code == "CONTINUOUS_TIME_UNIT_FARE":
                policy["continuous_time_unit_fare"] = int(c.code_name)
            elif c.code == "OVER_PLAN_DISTANCE_UNIT_FARE":
                policy["over_plan_distance_unit_fare"] = int(c.code_name)
            elif c.code == "OVER_PLAN_TIME_UNIT_FARE":
                policy["over_plan_time_unit_fare"] = int(c.code_name)
        except ValueError:
            pass
            
    return MeterPricingPolicy(**policy)

def get_ticket_eager_options():
    """DispatchTicketResponse 직렬화 시 MissingGreenlet 500 에러를 방지하기 위한 연관 데이터 eager loading 옵션 목록"""
    from sqlalchemy.orm import selectinload
    return [
        selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off),
        selectinload(DispatchTicket.driver),
        selectinload(DispatchTicket.car).selectinload(Car.owner),
    ]

async def fetch_loaded_ticket(ticket_id: int, db: AsyncSession) -> Optional[DispatchTicket]:
    """연관 관계(job_post, site, drop_off, driver, car)를 완전히 로드한 DispatchTicket 조회"""
    res = await db.execute(
        select(DispatchTicket)
        .where(DispatchTicket.id == ticket_id)
        .options(*get_ticket_eager_options())
    )
    return res.scalars().first()

async def attach_pricing_policy(ticket_or_tickets, db: AsyncSession):
    if not ticket_or_tickets:
        return ticket_or_tickets
    policy = await get_active_pricing_policy(db)
    if isinstance(ticket_or_tickets, list):
        for ticket in ticket_or_tickets:
            ticket.pricing_policy = policy
    else:
        ticket_or_tickets.pricing_policy = policy
    return ticket_or_tickets

# ==========================================
# 1. 시군구 검색 및 즐겨찾기 지역 배차 조회 API
# ==========================================

@router.get(
    "/open-jobs",
    response_model=List[JobPostResponse],
    summary="전국 시군구 단위 배차 공고 검색",
    description="기사가 시도, 시군구 혹은 본인의 즐겨찾는 관심 지역을 기준으로 활성화된 배차 공고(status='OPEN')들을 검색합니다."
)
async def get_open_dispatch_jobs(
    sido: Optional[str] = None,
    sigungu: Optional[str] = None,
    use_favorites: Optional[bool] = False,
    search: Optional[str] = None,
    work_date: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    # Flow A(drop_off_request -> drop_off) 및 Flow B(matched_drop_off) 하차지를 모두 커버하기 위한 aliased 조인
    from sqlalchemy.orm import aliased
    DropOffA = aliased(DropOff, name="drop_off_a")
    DropOffB = aliased(DropOff, name="drop_off_b")

    query = select(JobPost).join(
        ConstructionSite, JobPost.site_id == ConstructionSite.id
    ).outerjoin(
        DropOffRequest, JobPost.drop_off_request_id == DropOffRequest.id
    ).outerjoin(
        DropOffA, DropOffRequest.drop_off_id == DropOffA.id
    ).outerjoin(
        DropOffB, JobPost.matched_drop_off_id == DropOffB.id
    ).where(JobPost.status == "OPEN")

    # 검색어가 있을 경우 필터링 (현장명, 현장주소, 하차지명, 하차지주소, 메모, 현장 ID)
    if search:
        search_term = f"%{search}%"
        from sqlalchemy import cast, String
        query = query.where(
            or_(
                ConstructionSite.company_name.like(search_term),
                ConstructionSite.site_address.like(search_term),
                DropOffA.name.like(search_term),
                DropOffB.name.like(search_term),
                DropOffA.address.like(search_term),
                DropOffB.address.like(search_term),
                JobPost.memo.like(search_term),
                cast(JobPost.site_id, String).like(search_term)
            )
        )

    # 즐겨찾는 관심지역 필터 사용 시
    if use_favorites:
        fav_query = select(DriverFavoriteRegion).where(DriverFavoriteRegion.user_id == current_user.id)
        fav_result = await db.execute(fav_query)
        favorites = fav_result.scalars().all()

        if not favorites:
            # 즐겨찾는 지역이 없다면 빈 목록 반환
            return []
        
        # 각 즐겨찾기 지역별로 상차지(현장) 주소 또는 하차지 주소 매핑 OR 연산
        or_clauses = []
        for fav in favorites:
            if fav.sigungu == "전체":
                or_clauses.append(
                    or_(
                        ConstructionSite.site_address.like(f"%{fav.sido}%"),
                        DropOffA.address.like(f"%{fav.sido}%"),
                        DropOffB.address.like(f"%{fav.sido}%")
                    )
                )
            else:
                or_clauses.append(
                    or_(
                        and_(
                            ConstructionSite.site_address.like(f"%{fav.sido}%"),
                            ConstructionSite.site_address.like(f"%{fav.sigungu}%")
                        ),
                        and_(
                            DropOffA.address.like(f"%{fav.sido}%"),
                            DropOffA.address.like(f"%{fav.sigungu}%")
                        ),
                        and_(
                            DropOffB.address.like(f"%{fav.sido}%"),
                            DropOffB.address.like(f"%{fav.sigungu}%")
                        )
                    )
                )
        query = query.where(or_(*or_clauses))

    # 직접 시도, 시군구 입력 필터 사용 시 (즐겨찾기 우선순위가 아닐 경우)
    else:
        if sido:
            query = query.where(
                or_(
                    ConstructionSite.site_address.like(f"%{sido}%"),
                    DropOffA.address.like(f"%{sido}%"),
                    DropOffB.address.like(f"%{sido}%")
                )
            )
        if sigungu and sigungu != "전체":
            query = query.where(
                or_(
                    ConstructionSite.site_address.like(f"%{sigungu}%"),
                    DropOffA.address.like(f"%{sigungu}%"),
                    DropOffB.address.like(f"%{sigungu}%")
                )
            )

    # 작업 예정일 날짜 필터 (KST 기준 과거 지난 공고 원천 차단)
    from datetime import timezone as tz, timedelta as td
    kst = tz(td(hours=9))
    now_kst = datetime.now(kst)
    today_start_kst = datetime.combine(now_kst.date(), datetime.min.time()).replace(tzinfo=kst)

    if work_date:
        try:
            target_date = date.fromisoformat(work_date)
            # KST(UTC+9) 기준으로 해당 날짜의 시작과 끝을 UTC 시각으로 변환하여 조회
            day_start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=kst)
            day_end = datetime.combine(target_date + td(days=1), datetime.min.time()).replace(tzinfo=kst)
            query = query.where(JobPost.work_date >= day_start, JobPost.work_date < day_end)
        except ValueError:
            # 잘못된 날짜 형식 입력 시에도 과거 공고가 새어나가지 않도록 오늘 이후만 조회
            query = query.where(JobPost.work_date >= today_start_kst)
    else:
        # 특정 날짜를 선택하지 않은 기본 목록 조회 시: 오늘 00:00:00 이후(오늘 및 미래) 공고만 노출
        query = query.where(JobPost.work_date >= today_start_kst)

    # select(JobPost)와 함께 Site, DropOff, DropOffRequest (및 DropOffRequest.drop_off) 정보를 로드하도록 변경
    from sqlalchemy.orm import selectinload
    query = query.options(
        selectinload(JobPost.site),
        selectinload(JobPost.matched_drop_off),
        selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off)
    ).order_by(JobPost.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    jobs = result.scalars().all()
    
    # 응답 객체 데이터 보완 (단가 및 거리/시간 연산)
    for j in jobs:
        # 단가 세팅 (상차지 제시 단가가 없으면 매치된 하차지 공고 단가 사용)
        if j.offered_unit_price is None and j.drop_off_request:
            j.offered_unit_price = j.drop_off_request.unit_price

        # DB에 기저장된 값 우선 사용, 없을 시 실시간 연산
        if j.distance is None or j.estimated_time is None:
            if j.site and j.matched_drop_off and j.site.latitude and j.site.longitude and j.matched_drop_off.latitude and j.matched_drop_off.longitude:
                import math
                lat1, lon1 = j.site.latitude, j.site.longitude
                lat2, lon2 = j.matched_drop_off.latitude, j.matched_drop_off.longitude
                R = 6371.0
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                j.distance = round(R * c, 1)
                # 대형 덤프트럭 평균 속도 시속 40km 기준 (1.5분/km) + 신호 대기 등 5분 추가
                j.estimated_time = int(j.distance * 1.5 + 5)
            else:
                j.distance = None
                j.estimated_time = None

    return jobs


# ==========================================
# 2. 기사 즐겨찾는 지역(관심지역) 관리 API
# ==========================================

@router.get(
    "/favorites",
    response_model=List[FavoriteRegionResponse],
    summary="즐겨찾는 관심 지역 목록 조회"
)
async def get_favorite_regions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    query = select(DriverFavoriteRegion).where(DriverFavoriteRegion.user_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/favorites",
    response_model=FavoriteRegionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="즐겨찾는 관심 지역 추가"
)
async def add_favorite_region(
    data: FavoriteRegionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    # 10개 이상 등록 제한 예외처리
    count_query = select(DriverFavoriteRegion).where(DriverFavoriteRegion.user_id == current_user.id)
    count_result = await db.execute(count_query)
    existing_count = len(count_result.scalars().all())

    if existing_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="즐겨찾는 관심 지역은 최대 10개까지만 등록 가능합니다."
        )

    # 중복 체크
    dup_query = select(DriverFavoriteRegion).where(
        DriverFavoriteRegion.user_id == current_user.id,
        DriverFavoriteRegion.sido == data.sido,
        DriverFavoriteRegion.sigungu == data.sigungu
    )
    dup_result = await db.execute(dup_query)
    if dup_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 즐겨찾기에 등록된 지역입니다."
        )

    new_fav = DriverFavoriteRegion(
        user_id=current_user.id,
        sido=data.sido,
        sigungu=data.sigungu
    )
    db.add(new_fav)
    await db.commit()
    await db.refresh(new_fav)
    return new_fav


@router.delete(
    "/favorites/{favorite_id}",
    summary="즐겨찾는 관심 지역 삭제"
)
async def delete_favorite_region(
    favorite_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    query = select(DriverFavoriteRegion).where(
        DriverFavoriteRegion.id == favorite_id,
        DriverFavoriteRegion.user_id == current_user.id
    )
    result = await db.execute(query)
    fav = result.scalars().first()

    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="등록된 즐겨찾는 지역을 찾을 수 없습니다."
        )

    await db.delete(fav)
    await db.commit()
    return {"message": "정상적으로 즐겨찾는 지역이 해제되었습니다."}


# ==========================================
# 3. 배차 트랜잭션 흐름 제어 API
# ==========================================

@router.get(
    "/active-tickets",
    response_model=List[DispatchTicketResponse],
    summary="기사의 모든 진행 중인 배차 티켓 조회"
)
async def get_active_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    query = select(DispatchTicket).where(
        DispatchTicket.driver_id == current_user.id,
        DispatchTicket.status.in_(["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED", "WAITING_ABSENT_APPROVAL"])
    ).options(*get_ticket_eager_options())
    
    result = await db.execute(query)
    tickets = result.scalars().all()

    # 운행 우선순위 결정: DRIVING -> ARRIVED/WAITING_ABSENT_APPROVAL -> LOADING_APPROVED -> ARRIVED_LOADING -> ACCEPTED 순
    def get_priority(t):
        if t.status == "DRIVING":
            return 0
        elif t.status in ["ARRIVED", "WAITING_ABSENT_APPROVAL"]:
            return 1
        elif t.status == "LOADING_APPROVED":
            return 2
        elif t.status == "ARRIVED_LOADING":
            return 3
        return 4

    for ticket in tickets:
        if ticket.job_post:
            j = ticket.job_post
            if j.offered_unit_price is None and j.drop_off_request:
                j.offered_unit_price = j.drop_off_request.unit_price

            if j.distance is None or j.estimated_time is None:
                if j.site and j.matched_drop_off and j.site.latitude and j.site.longitude and j.matched_drop_off.latitude and j.matched_drop_off.longitude:
                    import math
                    lat1, lon1 = j.site.latitude, j.site.longitude
                    lat2, lon2 = j.matched_drop_off.latitude, j.matched_drop_off.longitude
                    R = 6371.0
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    j.distance = round(R * c, 1)
                    j.estimated_time = int(j.distance * 1.5 + 5)

    # 정렬: 운행 우선순위가 높은 순, 같은 순위면 작업일이 이른 순
    tickets.sort(key=lambda t: (get_priority(t), t.job_post.work_date if t.job_post and t.job_post.work_date else datetime.max))
    return await attach_pricing_policy(tickets, db)


@router.get(
    "/active-ticket",
    response_model=Optional[DispatchTicketResponse],
    summary="기사의 현재 진행 중인 배차 티켓 조회"
)
async def get_active_ticket(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    query = select(DispatchTicket).where(
        DispatchTicket.driver_id == current_user.id,
        DispatchTicket.status.in_(["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED", "WAITING_ABSENT_APPROVAL"])
    ).options(*get_ticket_eager_options())
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    ticket = None
    if tickets:
        # DRIVING 우선 -> ARRIVED/WAITING_ABSENT_APPROVAL 우선 -> ACCEPTED/ARRIVED_LOADING/LOADING_APPROVED 중에는 accepted_at 최신순
        driving_tickets = [t for t in tickets if t.status == "DRIVING"]
        arrived_tickets = [t for t in tickets if t.status in ["ARRIVED", "WAITING_ABSENT_APPROVAL"]]
        accepted_tickets = [t for t in tickets if t.status in ["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED"]]
        if driving_tickets:
            ticket = driving_tickets[0]
        elif arrived_tickets:
            ticket = arrived_tickets[0]
        elif accepted_tickets:
            # accepted_at 역순(최신순) 정렬
            accepted_tickets.sort(key=lambda t: t.accepted_at, reverse=True)
            ticket = accepted_tickets[0]

    if ticket and ticket.job_post:
        j = ticket.job_post
        if j.offered_unit_price is None and j.drop_off_request:
            j.offered_unit_price = j.drop_off_request.unit_price

        if j.distance is None or j.estimated_time is None:
            if j.site and j.matched_drop_off and j.site.latitude and j.site.longitude and j.matched_drop_off.latitude and j.matched_drop_off.longitude:
                import math
                lat1, lon1 = j.site.latitude, j.site.longitude
                lat2, lon2 = j.matched_drop_off.latitude, j.matched_drop_off.longitude
                R = 6371.0
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                j.distance = round(R * c, 1)
                j.estimated_time = int(j.distance * 1.5 + 5)

    return await attach_pricing_policy(ticket, db)


@router.post(
    "/jobs/{job_post_id}/accept",
    response_model=DispatchTicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="기사의 배차 공고 수락 (매칭 티켓 생성)"
)
async def accept_job(
    job_post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    # 1. 배차 공고 조회
    job_query = select(JobPost).where(JobPost.id == job_post_id)
    job_result = await db.execute(job_query)
    job = job_result.scalars().first()

    if not job or job.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="모집 중(OPEN)인 배차 공고가 아닙니다."
        )

    # 1.2. 작업 예정일 유효성 검사 (과거 날짜 배차 수락 원천 차단)
    from datetime import timezone as tz, timedelta as td
    kst = tz(td(hours=9))
    now_kst = datetime.now(kst)
    today_start_kst = datetime.combine(now_kst.date(), datetime.min.time()).replace(tzinfo=kst)

    if job.work_date:
        job_work_kst = job.work_date.astimezone(kst) if job.work_date.tzinfo else job.work_date.replace(tzinfo=kst)
        if job_work_kst < today_start_kst:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"작업 예정일({job_work_kst.strftime('%Y-%m-%d')})이 이미 지난 공고는 배차를 수락할 수 없습니다."
            )

    # 1.5. [내실 다지기 🚨] 실시간 차량 수락 대수 제한 체크
    # 현재 취소되거나 반려되지 않은 활성 배차 티켓 수량 조회
    active_tickets_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id == job_post_id,
        DispatchTicket.status.in_(["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED", "APPROVED"])
    )
    active_tickets_res = await db.execute(active_tickets_query)
    active_count = len(active_tickets_res.scalars().all())

    if active_count >= job.required_trucks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이미 모집 완료된 배차 공고입니다. (필요 차량: {job.required_trucks}대 / 현재 매칭: {active_count}대)"
        )

    # 2. 기사의 배정된 덤프 트럭 차량 조회
    driver_query = select(Driver).where(Driver.user_id == current_user.id)
    driver_result = await db.execute(driver_query)
    driver = driver_result.scalars().first()

    if not driver or not driver.current_car_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="차주가 배정한 정식 덤프 트럭 차량이 없습니다. 차주에게 차량 배정을 요청해 주세요."
        )

    # [내실 다지기 🚨] 기사 승인 대기 차단 조건 추가
    if not driver.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="플랫폼 관리자의 가입 서류 심사가 대기 중이거나 반려되었습니다. 승인 완료 후 배차 수락이 가능합니다."
        )

    # 3. 같은 작업일에 이미 진행 중이거나 수락한 배차(ACCEPTED, DRIVING, ARRIVED)가 있으면 차단
    # (이를 통해 다른 날짜의 배차는 하루에 최대 1개씩 수락할 수 있도록 허용)
    active_tickets_query = select(DispatchTicket).where(
        DispatchTicket.driver_id == current_user.id,
        DispatchTicket.status.in_(["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED"])
    )
    active_tickets_res = await db.execute(active_tickets_query)
    active_tickets = active_tickets_res.scalars().all()

    from datetime import timezone as tz, timedelta as td
    kst = tz(td(hours=9))

    for at in active_tickets:
        at_job_res = await db.execute(select(JobPost).where(JobPost.id == at.job_post_id))
        at_job = at_job_res.scalars().first()
        if at_job and at_job.work_date and job.work_date:
            # 두 timezone-aware datetime을 한국 시간대(KST)로 변환하여 날짜가 같은지 비교
            at_date = at_job.work_date.astimezone(kst).date() if at_job.work_date.tzinfo else at_job.work_date.date()
            job_date = job.work_date.astimezone(kst).date() if job.work_date.tzinfo else job.work_date.date()
            if at_date == job_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"해당 작업일({job_date.strftime('%Y-%m-%d')})에 이미 수락 또는 운행 중인 배차가 있습니다. 완료 또는 취소 후 신청해 주세요."
                )

    # 3.2. 동일 오더 중복 수락 방지
    dup_ticket = select(DispatchTicket).where(
        DispatchTicket.job_post_id == job_post_id,
        DispatchTicket.driver_id == current_user.id,
        DispatchTicket.status.in_(["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED"])
    )
    dup_res = await db.execute(dup_ticket)
    if dup_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 수락하여 진행 중인 동일 배차 오더가 있습니다."
        )

    # 4. 개별 운행 매칭 티켓 발급
    await validate_dispatch_status("ACCEPTED", db)
    new_ticket = DispatchTicket(
        job_post_id=job_post_id,
        driver_id=current_user.id,
        car_id=driver.current_car_id,
        status="ACCEPTED"
    )
    db.add(new_ticket)

    # 🚨 목표 대수(required_trucks) 충족 여부 검사: 정원이 다 찼으면 공고를 마감(CLOSED) 처리
    # 이번에 새로 발급된 new_ticket을 포함한 현재 활성 티켓 수량 조회
    active_tickets_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id == job_post_id,
        DispatchTicket.status.in_(["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED", "APPROVED"])
    )
    active_tickets_res = await db.execute(active_tickets_query)
    # new_ticket이 아직 commit 전이므로 + 1
    active_count = len(active_tickets_res.scalars().all()) + 1

    if active_count >= job.required_trucks:
        job.status = "CLOSED"

    await db.commit()
    
    # 직렬화 에러(500) 방지를 위해 연관 데이터(site, drop_off, driver, car)를 완전히 로드하여 반환
    ticket_to_return = await fetch_loaded_ticket(new_ticket.id, db)
    return await attach_pricing_policy(ticket_to_return, db)


@router.post(
    "/tickets/{ticket_id}/arrive-loading",
    response_model=DispatchTicketResponse,
    summary="[기사용] 상차지 도착 완료 처리"
)
async def arrive_loading(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await fetch_loaded_ticket(ticket_id, db)

    if not ticket or ticket.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status != "ACCEPTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="상차지 도착 처리를 할 수 없는 상태입니다."
        )

    await validate_dispatch_status("ARRIVED_LOADING", db)
    ticket.status = "ARRIVED_LOADING"
    await db.commit()
    await db.refresh(ticket)
    return await attach_pricing_policy(ticket, db)


@router.post(
    "/tickets/{ticket_id}/approve-loading",
    response_model=DispatchTicketResponse,
    summary="[기사용] 상차 승인 완료 처리 (QR 또는 OFFICE)"
)
async def approve_loading(
    ticket_id: int,
    req: ApproveLoadingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await fetch_loaded_ticket(ticket_id, db)

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    # 권한 검증: 해당 티켓의 기사이거나, 상차 현장 관계자(소장/작업자/공고작성자), 또는 관리자
    is_driver = ticket.driver_id == current_user.id
    is_site_person = (
        current_user.is_site_manager or 
        current_user.is_site_worker or 
        (ticket.job_post and ticket.job_post.author_id == current_user.id)
    )
    is_admin = current_user.is_admin

    if not (is_driver or is_site_person or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="상차 승인 권한이 없습니다. (기사 또는 현장 관리자 권한 필요)"
        )

    if ticket.status not in ["ARRIVED_LOADING", "ACCEPTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="상차 승인을 처리할 수 없는 상태입니다. (상차지 도착 또는 수락 상태여야 합니다)"
        )

    await validate_dispatch_status("LOADING_APPROVED", db)
    ticket.status = "LOADING_APPROVED"
    ticket.loading_approval_type = req.approval_type
    await db.commit()
    await db.refresh(ticket)
    return await attach_pricing_policy(ticket, db)


@router.post(
    "/tickets/{ticket_id}/start-driving",
    response_model=DispatchTicketResponse,
    summary="[기사용] GPS 미터기 가동 및 주행 시작"
)
async def start_driving(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await fetch_loaded_ticket(ticket_id, db)

    if not ticket or ticket.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status != "LOADING_APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="상차 승인(QR 촬영 또는 원격 승인)이 완료되어야 운행을 시작할 수 있습니다."
        )

    await validate_dispatch_status("DRIVING", db)
    ticket.status = "DRIVING"
    ticket.driving_started_at = datetime.now()

    await db.commit()
    await db.refresh(ticket)
    return await attach_pricing_policy(ticket, db)


@router.post(
    "/tickets/{ticket_id}/cancel",
    response_model=DispatchTicketResponse,
    summary="[기사용] 수락한 배차 취소"
)
async def cancel_dispatch(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await fetch_loaded_ticket(ticket_id, db)

    if not ticket or ticket.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status not in ["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 운행을 기동하여 취소할 수 없습니다."
        )

    await validate_dispatch_status("CANCELLED", db)
    ticket.status = "CANCELLED"
    ticket.completed_at = datetime.now()

    # 🚨 기사 취소로 공고에 빈자리가 생겼다면 CLOSED -> OPEN 으로 자동 복구!
    if ticket.job_post and ticket.job_post.status == "CLOSED":
        ticket.job_post.status = "OPEN"

    await db.commit()
    await db.refresh(ticket)
    return await attach_pricing_policy(ticket, db)


@router.post(
    "/tickets/{ticket_id}/arrive",
    response_model=DispatchTicketResponse,
    summary="[기사용] 하차지 지오펜스 진입 감지"
)
async def arrive_at_dropoff(
    ticket_id: int,
    data: ArriveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await fetch_loaded_ticket(ticket_id, db)

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status != "DRIVING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="아직 미터기를 켜고 운행 중인 상태가 아닙니다."
        )

    # 1. 공통코드에서 예외처리 규칙 조회 (기본값 설정)
    max_offline_count = 3
    max_single_offline = 600  # 10분
    max_total_offline = 1800  # 30분
    time_skew_limit = 300     # 5분

    rules_query = select(CommonCode).where(
        CommonCode.group_code == "METER_EXCEPTION_RULES",
        CommonCode.is_active == True
    )
    rules_res = await db.execute(rules_query)
    rules = rules_res.scalars().all()

    for rule in rules:
        try:
            val = int(rule.code_name)
            if rule.code == "MAX_OFFLINE_COUNT":
                max_offline_count = val
            elif rule.code == "MAX_SINGLE_OFFLINE_SECONDS":
                max_single_offline = val
            elif rule.code == "MAX_TOTAL_OFFLINE_SECONDS":
                max_total_offline = val
            elif rule.code == "TIME_SKEW_LIMIT_SECONDS":
                time_skew_limit = val
        except ValueError:
            pass

    # 2. 예외 감지 비교
    offline_count = data.offline_count or 0
    single_offline = data.max_single_offline_seconds or 0
    total_offline = data.total_offline_seconds or 0

    is_exception_triggered = False
    if offline_count > max_offline_count:
        is_exception_triggered = True
    elif single_offline > max_single_offline:
        is_exception_triggered = True
    elif total_offline > max_total_offline:
        is_exception_triggered = True

    # 단말기 시간 왜곡 검증 (TIME_SKEW_LIMIT_SECONDS)
    if data.client_timestamp_ms is not None:
        import time
        server_timestamp = time.time()
        client_timestamp = data.client_timestamp_ms / 1000.0
        time_skew = abs(server_timestamp - client_timestamp)
        if time_skew > time_skew_limit:
            is_exception_triggered = True

    # 3. 상태 및 요금 업데이트
    await validate_dispatch_status("ARRIVED", db)
    ticket.status = "ARRIVED"
    ticket.arrived_at = datetime.now()

    if is_exception_triggered or not data.accumulated_fare:
        # 비정상 꺼짐/네트워크 오류로 예외 판정되거나 데이터 누락 시 공고의 기본 단가 및 거리/시간으로 대체
        job = ticket.job_post
        ticket.accumulated_fare = job.offered_unit_price if (job and job.offered_unit_price) else 75000
        ticket.drive_distance_km = job.distance if (job and job.distance) else 18.5
        ticket.drive_time_seconds = (job.estimated_time * 60) if (job and job.estimated_time) else 1450
    else:
        # 정상 주행 완료인 경우 프론트엔드가 보낸 실시간 계산값 적용
        ticket.accumulated_fare = data.accumulated_fare
        ticket.drive_distance_km = data.drive_distance_km
        ticket.drive_time_seconds = data.drive_time_seconds

    await db.commit()
    await db.refresh(ticket)
    return await attach_pricing_policy(ticket, db)


@router.post(
    "/tickets/{ticket_id}/proof-photo",
    response_model=DispatchTicketResponse,
    summary="[기사용] 지주 부재 시 현장 증빙 사진 업로드 및 승인 대기 처리"
)
async def upload_proof_photo(
    ticket_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    # 1. 티켓 조회
    from sqlalchemy.orm import selectinload
    ticket_query = select(DispatchTicket).where(
        DispatchTicket.id == ticket_id,
        DispatchTicket.driver_id == current_user.id
    ).options(
        selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request)
    )
    result = await db.execute(ticket_query)
    ticket = result.scalars().first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status not in ["DRIVING", "ARRIVED", "WAITING_ABSENT_APPROVAL"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="증빙 사진을 등록할 수 없는 운행 상태입니다."
        )

    # 파일 확장자 검증
    import os
    import uuid
    import shutil
    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    if file_ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 파일 형식입니다. {allowed_exts} 형식만 업로드 가능합니다."
        )

    # 고유 파일명 생성
    filename = f"{uuid.uuid4().hex}{file_ext}"
    
    try:
        contents = await file.read()
        from app.core.storage import upload_to_supabase
        await upload_to_supabase(
            content=contents,
            content_type=file.content_type or "image/jpeg",
            category="photos",
            filename=filename
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase 스토리지 사진 저장 중 에러가 발생했습니다: {str(e)}"
        )

    static_url = f"/static/uploads/proofs/{filename}"
    
    # 2. 티켓 정보 업데이트 및 상태 변경
    await validate_dispatch_status("WAITING_ABSENT_APPROVAL", db)
    ticket.proof_photo = static_url
    ticket.status = "WAITING_ABSENT_APPROVAL"
    
    # DRIVING에서 바로 증빙제출 한 경우 arrived_at 및 기본요금 계산
    if ticket.status == "WAITING_ABSENT_APPROVAL" and not ticket.arrived_at:
        ticket.arrived_at = datetime.now()
        job = ticket.job_post
        ticket.accumulated_fare = job.offered_unit_price if (job and job.offered_unit_price) else 75000
        ticket.drive_distance_km = job.distance if (job and job.distance) else 18.5
        ticket.drive_time_seconds = (job.estimated_time * 60) if (job and job.estimated_time) else 1450
    
    await db.commit()
    await db.refresh(ticket)
    return await attach_pricing_policy(ticket, db)


@router.post(
    "/tickets/{ticket_id}/inspection",
    response_model=DispatchTicketResponse,
    summary="[지주용] 하차 트럭 최종 반입 검사 및 승인/반려 판정"
)
async def inspect_and_confirm(
    ticket_id: int,
    data: InspectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. 티켓 조회 (직렬화 500 방지를 위한 연관 관계 풀 로딩)
    ticket = await fetch_loaded_ticket(ticket_id, db)

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status not in ["ARRIVED", "DRIVING", "WAITING_ABSENT_APPROVAL"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="사토장 게이트에 아직 진입/도착 대기 중이거나 운행 중인 트럭이 아닙니다."
        )

    # 1.5. 권한 검증 (지주 또는 해당 티켓의 기사)
    if not (current_user.is_drop_off or ticket.driver_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 또는 해당 티켓의 기사(DRIVER) 권한이 필요합니다."
        )

    # 2. 하차지 소유주 정합 권한 검증 (지주 계정일 때만 체크)
    job_query = select(JobPost).where(JobPost.id == ticket.job_post_id)
    job_result = await db.execute(job_query)
    job = job_result.scalars().first()

    if current_user.is_drop_off:
        drop_off_query = select(DropOff).where(DropOff.id == job.matched_drop_off_id)
        drop_off_result = await db.execute(drop_off_query)
        dropoff = drop_off_result.scalars().first()

        if not dropoff or dropoff.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 차량이 도착한 하차지 사토장의 소유주가 아닙니다."
            )

    decision_status = data.decision.upper()
    if decision_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="검사 결과 판정은 APPROVED 또는 REJECTED만 가능합니다."
        )

    # DRIVING 상태에서 지주가 직접 승인한 경우 (기사 폰 꺼짐 등 GPS 유실 상황)
    if ticket.status == "DRIVING":
        ticket.arrived_at = datetime.now()
        # 공고의 기본 계획 정산 정보를 적용하여 예외 정산 처리 (기본 요금)
        ticket.accumulated_fare = job.offered_unit_price if (job and job.offered_unit_price) else 75000
        ticket.drive_distance_km = job.distance if (job and job.distance) else 18.5
        ticket.drive_time_seconds = (job.estimated_time * 60) if (job and job.estimated_time) else 1450

    await validate_dispatch_status(decision_status, db)
    ticket.status = decision_status
    ticket.completed_at = datetime.now()

    # [내실 다지기 🚨] 해당 JobPost에 연동된 모든 DispatchTicket들의 반입 완료 여부 검증
    # 만약 배차 신청한 모든 차량의 운행이 완료(APPROVED)되었고,
    # 성공적으로 APPROVED된 티켓 대수가 B2B 공고의 목표 차량대수(required_trucks)에 도달하면 JobPost 자체를 완료(COMPLETED) 처리
    all_tickets_query = select(DispatchTicket).where(DispatchTicket.job_post_id == job.id)
    all_tickets_res = await db.execute(all_tickets_query)
    all_tickets = all_tickets_res.scalars().all()

    # ticket.status는 이미 세션 메모리에서 decision_status로 업데이트되었으므로
    # all_tickets 내의 APPROVED 상태 티켓 수만 세면 정확합니다. (2중 가산 버그 제거)
    approved_count = sum(1 for t in all_tickets if (t.id == ticket.id and decision_status == "APPROVED") or (t.id != ticket.id and t.status == "APPROVED"))

    if approved_count >= job.required_trucks:
        job.status = "COMPLETED"

    await db.commit()
    await db.refresh(ticket)
    return await attach_pricing_policy(ticket, db)



@router.get(
    "/tickets/history",
    response_model=List[DispatchTicketResponse],
    summary="기사의 운행 완료/취소 이력 목록 조회"
)
async def get_tickets_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="기사(DRIVER) 권한이 필요합니다."
        )

    query = select(DispatchTicket).where(
        DispatchTicket.driver_id == current_user.id,
        DispatchTicket.status.in_(["APPROVED", "REJECTED", "CANCELLED"])
    ).options(*get_ticket_eager_options()).order_by(
        DispatchTicket.completed_at.desc(),
        DispatchTicket.id.desc()
    ).limit(limit).offset(offset)
    
    result = await db.execute(query)
    tickets = result.scalars().all()

    for ticket in tickets:
        if ticket.job_post:
            j = ticket.job_post
            if j.offered_unit_price is None and j.drop_off_request:
                j.offered_unit_price = j.drop_off_request.unit_price

            if j.distance is None or j.estimated_time is None:
                if j.site and j.matched_drop_off and j.site.latitude and j.site.longitude and j.matched_drop_off.latitude and j.matched_drop_off.longitude:
                    import math
                    lat1, lon1 = j.site.latitude, j.site.longitude
                    lat2, lon2 = j.matched_drop_off.latitude, j.matched_drop_off.longitude
                    R = 6371.0
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    j.distance = round(R * c, 1)
                    j.estimated_time = int(j.distance * 1.5 + 5)

    return await attach_pricing_policy(tickets, db)


@router.get(
    "/tickets/{ticket_id}",
    response_model=DispatchTicketResponse,
    summary="개별 운행 매칭 티켓 실시간 상세 조회"
)
async def get_dispatch_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await fetch_loaded_ticket(ticket_id, db)

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="요청하신 운행 티켓 정보를 찾을 수 없습니다."
        )

    if ticket.job_post:
        j = ticket.job_post
        if j.offered_unit_price is None and j.drop_off_request:
            j.offered_unit_price = j.drop_off_request.unit_price

        if j.distance is None or j.estimated_time is None:
            if j.site and j.matched_drop_off and j.site.latitude and j.site.longitude and j.matched_drop_off.latitude and j.matched_drop_off.longitude:
                import math
                lat1, lon1 = j.site.latitude, j.site.longitude
                lat2, lon2 = j.matched_drop_off.latitude, j.matched_drop_off.longitude
                R = 6371.0
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                j.distance = round(R * c, 1)
                j.estimated_time = int(j.distance * 1.5 + 5)

    return await attach_pricing_policy(ticket, db)


@router.get(
    "/arrived-tickets",
    response_model=List[DispatchTicketResponse],
    summary="하차지 지주용 도착 완료 차량(검사 대기) 목록 조회"
)
async def get_arrived_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 1. 지주 소유의 하차지 ID 리스트 조회
    drop_off_query = select(DropOff.id).where(
        DropOff.owner_id == current_user.id,
        DropOff.status != "DELETED"
    )
    drop_off_result = await db.execute(drop_off_query)
    drop_off_ids = drop_off_result.scalars().all()

    if not drop_off_ids:
        return []

    # 2. 이 하차지들과 연동된 JobPost ID 리스트 조회
    job_query = select(JobPost.id).where(JobPost.matched_drop_off_id.in_(drop_off_ids))
    job_result = await db.execute(job_query)
    job_ids = job_result.scalars().all()

    if not job_ids:
        return []

    # 3. 상태가 'ARRIVED' 또는 'WAITING_ABSENT_APPROVAL'인 DispatchTicket 조회
    ticket_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id.in_(job_ids),
        DispatchTicket.status.in_(["ARRIVED", "WAITING_ABSENT_APPROVAL"])
    ).options(*get_ticket_eager_options())
    ticket_result = await db.execute(ticket_query)
    tickets = ticket_result.scalars().all()
    return await attach_pricing_policy(tickets, db)


@router.get(
    "/completed-tickets",
    response_model=List[DispatchTicketResponse],
    summary="하차지 지주용 반입 완료 차량 이력 목록 조회"
)
async def get_completed_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 1. 지주 소유의 하차지 ID 리스트 조회
    drop_off_query = select(DropOff.id).where(
        DropOff.owner_id == current_user.id,
        DropOff.status != "DELETED"
    )
    drop_off_result = await db.execute(drop_off_query)
    drop_off_ids = drop_off_result.scalars().all()

    if not drop_off_ids:
        return []

    # 2. 이 하차지들과 연동된 JobPost ID 리스트 조회
    job_query = select(JobPost.id).where(JobPost.matched_drop_off_id.in_(drop_off_ids))
    job_result = await db.execute(job_query)
    job_ids = job_result.scalars().all()

    if not job_ids:
        return []

    # 3. 상태가 'APPROVED'인 DispatchTicket 조회
    ticket_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id.in_(job_ids),
        DispatchTicket.status == "APPROVED"
    ).options(*get_ticket_eager_options()).order_by(DispatchTicket.completed_at.desc())

    ticket_result = await db.execute(ticket_query)
    tickets = ticket_result.scalars().all()
    return await attach_pricing_policy(tickets, db)


@router.get(
    "/job/{job_id}/tickets",
    response_model=List[DispatchTicketResponse],
    summary="특정 공고(JobPost)에 매칭/신청된 기사 배차 티켓 목록 조회",
    description="현장관리자가 자신의 배차 공고를 신청한 기사 목록 및 실시간 운행/진출입 현황을 조회합니다."
)
async def get_job_tickets(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. JobPost 유효성 확인
    job = await db.get(JobPost, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="존재하지 않는 배차 공고입니다."
        )

    # 2. 권한 검증: 관리자이거나, 해당 공고의 작성자이거나, 해당 현장 관리자이거나, 매칭된 하차지의 지주인지 확인
    is_authorized = current_user.is_admin or (job.author_id == current_user.id)

    if not is_authorized and job.site_id:
        site = await db.get(ConstructionSite, job.site_id)
        if site and site.user_id == current_user.id:
            is_authorized = True

    if not is_authorized and job.matched_drop_off_id:
        dropoff = await db.get(DropOff, job.matched_drop_off_id)
        if dropoff and dropoff.owner_id == current_user.id:
            is_authorized = True

    if not is_authorized and job.drop_off_request_id:
        req_query = select(DropOffRequest).where(DropOffRequest.id == job.drop_off_request_id)
        req_obj = (await db.execute(req_query)).scalar_one_or_none()
        if req_obj:
            dropoff = await db.get(DropOff, req_obj.drop_off_id)
            if dropoff and dropoff.owner_id == current_user.id:
                is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 배차 공고의 기사 목록을 조회할 권한이 없습니다."
        )

    # 3. 해당 공고에 연동된 DispatchTicket 목록 조회
    ticket_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id == job_id
    ).options(*get_ticket_eager_options()).order_by(DispatchTicket.accepted_at.desc())

    ticket_result = await db.execute(ticket_query)
    tickets = ticket_result.scalars().all()
    return await attach_pricing_policy(tickets, db)


@router.get(
    "/settlements/site-dump-expenses",
    summary="[현장관리자용] 현장별 덤프비(운송비) 실 DB 정산 대장 및 통계 조회"
)
async def get_site_dump_expenses(
    site_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    현장관리자(또는 관리자)가 본인 소속 공사현장의 배차 및 티켓(DispatchTicket)을 기반으로
    발생한 실제 덤프비 정산 내역과 현장별/기사별/운송사별 집계 통계를 조회합니다.
    """
    # 1. 대상 현장 목록 확인 (관리자면 전체, 현장관리자면 본인이 등록/소속된 현장)
    site_query = select(ConstructionSite)
    if not current_user.is_admin:
        site_query = site_query.where(ConstructionSite.user_id == current_user.id)
    
    if site_id:
        site_query = site_query.where(ConstructionSite.id == site_id)

    sites_res = await db.execute(site_query)
    sites = sites_res.scalars().all()
    site_ids = [s.id for s in sites]

    if not site_ids:
        return {
            "summary": {
                "totalAmount": 0,
                "driverCount": 0,
                "companyCount": 0,
                "completedTrips": 0,
                "pendingSettlementTrips": 0
            },
            "siteSummaries": [],
            "driverExpenses": [],
            "companyExpenses": []
        }

    # 2. 해당 현장들의 JobPost ID 조회
    job_query = select(JobPost).where(JobPost.site_id.in_(site_ids))
    jobs_res = await db.execute(job_query)
    jobs = jobs_res.scalars().all()
    job_map = {j.id: j for j in jobs}
    job_ids = list(job_map.keys())

    if not job_ids:
        return {
            "summary": {
                "totalAmount": 0,
                "driverCount": 0,
                "companyCount": 0,
                "completedTrips": 0,
                "pendingSettlementTrips": 0
            },
            "siteSummaries": [
                {
                    "siteId": s.id,
                    "siteName": s.site_name or s.company_name,
                    "totalAmount": 0,
                    "tripCount": 0,
                    "driverCount": 0
                } for s in sites
            ],
            "driverExpenses": [],
            "companyExpenses": []
        }

    # 3. 해당 배차들의 DispatchTicket 조회 (연관 eager loading)
    ticket_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id.in_(job_ids)
    ).options(*get_ticket_eager_options()).order_by(DispatchTicket.completed_at.desc(), DispatchTicket.id.desc())

    tickets_res = await db.execute(ticket_query)
    tickets = tickets_res.scalars().all()

    # 날짜 필터링 및 데이터 가공
    driver_items = []
    company_dict = {}
    site_summary_dict = {
        s.id: {
            "siteId": s.id,
            "siteName": s.site_name or s.company_name,
            "companyName": s.company_name,
            "totalAmount": 0,
            "tripCount": 0,
            "driverIds": set(),
            "dates": set()
        } for s in sites
    }

    total_amount = 0
    completed_trips = 0
    pending_trips = 0
    distinct_driver_ids = set()

    for t in tickets:
        job = job_map.get(t.job_post_id)
        if not job:
            continue

        work_date_str = ""
        if job.work_date:
            work_date_str = job.work_date.strftime("%Y-%m-%d")
        elif t.completed_at:
            work_date_str = t.completed_at.strftime("%Y-%m-%d")
        elif t.accepted_at:
            work_date_str = t.accepted_at.strftime("%Y-%m-%d")

        # 날짜 범위 필터
        if start_date and work_date_str and work_date_str < start_date:
            continue
        if end_date and work_date_str and work_date_str > end_date:
            continue

        site_obj = job.site
        site_id_val = site_obj.id if site_obj else job.site_id
        site_name_val = (site_obj.site_name or site_obj.company_name) if site_obj else "현장"

        # 금액 산출: 미터기 누적 운임 또는 배차 제시 단가
        fare = t.accumulated_fare if t.accumulated_fare and t.accumulated_fare > 0 else (job.offered_unit_price or 0)
        
        # 덤프비 정산 5단계 상태 매핑:
        # 1. SETTLEMENT_REVIEW (정산 검토) - 운행 완료 후 현장관리자 검토 대기
        # 2. SETTLEMENT_APPROVED (승인 완료) - 현장관리자 승인 완료, 송금(돈줌) 대기
        # 3. SETTLEMENT_PAID (송금 완료) - 현장관리자 송금 완료, 기사/수령처 최종 확인 대기
        # 4. SETTLEMENT_CONFIRMED (정산 완료) - 기사/수령처 최종 수령 확인 완료
        # 5. SETTLEMENT_DISPUTED (정산 분쟁/이의제기) - 금액 불일치 등 기사/운송사 이의 제기
        # 6. REJECTED / CANCELLED (반려/취소)
        is_cancelled = t.status in ["CANCELLED", "REJECTED"]
        
        if t.status == "SETTLEMENT_CONFIRMED":
            status_desc = "정산 완료"
            completed_trips += 1
        elif t.status == "SETTLEMENT_DISPUTED":
            if getattr(t, "dispute_type", None) == "SITE":
                status_desc = "현장 보류(이의)"
            else:
                status_desc = "기사 이의제기"
            pending_trips += 1
        elif t.status == "SETTLEMENT_PAID":
            status_desc = "송금 완료"
            completed_trips += 1
        elif t.status == "SETTLEMENT_APPROVED":
            status_desc = "승인 완료"
            completed_trips += 1
        elif t.status in ["APPROVED", "COMPLETED", "SETTLEMENT_REVIEW"]:
            status_desc = "정산 검토"
            completed_trips += 1
        elif t.status == "REJECTED":
            status_desc = "반려됨"
        elif t.status == "CANCELLED":
            status_desc = "취소됨"
        else:
            status_desc = "운행 진행중"
            pending_trips += 1

        # 취소/반려된 운행 건은 정산 덤프비 0원 처리 (정산 합산 및 운행횟수 집계 제외)
        if is_cancelled:
            fare = 0

        # 정상 완료 또는 운행 진행 건만 총 정산액 및 현장 집계에 반영
        if not is_cancelled:
            total_amount += fare
            if t.driver_id:
                distinct_driver_ids.add(t.driver_id)

            # 현장별 통계 누적
            if site_id_val in site_summary_dict:
                site_summary_dict[site_id_val]["totalAmount"] += fare
                site_summary_dict[site_id_val]["tripCount"] += 1
                if work_date_str:
                    site_summary_dict[site_id_val]["dates"].add(work_date_str)
                if t.driver_id:
                    site_summary_dict[site_id_val]["driverIds"].add(t.driver_id)

        driver_user = t.driver
        car_obj = t.car

        driver_name = driver_user.name if driver_user else "기사명 없음"
        driver_phone = driver_user.phone_number if driver_user else "-"
        car_plate = f"{car_obj.car_number} ({int(car_obj.tonnage)}톤)" if car_obj else "차량 미등록"
        
        # 소속 운송사 또는 개인 차주 구분 및 실제 정산금 수령 주체 판별
        recipient_type = "INDIVIDUAL"  # "COMPANY" or "INDIVIDUAL"
        company_name = "개인 차주"
        recipient_name = driver_name

        if car_obj and car_obj.owner:
            owner_user = car_obj.owner
            if getattr(owner_user, "is_owner", False) and owner_user.id != t.driver_id:
                recipient_type = "COMPANY"
                company_name = f"{owner_user.name} (운송사)"
                recipient_name = owner_user.name
            else:
                recipient_type = "INDIVIDUAL"
                company_name = "개인 차주"
                recipient_name = owner_user.name

        driver_items.append({
            "ticketId": f"TKT-#{t.id:04d}",
            "rawTicketId": t.id,
            "jobPostId": job.id,
            "date": work_date_str,
            "siteId": site_id_val,
            "siteName": site_name_val,
            "driverId": t.driver_id,
            "driverName": driver_name,
            "phone": driver_phone,
            "carPlate": car_plate,
            "recipientType": recipient_type,
            "recipientName": recipient_name,
            "companyName": company_name,
            "rawStatus": t.status,
            "status": status_desc,
            "disputeType": getattr(t, "dispute_type", None),
            "disputeReason": getattr(t, "dispute_reason", None),
            "disputeAmount": getattr(t, "dispute_amount", None),
            "disputedAt": t.disputed_at.strftime("%Y-%m-%d %H:%M") if getattr(t, "disputed_at", None) else None,
            "driveDistanceKm": t.drive_distance_km or 0,
            "unitPrice": job.offered_unit_price or 0,
            "totalFare": fare,
            "tripCount": 1
        })

        # 운송사별 집계 (취소/반려 건 제외)
        if not is_cancelled:
            if company_name not in company_dict:
                company_dict[company_name] = {
                    "companyName": company_name,
                    "siteId": site_id_val,
                    "siteName": site_name_val,
                    "driverIds": set(),
                    "totalTrips": 0,
                    "totalAmount": 0,
                    "taxInvoiceStatus": "발행 대기",
                    "status": "정산 진행중"
                }
            comp_entry = company_dict[company_name]
            if t.driver_id:
                comp_entry["driverIds"].add(t.driver_id)
            comp_entry["totalTrips"] += 1
            comp_entry["totalAmount"] += fare

    company_items = []
    for c_name, c_data in company_dict.items():
        company_items.append({
            "companyName": c_name,
            "siteId": c_data["siteId"],
            "siteName": c_data["siteName"],
            "driverCount": len(c_data["driverIds"]),
            "totalTrips": c_data["totalTrips"],
            "totalAmount": c_data["totalAmount"],
            "taxInvoiceStatus": c_data["taxInvoiceStatus"],
            "status": c_data["status"]
        })

    site_summaries = []
    for s_id, s_data in site_summary_dict.items():
        sorted_dates = sorted(list(s_data["dates"]))
        if not sorted_dates:
            period_str = "-"
        elif len(sorted_dates) == 1:
            period_str = sorted_dates[0]
        else:
            period_str = f"{sorted_dates[0]} ~ {sorted_dates[-1]}"

        site_summaries.append({
            "siteId": s_data["siteId"],
            "siteName": s_data["siteName"],
            "companyName": s_data.get("companyName", ""),
            "workDatePeriod": period_str,
            "startDate": sorted_dates[0] if sorted_dates else "",
            "endDate": sorted_dates[-1] if sorted_dates else "",
            "totalAmount": s_data["totalAmount"],
            "tripCount": s_data["tripCount"],
            "driverCount": len(s_data["driverIds"])
        })

    return {
        "summary": {
            "totalAmount": total_amount,
            "driverCount": len(distinct_driver_ids),
            "companyCount": len(company_items),
            "completedTrips": completed_trips,
            "pendingSettlementTrips": pending_trips
        },
        "siteSummaries": site_summaries,
        "driverExpenses": driver_items,
        "companyExpenses": company_items
    }


class SettlementStatusUpdateRequest(BaseModel):
    ticket_ids: List[int]
    target_status: str  # 'SETTLEMENT_APPROVED', 'SETTLEMENT_PAID', 'SETTLEMENT_CONFIRMED', 'SETTLEMENT_DISPUTED'
    dispute_type: Optional[str] = "SITE"  # 'SITE'(현장담당자 이의/보류) 또는 'DRIVER'(기사/차주 금액부족)
    dispute_reason: Optional[str] = None
    dispute_amount: Optional[int] = None


@router.post(
    "/settlements/tickets/status",
    summary="[정산 프로세스] 덤프비 정산 단계 상태 일괄/개별 업데이트 및 분쟁 처리"
)
async def update_settlement_status(
    req: SettlementStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    덤프비 정산 흐름을 진행합니다:
    1. 'SETTLEMENT_APPROVED' (현장관리자 검토 -> 정산 승인)
    2. 'SETTLEMENT_PAID' (현장관리자 승인 -> 송금 완료)
    3. 'SETTLEMENT_CONFIRMED' (기사/수령처 최종 확인 -> 정산 완료 또는 현장관리자 확정)
    4. 'SETTLEMENT_DISPUTED' (현장담당자 감액/보류 이의제기 또는 기사 수령금액 불일치 이의제기)
    """
    valid_statuses = [
        "SETTLEMENT_APPROVED", 
        "SETTLEMENT_PAID", 
        "SETTLEMENT_CONFIRMED", 
        "SETTLEMENT_DISPUTED"
    ]
    if req.target_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 정산 상태입니다. 가능한 상태: {valid_statuses}"
        )

    if not req.ticket_ids:
        return {"success": True, "updated_count": 0}

    # 해당 티켓들 조회
    query = select(DispatchTicket).where(DispatchTicket.id.in_(req.ticket_ids))
    res = await db.execute(query)
    tickets = res.scalars().all()

    now = datetime.now()
    updated_count = 0
    for t in tickets:
        t.status = req.target_status
        if req.target_status == "SETTLEMENT_DISPUTED":
            t.dispute_type = req.dispute_type or "SITE"
            t.dispute_reason = req.dispute_reason or ("현장담당자 검토 보류/이의제기" if req.dispute_type == "SITE" else "금액 불일치 이의제기")
            if req.dispute_amount is not None:
                t.dispute_amount = req.dispute_amount
            t.disputed_at = now
        elif req.target_status in ["SETTLEMENT_APPROVED", "SETTLEMENT_PAID", "SETTLEMENT_CONFIRMED"]:
            # 분쟁 해결 후 승인/재송금 또는 완료 시
            pass
        updated_count += 1

    await db.commit()
    return {"success": True, "updated_count": updated_count, "target_status": req.target_status}


class SoilSettlementStatusUpdateRequest(BaseModel):
    job_post_ids: List[int]
    target_status: str  # 'SETTLEMENT_REVIEW', 'SETTLEMENT_PAID', 'SETTLEMENT_CONFIRMED', 'SETTLEMENT_DISPUTED'
    dispute_type: Optional[str] = "SITE"  # 'SITE' 또는 'DROPOFF'
    dispute_reason: Optional[str] = None
    dispute_amount: Optional[int] = None


@router.get(
    "/settlements/site-soil-expenses",
    summary="[현장관리자용] 현장별 흙값(토사비) 실 DB 정산 대장 및 통계 조회"
)
async def get_site_soil_expenses(
    site_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    현장관리자(또는 플랫폼 관리자)가 본인 소속 공사현장의 덤프 모집 오더(JobPost)와
    매칭된 사토장(DropOffRequest / DropOff) 내역을 기반으로
    실제 발생한 흙값(토사비) 정산 내역과 통계를 작업일자 순으로 조회합니다.
    """
    # 1. 대상 현장 목록 확인 (관리자면 전체, 현장관리자면 본인이 등록/소속된 현장)
    site_query = select(ConstructionSite)
    if not current_user.is_admin:
        site_query = site_query.where(ConstructionSite.user_id == current_user.id)

    if site_id:
        site_query = site_query.where(ConstructionSite.id == site_id)

    sites_res = await db.execute(site_query)
    sites = sites_res.scalars().all()
    site_ids = [s.id for s in sites]

    if not site_ids:
        return {
            "summary": {
                "totalExpense": 0,
                "totalIncome": 0,
                "netBalance": 0,
                "totalCount": 0
            },
            "soilExpenses": []
        }

    from sqlalchemy.orm import selectinload

    # 2. 해당 현장들의 JobPost 조회 (작업일자 최신순 정렬)
    job_query = (
        select(JobPost)
        .where(JobPost.site_id.in_(site_ids))
        .options(
            selectinload(JobPost.site),
            selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off),
            selectinload(JobPost.matched_drop_off)
        )
        .order_by(JobPost.work_date.desc(), JobPost.id.desc())
    )
    jobs_res = await db.execute(job_query)
    jobs = jobs_res.scalars().all()

    # 3. 데이터 가공 및 필터링
    soil_items = []
    total_expense = 0
    total_income = 0

    # material_type 한글 매핑 딕셔너리
    material_type_map = {
        "GOOD_SOIL": "양질토사",
        "SOIL": "일반토사",
        "ROCK": "발파암/암버럭",
        "MUD_SOIL": "뻘흙/점토",
        "SAND": "모래/골재",
        "MIXED_SOIL": "혼합토사"
    }

    from datetime import timezone, timedelta
    kst_tz = timezone(timedelta(hours=9))

    for j in jobs:
        # KST 타임존 보정 (UTC -> KST)
        if j.work_date:
            dt = j.work_date if j.work_date.tzinfo else j.work_date.replace(tzinfo=timezone.utc)
            work_date_str = dt.astimezone(kst_tz).strftime("%Y-%m-%d")
        elif j.created_at:
            dt = j.created_at if j.created_at.tzinfo else j.created_at.replace(tzinfo=timezone.utc)
            work_date_str = dt.astimezone(kst_tz).strftime("%Y-%m-%d")
        else:
            work_date_str = ""

        # 날짜 범위 필터
        if start_date and work_date_str and work_date_str < start_date:
            continue
        if end_date and work_date_str and work_date_str > end_date:
            continue

        site_obj = j.site
        site_name_val = (site_obj.site_name or site_obj.company_name) if site_obj else "현장"

        # 하차 사토장명
        dropoff_name = j.drop_off_name or "사토장 미지정"

        # payer_type 판별: JobPost 우선, 없으면 DropOffRequest 참조
        raw_payer = j.payer_type
        if not raw_payer and j.drop_off_request:
            raw_payer = j.drop_off_request.payer_type

        # 표준 payerType: 'SITE_PAYS', 'SITE_RECEIVES', 'FREE'
        if raw_payer in ["SITE_PAYS", "CONSTRUCTION_SITE_PAYS"]:
            payer_type = "SITE_PAYS"
        elif raw_payer in ["SITE_RECEIVES", "DROPOFF_PAYS"]:
            payer_type = "SITE_RECEIVES"
        elif raw_payer == "FREE":
            payer_type = "FREE"
        else:
            payer_type = "SITE_PAYS"  # 기본 사토처리비 지출

        # 단가 및 수량
        unit_price = j.offered_unit_price or 0
        if unit_price == 0 and j.drop_off_request:
            unit_price = j.drop_off_request.unit_price or 0

        truck_count = j.required_trucks or 0
        total_amount = unit_price * truck_count if payer_type != "FREE" else 0

        if payer_type == "SITE_PAYS":
            total_expense += total_amount
        elif payer_type == "SITE_RECEIVES":
            total_income += total_amount

        # 토사 종류 표시명
        soil_type_raw = j.material_type or (j.drop_off_request.material_type if j.drop_off_request else "") or "일반토사"
        soil_type_name = material_type_map.get(soil_type_raw, soil_type_raw)

        # 흙값 정산 상태 매핑
        if j.status == "COMPLETED":
            status_desc = "정산 마감"
        elif j.status == "SETTLEMENT_CONFIRMED":
            status_desc = "수령 확인"
        elif j.status == "SETTLEMENT_PAID":
            status_desc = "송금 완료"
        elif j.status == "SETTLEMENT_DISPUTED":
            status_desc = "이의제기"
        elif j.status in ["CLOSED", "MATCHED"]:
            status_desc = "정산 검토"
        elif j.status == "OPEN":
            status_desc = "운행/모집중"
        else:
            status_desc = "정산 대기"

        disputed_at_str = ""
        if j.disputed_at:
            d_dt = j.disputed_at if j.disputed_at.tzinfo else j.disputed_at.replace(tzinfo=timezone.utc)
            disputed_at_str = d_dt.astimezone(kst_tz).strftime("%Y-%m-%d %H:%M")

        soil_items.append({
            "id": j.id,
            "jobPostId": f"JOB-#{j.id:04d}",
            "workDate": work_date_str,
            "siteId": j.site_id,
            "siteName": site_name_val,
            "dropoffName": dropoff_name,
            "soilType": soil_type_name,
            "payerType": payer_type,
            "unitPrice": unit_price,
            "truckCount": truck_count,
            "totalAmount": total_amount,
            "rawStatus": j.status,
            "status": status_desc,
            "disputeType": j.dispute_type,
            "disputeReason": j.dispute_reason,
            "disputeAmount": j.dispute_amount,
            "disputedAt": disputed_at_str,
        })

    return {
        "summary": {
            "totalExpense": total_expense,
            "totalIncome": total_income,
            "netBalance": total_income - total_expense,
            "totalCount": len(soil_items)
        },
        "soilExpenses": soil_items
    }


@router.get(
    "/settlements/dropoff-soil-settlements",
    summary="[하차지관리자용] 하차지별 흙값(사토비/토사매입) 실 DB 정산 대장 및 통계 조회"
)
async def get_dropoff_soil_settlements(
    drop_off_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    하차지관리자(또는 플랫폼 관리자)가 본인 운영 사토장(DropOff)과
    연동된 배차 오더(JobPost) 내역을 기반으로
    실제 발생한 흙값 정산 대장(수수료 수입 SITE_PAYS vs 토사매입 지출 SITE_RECEIVES)을 조회합니다.
    """
    from sqlalchemy.orm import selectinload

    # 1. 대상 하차지 목록 확인
    drop_query = select(DropOff)
    if not current_user.is_admin:
        drop_query = drop_query.where(DropOff.owner_id == current_user.id)

    if drop_off_id:
        drop_query = drop_query.where(DropOff.id == drop_off_id)

    drop_res = await db.execute(drop_query)
    drops = drop_res.scalars().all()
    drop_ids = [d.id for d in drops]

    if not drop_ids:
        return {
            "summary": {
                "totalIncome": 0,
                "totalExpense": 0,
                "netBalance": 0,
                "totalCount": 0
            },
            "soilSettlements": []
        }

    # 2. 하차지 요청(DropOffRequest) ID 목록 조회
    d_req_query = select(DropOffRequest.id).where(DropOffRequest.drop_off_id.in_(drop_ids))
    d_req_res = await db.execute(d_req_query)
    d_req_ids = [r[0] for r in d_req_res.fetchall()]

    # 3. 해당 하차지에 연결된 JobPost 조회 (drop_off_request_id 또는 matched_drop_off_id)
    job_query = (
        select(JobPost)
        .where(
            or_(
                JobPost.drop_off_request_id.in_(d_req_ids) if d_req_ids else False,
                JobPost.matched_drop_off_id.in_(drop_ids)
            )
        )
        .options(
            selectinload(JobPost.site),
            selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off),
            selectinload(JobPost.matched_drop_off)
        )
        .order_by(JobPost.work_date.desc(), JobPost.id.desc())
    )
    jobs_res = await db.execute(job_query)
    jobs = jobs_res.scalars().all()

    # 4. 데이터 가공
    material_type_map = {
        "GOOD_SOIL": "양질토사",
        "SOIL": "일반토사",
        "ROCK": "발파암/암버럭",
        "MUD_SOIL": "뻘흙/점토",
        "SAND": "모래/골재",
        "MIXED_SOIL": "혼합토사"
    }

    from datetime import timezone, timedelta
    kst_tz = timezone(timedelta(hours=9))

    settlement_items = []
    total_income = 0
    total_expense = 0

    for j in jobs:
        # KST 타임존 변환
        if j.work_date:
            dt = j.work_date if j.work_date.tzinfo else j.work_date.replace(tzinfo=timezone.utc)
            work_date_str = dt.astimezone(kst_tz).strftime("%Y-%m-%d")
        elif j.created_at:
            dt = j.created_at if j.created_at.tzinfo else j.created_at.replace(tzinfo=timezone.utc)
            work_date_str = dt.astimezone(kst_tz).strftime("%Y-%m-%d")
        else:
            work_date_str = ""

        if start_date and work_date_str and work_date_str < start_date:
            continue
        if end_date and work_date_str and work_date_str > end_date:
            continue

        site_obj = j.site
        site_name_val = (site_obj.site_name or site_obj.company_name) if site_obj else "현장"
        dropoff_name = j.drop_off_name or "사토장 미지정"

        # drop_off_id 파악
        matched_d_id = None
        if j.drop_off_request and j.drop_off_request.drop_off_id:
            matched_d_id = j.drop_off_request.drop_off_id
        elif j.matched_drop_off_id:
            matched_d_id = j.matched_drop_off_id

        # payer_type 판별
        raw_payer = j.payer_type
        if not raw_payer and j.drop_off_request:
            raw_payer = j.drop_off_request.payer_type

        if raw_payer in ["SITE_PAYS", "CONSTRUCTION_SITE_PAYS"]:
            payer_type = "SITE_PAYS"
        elif raw_payer in ["SITE_RECEIVES", "DROPOFF_PAYS"]:
            payer_type = "SITE_RECEIVES"
        elif raw_payer == "FREE":
            payer_type = "FREE"
        else:
            payer_type = "SITE_PAYS"

        unit_price = j.offered_unit_price or 0
        if unit_price == 0 and j.drop_off_request:
            unit_price = j.drop_off_request.unit_price or 0

        truck_count = j.required_trucks or 0
        total_amount = unit_price * truck_count if payer_type != "FREE" else 0

        # 하차지 관점: SITE_PAYS는 하차지의 수입, SITE_RECEIVES는 하차지의 지출
        if payer_type == "SITE_PAYS":
            total_income += total_amount
        elif payer_type == "SITE_RECEIVES":
            total_expense += total_amount

        soil_type_raw = j.material_type or (j.drop_off_request.material_type if j.drop_off_request else "") or "일반토사"
        soil_type_name = material_type_map.get(soil_type_raw, soil_type_raw)

        if j.status == "COMPLETED":
            status_desc = "정산 마감"
        elif j.status == "SETTLEMENT_CONFIRMED":
            status_desc = "수령 확인"
        elif j.status == "SETTLEMENT_PAID":
            status_desc = "송금 완료"
        elif j.status == "SETTLEMENT_DISPUTED":
            status_desc = "이의제기"
        elif j.status in ["CLOSED", "MATCHED"]:
            status_desc = "정산 검토"
        elif j.status == "OPEN":
            status_desc = "운행/모집중"
        else:
            status_desc = "정산 대기"

        disputed_at_str = ""
        if j.disputed_at:
            d_dt = j.disputed_at if j.disputed_at.tzinfo else j.disputed_at.replace(tzinfo=timezone.utc)
            disputed_at_str = d_dt.astimezone(kst_tz).strftime("%Y-%m-%d %H:%M")

        settlement_items.append({
            "id": j.id,
            "jobPostId": f"JOB-#{j.id:04d}",
            "workDate": work_date_str,
            "dropOffId": matched_d_id,
            "siteId": j.site_id,
            "siteName": site_name_val,
            "dropoffName": dropoff_name,
            "soilType": soil_type_name,
            "payerType": payer_type,
            "unitPrice": unit_price,
            "truckCount": truck_count,
            "totalAmount": total_amount,
            "rawStatus": j.status,
            "status": status_desc,
            "disputeType": j.dispute_type,
            "disputeReason": j.dispute_reason,
            "disputeAmount": j.dispute_amount,
            "disputedAt": disputed_at_str,
        })

    return {
        "summary": {
            "totalIncome": total_income,
            "totalExpense": total_expense,
            "netBalance": total_income - total_expense,
            "totalCount": len(settlement_items)
        },
        "soilSettlements": settlement_items
    }


@router.post(
    "/settlements/site-soil-expenses/status",
    summary="[공통/현장/하차지] 흙값 정산 상태 업데이트 및 이의제기 처리"
)
async def update_soil_settlement_status(
    req: SoilSettlementStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    흙값 정산 상태를 업데이트합니다:
    - 'SETTLEMENT_PAID': 송금 완료 (지급 주체가 송금 완료 처리)
    - 'SETTLEMENT_CONFIRMED': 수령 확인 (수취 주체가 입금 확인)
    - 'COMPLETED': 정산 최종 마감
    - 'SETTLEMENT_DISPUTED': 이의제기 / 정산 보류
    - 'CLOSED': 이의제기 보류 해제 및 정산 재검토
    """
    if not req.job_post_ids:
        return {"success": True, "updated_count": 0}

    query = select(JobPost).where(JobPost.id.in_(req.job_post_ids))
    res = await db.execute(query)
    jobs = res.scalars().all()

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    for j in jobs:
        if req.target_status == "SETTLEMENT_DISPUTED":
            j.status = "SETTLEMENT_DISPUTED"
            j.dispute_type = req.dispute_type or "SITE"
            j.dispute_reason = req.dispute_reason or "흙값 정산 금액/내역 불일치 이의제기"
            j.dispute_amount = req.dispute_amount
            j.disputed_at = now
        elif req.target_status == "CLOSED":  # 보류 해제 후 재검토
            j.status = "CLOSED"
        elif req.target_status == "SETTLEMENT_CONFIRMED":
            j.status = "SETTLEMENT_CONFIRMED"
        elif req.target_status == "SETTLEMENT_PAID":
            j.status = "SETTLEMENT_PAID"
        elif req.target_status == "COMPLETED":
            j.status = "COMPLETED"
        else:
            j.status = req.target_status

    await db.commit()
    return {"success": True, "updated_count": len(jobs), "target_status": req.target_status}





