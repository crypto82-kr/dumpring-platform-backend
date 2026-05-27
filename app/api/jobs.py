from fastapi import APIRouter, Depends, status, HTTPException
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.db import get_db
from app.models import User, DropOff, DropOffRequest, JobPost, ConstructionSite, CommonCode
from app.api.auth import get_current_user
from app.schemas.jobs import (
    DropOffRequestCreate, DropOffRequestResponse,
    JobPostCreate, JobPostResponse,
    SiteJobPostCreate, JobMatchRequest
)

router = APIRouter()

# ==========================================
# 하차지 매립 수용 공고 관련 (기존 유지)
# ==========================================

@router.post(
    "/drop-offs/{drop_off_id}/requests",
    status_code=status.HTTP_201_CREATED,
    response_model=DropOffRequestResponse,
    summary="하차지 매립 수용 공고 등록",
    description="하차지 지주(DROP_OFF)가 본인 소유의 하차지에 대해 토사 매립 수용 공고(DropOffRequest)를 올립니다. 입력된 공통 코드들의 유효성을 동적으로 검증합니다."
)
async def create_drop_off_request(
    drop_off_id: int,
    data: DropOffRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 하차지 존재 여부 및 소유권 확인
    query = select(DropOff).where(
        DropOff.id == drop_off_id,
        DropOff.status != "DELETED"
    )
    result = await db.execute(query)
    dropoff = result.scalars().first()

    if not dropoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="하차지를 찾을 수 없거나 이미 삭제되었습니다."
        )

    if dropoff.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 소유한 하차지에 대해서만 공고를 올릴 수 있습니다."
        )

    # --- 하이브리드 공통 코드 무결성(Validation) 실시간 동적 검증 ---
    req_material = data.material_type.upper()
    req_truck = data.truck_type.upper()
    req_payer = data.payer_type.upper()
    req_method = data.payment_method.upper()

    code_query = select(CommonCode).where(
        CommonCode.is_active == True,
        sa.or_(
            sa.and_(CommonCode.group_code == 'MATERIAL_TYPE', CommonCode.code == req_material),
            sa.and_(CommonCode.group_code == 'TRUCK_TYPE', CommonCode.code == req_truck),
            sa.and_(CommonCode.group_code == 'PAYER_TYPE', CommonCode.code == req_payer),
            sa.and_(CommonCode.group_code == 'PAYMENT_METHOD', CommonCode.code == req_method)
        )
    )
    code_result = await db.execute(code_query)
    active_codes = code_result.scalars().all()

    found_groups = {c.group_code: c.code for c in active_codes}

    if 'MATERIAL_TYPE' not in found_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 토종 코드('{data.material_type}')입니다. 공통 코드에 등록되어 활성화된 값을 사용하세요."
        )
    if 'TRUCK_TYPE' not in found_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 차량 규격 코드('{data.truck_type}')입니다. 공통 코드에 등록되어 활성화된 값을 사용하세요."
        )
    if 'PAYER_TYPE' not in found_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 비용 지급 주체 코드('{data.payer_type}')입니다. 공통 코드에 등록되어 활성화된 값을 사용하세요."
        )
    if 'PAYMENT_METHOD' not in found_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 정산 방식 코드('{data.payment_method}')입니다. 공통 코드에 등록되어 활성화된 값을 사용하세요."
        )

    new_request = DropOffRequest(
        drop_off_id=drop_off_id,
        material_type=req_material,
        truck_type=req_truck,
        target_quantity=data.target_quantity,
        current_quantity=0,
        payer_type=req_payer,
        payment_method=req_method,
        unit_price=data.unit_price,
        has_washing_facility=data.has_washing_facility,
        night_work_allowed=data.night_work_allowed,
        rain_work_allowed=data.rain_work_allowed,
        start_date=data.start_date,
        end_date=data.end_date,
        status="OPEN"
    )
    db.add(new_request)
    await db.commit()
    await db.refresh(new_request)

    return new_request


@router.get(
    "/drop-offs/requests",
    response_model=List[DropOffRequestResponse],
    summary="열려있는 매립 공고 목록 조회",
    description="현장관리자(SITE_MANAGER)가 오더 작성 전, 현재 매립 신청을 받을 수 있는 열려있는 수용 공고(status='OPEN')들을 조회합니다."
)
async def get_open_drop_off_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현장관리자(SITE_MANAGER) 권한이 필요합니다."
        )

    query = select(DropOffRequest).where(DropOffRequest.status == "OPEN")
    result = await db.execute(query)
    return result.scalars().all()


# ==========================================
# 흐름 A: 하차지 먼저 → 상차지 오더 (기존)
# ==========================================

@router.post(
    "/jobs",
    status_code=status.HTTP_201_CREATED,
    response_model=JobPostResponse,
    summary="[흐름A] 하차지 공고 지정 → 현장 오더 작성",
    description="현장관리자(SITE_MANAGER)가 특정 하차지 매립 수용 공고를 지정하여 오더를 등록합니다. 초기 상태는 'WAITING_APPROVAL'입니다."
)
async def create_job_post(
    data: JobPostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현장관리자(SITE_MANAGER) 권한이 필요합니다."
        )

    # 1. 대상 공사현장 존재 여부 및 권한 확인
    site_query = select(ConstructionSite).where(ConstructionSite.id == data.site_id)
    site_result = await db.execute(site_query)
    site = site_result.scalars().first()

    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공사현장 정보를 찾을 수 없습니다."
        )

    if site.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 소유한 공사현장에 대해서만 모집 글을 등록할 수 있습니다."
        )

    # 2. 하차지 매립 수용 공고가 활성화 상태('OPEN')인지 확인
    request_query = select(DropOffRequest).where(
        DropOffRequest.id == data.drop_off_request_id,
        DropOffRequest.status == "OPEN"
    )
    request_result = await db.execute(request_query)
    dropoff_request = request_result.scalars().first()

    if not dropoff_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="선택한 하차지 매립 공고가 존재하지 않거나 닫힌 상태(CLOSED)입니다."
        )

    # 비즈니스 프리-체크: 이미 매칭된 대수 + 요청 대수가 목표 대수를 초과하는지 체크
    if dropoff_request.current_quantity + data.required_trucks > dropoff_request.target_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"요청하신 덤프 대수({data.required_trucks}대)가 수용 공고의 남은 여유 수량({dropoff_request.target_quantity - dropoff_request.current_quantity}대)을 초과합니다."
        )

    new_job = JobPost(
        site_id=data.site_id,
        drop_off_request_id=data.drop_off_request_id,
        author_id=current_user.id,
        work_date=data.work_date,
        required_trucks=data.required_trucks,
        status="WAITING_APPROVAL"
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    return new_job


@router.get(
    "/jobs/pending",
    response_model=List[JobPostResponse],
    summary="[흐름A] 대기 상태인 현장 오더 목록 조회",
    description="하차지 지주 본인이 소유한 하차지 수용 공고들에 대해 들어온 대기 상태(WAITING_APPROVAL)인 현장 오더 목록을 조회합니다."
)
async def get_pending_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 1. 사용자의 하차지 ID 목록 조회
    dropoff_query = select(DropOff.id).where(
        DropOff.owner_id == current_user.id,
        DropOff.status != "DELETED"
    )
    dropoff_result = await db.execute(dropoff_query)
    dropoff_ids = dropoff_result.scalars().all()

    if not dropoff_ids:
        return []

    # 2. 이 하차지들의 수용 공고 ID 목록 조회
    request_query = select(DropOffRequest.id).where(DropOffRequest.drop_off_id.in_(dropoff_ids))
    request_result = await db.execute(request_query)
    request_ids = request_result.scalars().all()

    if not request_ids:
        return []

    # 3. 이 공고들을 대상으로 대기 상태인 JobPost 조회
    job_query = select(JobPost).where(
        JobPost.drop_off_request_id.in_(request_ids),
        JobPost.status == "WAITING_APPROVAL"
    )
    job_result = await db.execute(job_query)
    return job_result.scalars().all()


@router.patch(
    "/jobs/{job_id}/approve",
    response_model=JobPostResponse,
    summary="[흐름A] 대기 상태인 덤프 모집 오더 최종 승인",
    description="해당 하차지 매립 수용 공고를 올린 지주(DROP_OFF) 권한을 가진 소유자만 호출하여 대기 중인 오더를 'OPEN' 상태로 승인합니다."
)
async def approve_job_post(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 1. JobPost 및 연결된 DropOffRequest, DropOff 조회
    query = select(JobPost).where(JobPost.id == job_id)
    result = await db.execute(query)
    job = result.scalars().first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="요청한 덤프 모집 오더를 찾을 수 없습니다."
        )

    if job.status != "WAITING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 처리되었거나 승인 완료(OPEN)된 오더입니다."
        )

    # 2. 권한 검증: 이 오더가 연결된 하차지 공고의 소유자가 현재 유저인지 확인
    request_query = select(DropOffRequest).where(DropOffRequest.id == job.drop_off_request_id)
    request_result = await db.execute(request_query)
    dropoff_request = request_result.scalars().first()

    if not dropoff_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="연결된 하차지 공고 정보를 찾을 수 없습니다."
        )

    dropoff_query = select(DropOff).where(DropOff.id == dropoff_request.drop_off_id)
    dropoff_result = await db.execute(dropoff_query)
    dropoff = dropoff_result.scalars().first()

    if not dropoff or dropoff.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 오더가 지정한 하차지 수용 공고의 소유자만 승인 처리를 진행할 수 있습니다."
        )

    # 3. 비즈니스 검증: 승인 시 목표 대수를 초과하는지 트랜잭션 내 락 및 검증 수행
    if dropoff_request.current_quantity + job.required_trucks > dropoff_request.target_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이 오더를 승인할 경우, 수용 공고의 목표 대수({dropoff_request.target_quantity}대)를 초과하게 됩니다. (현재 매칭: {dropoff_request.current_quantity}대, 추가 요청: {job.required_trucks}대)"
        )

    # 4. 승인 처리: 상태 전환 및 현재 매칭 대수 누적 가산
    job.status = "OPEN"
    dropoff_request.current_quantity += job.required_trucks

    # 목표 대수에 도달한 경우 수용 공고를 자동으로 닫음(CLOSED) 처리
    if dropoff_request.current_quantity >= dropoff_request.target_quantity:
        dropoff_request.status = "CLOSED"

    await db.commit()
    await db.refresh(job)

    return job


# ==========================================
# 흐름 B: 상차지 먼저 → 하차지 매칭 (신규 ✨)
# ==========================================

@router.post(
    "/jobs/site-post",
    status_code=status.HTTP_201_CREATED,
    response_model=JobPostResponse,
    summary="[흐름B] 상차지가 하차지 없이 모집 공고 먼저 등록",
    description="현장관리자(SITE_MANAGER)가 하차지를 지정하지 않고 먼저 덤프 모집 공고를 올립니다. 초기 상태는 'WAITING_MATCH'(하차지 매칭 대기)입니다."
)
async def create_site_job_post(
    data: SiteJobPostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현장관리자(SITE_MANAGER) 권한이 필요합니다."
        )

    # 1. 대상 공사현장 존재 여부 및 권한 확인
    site_query = select(ConstructionSite).where(ConstructionSite.id == data.site_id)
    site_result = await db.execute(site_query)
    site = site_result.scalars().first()

    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공사현장 정보를 찾을 수 없습니다."
        )

    if site.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 소유한 공사현장에 대해서만 모집 글을 등록할 수 있습니다."
        )

    # 2. 공통 코드 유효성 검증 (material_type, truck_type, payer_type)
    req_material = data.material_type.upper()
    req_truck = data.truck_type.upper()
    req_payer = data.payer_type.upper()

    code_query = select(CommonCode).where(
        CommonCode.is_active == True,
        sa.or_(
            sa.and_(CommonCode.group_code == 'MATERIAL_TYPE', CommonCode.code == req_material),
            sa.and_(CommonCode.group_code == 'TRUCK_TYPE', CommonCode.code == req_truck),
            sa.and_(CommonCode.group_code == 'PAYER_TYPE', CommonCode.code == req_payer)
        )
    )
    code_result = await db.execute(code_query)
    active_codes = code_result.scalars().all()
    found_groups = {c.group_code: c.code for c in active_codes}

    if 'MATERIAL_TYPE' not in found_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 토종 코드('{data.material_type}')입니다."
        )
    if 'TRUCK_TYPE' not in found_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 차량 규격 코드('{data.truck_type}')입니다."
        )
    if 'PAYER_TYPE' not in found_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 비용 지급 주체 코드('{data.payer_type}')입니다."
        )

    # 3. 하차지 미지정 상태로 JobPost 생성 (WAITING_MATCH)
    new_job = JobPost(
        site_id=data.site_id,
        drop_off_request_id=None,  # 하차지 미지정
        author_id=current_user.id,
        material_type=req_material,
        truck_type=req_truck,
        offered_unit_price=data.offered_unit_price,
        payer_type=req_payer,
        memo=data.memo,
        work_date=data.work_date,
        required_trucks=data.required_trucks,
        status="WAITING_MATCH"
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    return new_job


@router.get(
    "/jobs/waiting-match",
    response_model=List[JobPostResponse],
    summary="[흐름B] 하차지 매칭 대기 중인 상차지 공고 목록 조회",
    description="하차지 지주(DROP_OFF)가 현재 하차지 매칭을 기다리고 있는 상차지 모집 공고 목록을 조회합니다."
)
async def get_waiting_match_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    query = select(JobPost).where(JobPost.status == "WAITING_MATCH")
    result = await db.execute(query)
    return result.scalars().all()


@router.patch(
    "/jobs/{job_id}/match",
    response_model=JobPostResponse,
    summary="[흐름B] 하차지 지주가 상차지 공고에 매칭 요청",
    description="하차지 지주(DROP_OFF)가 매칭 대기 중인(WAITING_MATCH) 상차지 공고에 본인 하차지를 매칭 요청합니다. 상차지 관리자의 최종 승인 후 기사 모집이 시작됩니다."
)
async def match_job_post(
    job_id: int,
    data: JobMatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 1. JobPost 조회 및 상태 확인
    job_query = select(JobPost).where(JobPost.id == job_id)
    job_result = await db.execute(job_query)
    job = job_result.scalars().first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 모집 공고를 찾을 수 없습니다."
        )

    if job.status != "WAITING_MATCH":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이 공고는 현재 '{job.status}' 상태로, 하차지 매칭 대기(WAITING_MATCH) 상태가 아닙니다."
        )

    if job.matched_drop_off_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 다른 하차지가 매칭 요청 중인 공고입니다."
        )

    # 2. 하차지 소유권 확인
    dropoff_query = select(DropOff).where(
        DropOff.id == data.drop_off_id,
        DropOff.status != "DELETED"
    )
    dropoff_result = await db.execute(dropoff_query)
    dropoff = dropoff_result.scalars().first()

    if not dropoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="하차지 정보를 찾을 수 없거나 삭제되었습니다."
        )

    if dropoff.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 소유한 하차지만 매칭 요청할 수 있습니다."
        )

    # 3. 매칭 요청: 하차지 ID 연결 & 상태를 WAITING_APPROVAL로 전환
    job.matched_drop_off_id = data.drop_off_id
    job.status = "WAITING_APPROVAL"

    await db.commit()
    await db.refresh(job)

    return job


@router.patch(
    "/jobs/{job_id}/confirm-match",
    response_model=JobPostResponse,
    summary="[흐름B] 상차지 관리자가 하차지 매칭을 최종 승인 → 기사 모집 OPEN",
    description="상차지 관리자(SITE_MANAGER)가 하차지의 매칭 요청을 최종 승인하여 기사 모집(OPEN) 상태로 전환합니다."
)
async def confirm_match_job_post(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현장관리자(SITE_MANAGER) 권한이 필요합니다."
        )

    # 1. JobPost 조회
    job_query = select(JobPost).where(JobPost.id == job_id)
    job_result = await db.execute(job_query)
    job = job_result.scalars().first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 모집 공고를 찾을 수 없습니다."
        )

    # 2. 상차지 소유권 확인
    site_query = select(ConstructionSite).where(ConstructionSite.id == job.site_id)
    site_result = await db.execute(site_query)
    site = site_result.scalars().first()

    if not site or site.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 소유한 공사현장의 공고만 매칭 승인할 수 있습니다."
        )

    # 3. 상태 확인: WAITING_APPROVAL이고 matched_drop_off_id가 있어야 함 (흐름 B의 매칭 승인)
    if job.status != "WAITING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이 공고는 현재 '{job.status}' 상태로, 승인 대기(WAITING_APPROVAL) 상태가 아닙니다."
        )

    if job.matched_drop_off_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이 공고에 아직 하차지 매칭 요청이 없습니다."
        )

    # 4. 최종 승인: OPEN으로 전환
    job.status = "OPEN"

    await db.commit()
    await db.refresh(job)

    return job


# ==========================================
# 통합 조회: 내 공고 목록 (상차지 관리자용)
# ==========================================

@router.get(
    "/jobs/my-posts",
    response_model=List[JobPostResponse],
    summary="내가 올린 모집 공고 전체 조회 (상차지 관리자용)",
    description="현장관리자(SITE_MANAGER)가 본인이 작성한 모든 모집 공고를 조회합니다. (흐름 A + 흐름 B 통합)"
)
async def get_my_job_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현장관리자(SITE_MANAGER) 권한이 필요합니다."
        )

    query = select(JobPost).where(JobPost.author_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()
