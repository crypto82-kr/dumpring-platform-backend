from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, update
from typing import List, Optional
from datetime import datetime, date, timedelta

from app.core.db import get_db
from app.models import (
    User, JobPost, DropOff, DropOffRequest, ConstructionSite, 
    DriverFavoriteRegion, DispatchTicket, Driver, Car, CommonCode
)
from app.api.auth import get_current_user
from app.schemas.dispatch import (
    FavoriteRegionCreate, FavoriteRegionResponse,
    DispatchTicketResponse, InspectionRequest, ArriveRequest
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

    # 기본적으로 status='OPEN'인 모집공고를 대상
    query = select(JobPost).join(
        DropOff, JobPost.matched_drop_off_id == DropOff.id
    ).join(
        ConstructionSite, JobPost.site_id == ConstructionSite.id
    ).where(JobPost.status == "OPEN")

    # 검색어가 있을 경우 필터링 (현장명, 하차지명, 메모, 현장 ID)
    if search:
        search_term = f"%{search}%"
        from sqlalchemy import cast, String
        query = query.where(
            or_(
                ConstructionSite.company_name.like(search_term),
                DropOff.name.like(search_term),
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
        
        # 각 즐겨찾기 지역별로 LIKE 주소 매핑 OR 연산
        or_clauses = []
        for fav in favorites:
            if fav.sigungu == "전체":
                or_clauses.append(
                    DropOff.address.like(f"%{fav.sido}%")
                )
            else:
                or_clauses.append(
                    and_(
                        DropOff.address.like(f"%{fav.sido}%"),
                        DropOff.address.like(f"%{fav.sigungu}%")
                    )
                )
        query = query.where(or_(*or_clauses))

    # 직접 시도, 시군구 입력 필터 사용 시 (즐겨찾기 우선순위가 아닐 경우)
    else:
        if sido:
            query = query.where(DropOff.address.like(f"%{sido}%"))
        if sigungu and sigungu != "전체":
            query = query.where(DropOff.address.like(f"%{sigungu}%"))

    # 작업 예정일 날짜 필터 (yyyy-MM-dd 형식)
    if work_date:
        try:
            target_date = date.fromisoformat(work_date)
            # KST(UTC+9) 기준으로 해당 날짜의 시작과 끝을 UTC 시각으로 변환하여 조회
            from datetime import timezone as tz, timedelta as td
            kst = tz(td(hours=9))
            day_start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=kst)
            day_end = datetime.combine(target_date + td(days=1), datetime.min.time()).replace(tzinfo=kst)
            query = query.where(JobPost.work_date >= day_start, JobPost.work_date < day_end)
        except ValueError:
            pass  # 잘못된 날짜 형식은 무시

    # select(JobPost)와 함께 Site, DropOff, DropOffRequest 정보를 로드하도록 변경
    from sqlalchemy.orm import selectinload
    query = query.options(
        selectinload(JobPost.site),
        selectinload(JobPost.matched_drop_off),
        selectinload(JobPost.drop_off_request)
    ).order_by(JobPost.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    jobs = result.scalars().all()
    
    # 응답 객체에 이름 및 상세 데이터 세팅
    for j in jobs:
        # 단가 세팅 (상차지 제시 단가가 없으면 매치된 하차지 공고 단가 사용)
        if j.offered_unit_price is None and j.drop_off_request:
            j.offered_unit_price = j.drop_off_request.unit_price

        # 기본 회사명 세팅
        if j.site:
            j.site_name = j.site.company_name
            j.site_latitude = j.site.latitude
            j.site_longitude = j.site.longitude
            # 주소 매핑
            if "현대" in j.site.company_name:
                j.site_address = "인천 연수구 송도동 100-2"
            elif "GS" in j.site.company_name:
                j.site_address = "경기 김포시 대곶면 사토매립장 부근"
            else:
                j.site_address = f"현장 주소 (현장 ID {j.site_id} 부근)"
        
        if j.matched_drop_off:
            j.drop_off_name = j.matched_drop_off.name
            j.drop_off_latitude = j.matched_drop_off.latitude
            j.drop_off_longitude = j.matched_drop_off.longitude
            j.drop_off_address = j.matched_drop_off.address

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

    from sqlalchemy.orm import selectinload
    query = select(DispatchTicket).where(
        DispatchTicket.driver_id == current_user.id,
        DispatchTicket.status.in_(["ACCEPTED", "DRIVING", "ARRIVED"])
    ).options(
        selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request)
    )
    
    result = await db.execute(query)
    tickets = result.scalars().all()

    # 운행 우선순위 결정: DRIVING -> ARRIVED -> ACCEPTED 순
    def get_priority(t):
        if t.status == "DRIVING":
            return 0
        elif t.status == "ARRIVED":
            return 1
        return 2

    for ticket in tickets:
        if ticket.job_post:
            j = ticket.job_post
            if j.offered_unit_price is None and j.drop_off_request:
                j.offered_unit_price = j.drop_off_request.unit_price
            if j.site:
                j.site_name = j.site.company_name
                j.site_latitude = j.site.latitude
                j.site_longitude = j.site.longitude
                if "현대" in j.site.company_name:
                    j.site_address = "인천 연수구 송도동 100-2"
                elif "GS" in j.site.company_name:
                    j.site_address = "경기 김포시 대곶면 사토매립장 부근"
                else:
                    j.site_address = f"현장 주소 (현장 ID {j.site_id} 부근)"
            if j.matched_drop_off:
                j.drop_off_name = j.matched_drop_off.name
                j.drop_off_latitude = j.matched_drop_off.latitude
                j.drop_off_longitude = j.matched_drop_off.longitude
                j.drop_off_address = j.matched_drop_off.address

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
    return tickets


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

    from sqlalchemy.orm import selectinload
    query = select(DispatchTicket).where(
        DispatchTicket.driver_id == current_user.id,
        DispatchTicket.status.in_(["ACCEPTED", "DRIVING", "ARRIVED"])
    ).options(
        selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request)
    )
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    ticket = None
    if tickets:
        # DRIVING 우선 -> ARRIVED 우선 -> ACCEPTED 중에는 accepted_at 최신순
        driving_tickets = [t for t in tickets if t.status == "DRIVING"]
        arrived_tickets = [t for t in tickets if t.status == "ARRIVED"]
        accepted_tickets = [t for t in tickets if t.status == "ACCEPTED"]
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
        if j.site:
            j.site_name = j.site.company_name
            j.site_latitude = j.site.latitude
            j.site_longitude = j.site.longitude
            if "현대" in j.site.company_name:
                j.site_address = "인천 연수구 송도동 100-2"
            elif "GS" in j.site.company_name:
                j.site_address = "경기 김포시 대곶면 사토매립장 부근"
            else:
                j.site_address = f"현장 주소 (현장 ID {j.site_id} 부근)"
        if j.matched_drop_off:
            j.drop_off_name = j.matched_drop_off.name
            j.drop_off_latitude = j.matched_drop_off.latitude
            j.drop_off_longitude = j.matched_drop_off.longitude
            j.drop_off_address = j.matched_drop_off.address

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

    return ticket


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

    # 1.5. [내실 다지기 🚨] 실시간 차량 수락 대수 제한 체크
    # 현재 취소되거나 반려되지 않은 활성 배차 티켓 수량 조회
    active_tickets_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id == job_post_id,
        DispatchTicket.status.in_(["ACCEPTED", "DRIVING", "ARRIVED", "APPROVED"])
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
        DispatchTicket.status.in_(["ACCEPTED", "DRIVING", "ARRIVED"])
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
        DispatchTicket.status.in_(["ACCEPTED", "DRIVING", "ARRIVED"])
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
    await db.commit()
    
    # 직렬화 에러(500) 방지를 위해 selectinload 옵션으로 job_post와 관계 데이터를 함께 다시 조회
    from sqlalchemy.orm import selectinload
    res = await db.execute(
        select(DispatchTicket)
        .where(DispatchTicket.id == new_ticket.id)
        .options(selectinload(DispatchTicket.job_post))
    )
    ticket_to_return = res.scalars().first()
    return ticket_to_return


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
    from sqlalchemy.orm import selectinload
    query = select(DispatchTicket).where(
        DispatchTicket.id == ticket_id,
        DispatchTicket.driver_id == current_user.id
    ).options(selectinload(DispatchTicket.job_post))
    result = await db.execute(query)
    ticket = result.scalars().first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status != "ACCEPTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="미터기 가동을 시작할 수 없는 상태의 티켓입니다."
        )

    await validate_dispatch_status("DRIVING", db)
    ticket.status = "DRIVING"
    ticket.driving_started_at = datetime.now()

    await db.commit()
    await db.refresh(ticket)
    return ticket


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
    from sqlalchemy.orm import selectinload
    query = select(DispatchTicket).where(
        DispatchTicket.id == ticket_id,
        DispatchTicket.driver_id == current_user.id
    ).options(selectinload(DispatchTicket.job_post))
    result = await db.execute(query)
    ticket = result.scalars().first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운행 티켓을 찾을 수 없습니다."
        )

    if ticket.status != "ACCEPTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 운행을 기동하여 취소할 수 없습니다."
        )

    await validate_dispatch_status("CANCELLED", db)
    ticket.status = "CANCELLED"
    ticket.completed_at = datetime.now()

    await db.commit()
    await db.refresh(ticket)
    return ticket


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
    from sqlalchemy.orm import selectinload
    query = select(DispatchTicket).where(
        DispatchTicket.id == ticket_id,
        DispatchTicket.driver_id == current_user.id
    ).options(
        selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request)
    )
    result = await db.execute(query)
    ticket = result.scalars().first()

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
    return ticket


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
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 1. 티켓 조회
    from sqlalchemy.orm import selectinload
    ticket_query = select(DispatchTicket).where(
        DispatchTicket.id == ticket_id
    ).options(
        selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request)
    )
    ticket_result = await db.execute(ticket_query)
    ticket = ticket_result.scalars().first()

    if not ticket or ticket.status not in ["ARRIVED", "DRIVING"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="사토장 게이트에 아직 진입/도착 대기 중이거나 운행 중인 트럭이 아닙니다."
        )

    # 2. 하차지 소유주 정합 권한 검증
    job_query = select(JobPost).where(JobPost.id == ticket.job_post_id)
    job_result = await db.execute(job_query)
    job = job_result.scalars().first()

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
    # 만약 배차 신청한 모든 차량의 운행이 완료(APPROVED 또는 REJECTED 등)되었고,
    # 성공적으로 APPROVED된 티켓 대수가 B2B 공고의 목표 차량대수(required_trucks)에 도달하면 JobPost 자체를 완료(COMPLETED) 처리
    all_tickets_query = select(DispatchTicket).where(DispatchTicket.job_post_id == job.id)
    all_tickets_res = await db.execute(all_tickets_query)
    all_tickets = all_tickets_res.scalars().all()

    approved_count = sum(1 for t in all_tickets if t.status == "APPROVED")
    
    # 현재 승인 판정 건을 포함하여 카운트
    if decision_status == "APPROVED":
        approved_count += 1

    if approved_count >= job.required_trucks:
        job.status = "COMPLETED"

    await db.commit()
    await db.refresh(ticket)
    return ticket


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
    from sqlalchemy.orm import selectinload
    query = select(DispatchTicket).where(
        DispatchTicket.id == ticket_id
    ).options(
        selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
        selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request)
    )
    result = await db.execute(query)
    ticket = result.scalars().first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="요청하신 운행 티켓 정보를 찾을 수 없습니다."
        )
    return ticket


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

    # 3. 상태가 'ARRIVED'인 DispatchTicket 조회
    ticket_query = select(DispatchTicket).where(
        DispatchTicket.job_post_id.in_(job_ids),
        DispatchTicket.status == "ARRIVED"
    )
    ticket_result = await db.execute(ticket_query)
    return ticket_result.scalars().all()


