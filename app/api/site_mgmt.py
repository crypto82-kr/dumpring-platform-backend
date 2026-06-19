from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid

from app.core.db import get_db
from app.models import User, ConstructionSite, SiteUserMapping, SiteUserStatus, UnloadingSite
from app.api.auth import get_current_user

router = APIRouter()

# --- Pydantic Schemas ---
class CreateUnloadingSiteRequest(BaseModel):
    site_name: str = Field(..., description="하차지/사토장 명칭")
    preferred_soil_types: str = Field(..., description="수용 가능 토종 (예: NORMAL,ROCK,MUD,MIXED)")

class UnloadingSiteResponse(BaseModel):
    id: int
    site_name: str
    owner_name: str
    preferred_soil_types: str
    class Config:
        from_attributes = True
class SiteSearchResponse(BaseModel):
    id: int
    site_name: str
    company_name: str
    business_number: str
    site_key: str
    site_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofencing_radius: float = 200.0
    class Config:
        from_attributes = True

class SiteMappingRequest(BaseModel):
    site_key: str = Field(..., description="매핑할 현장의 고유 현장 키 (예: SITE-A1B2C3)")

class CreateSiteRequest(BaseModel):
    site_name: str = Field(..., description="현장명")
    company_name: str = Field(..., description="건설사/상호명")
    business_number: str = Field(..., description="사업자등록번호")
    site_address: Optional[str] = Field(None, description="현장 주소")
    latitude: Optional[float] = Field(None, description="위도")
    longitude: Optional[float] = Field(None, description="경도")
    geofencing_radius: float = Field(200.0, description="지오펜싱 반경 (기본 200m)")

class ApproveWorkerRequest(BaseModel):
    worker_id: int = Field(..., description="승인/반려할 현장담당자(User) ID")
    status: str = Field(..., description="APPROVED 또는 REJECTED")

class UserMappingResponse(BaseModel):
    mapping_id: int
    site_id: int
    site_name: str
    company_name: str
    business_number: str
    site_key: str
    site_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofencing_radius: float = 200.0
    status: str
    created_at: str

class PendingWorkerResponse(BaseModel):
    user_id: int
    name: str
    phone_number: str
    status: str
    mapping_id: int


# --- Endpoints ---

@router.get(
    "/search",
    response_model=List[SiteSearchResponse],
    summary="공사 현장 검색 (현장 키 기반)",
    description="현장담당자나 관리자가 설정창에서 현장 키(site_key)로 기존 현장을 검색합니다."
)
async def search_sites(
    query: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 현장 키(site_key)에 대한 완전 매핑 조회 또는 부분 조회
    sql_query = select(ConstructionSite).where(
        (ConstructionSite.site_key.ilike(f"%{query}%")) |
        (ConstructionSite.company_name.ilike(f"%{query}%"))
    )
    result = await db.execute(sql_query)
    sites = result.scalars().all()
    
    return [
        SiteSearchResponse(
            id=s.id,
            site_name=s.company_name,
            company_name=s.company_name,
            business_number=s.business_number,
            site_key=s.site_key or "",
            site_address=s.site_address,
            latitude=s.latitude,
            longitude=s.longitude,
            geofencing_radius=s.geofencing_radius
        ) for s in sites
    ]


@router.post(
    "/create-site",
    response_model=SiteSearchResponse,
    summary="설정창에서 신규 현장 개설 및 관리자 즉시 승인 매핑",
    description="현장관리자가 새로운 현장을 설정창에서 등록하고 즉시 APPROVED로 매핑됩니다."
)
async def create_site(
    data: CreateSiteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 현장관리자(소장)와 현장담당자(담당자) 모두 현장 개설 권한을 갖습니다.
    if not current_user.is_site_manager and not current_user.is_site_worker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현장관리자(소장님) 또는 현장담당자만 신규 현장을 개설할 수 있습니다."
        )

    # 중복 체크
    exist_query = select(ConstructionSite).where(
        ConstructionSite.business_number == data.business_number,
        ConstructionSite.company_name == data.company_name
    )
    exist_result = await db.execute(exist_query)
    site = exist_result.scalars().first()

    if not site:
        site_key = uuid.uuid4().hex[:6].upper()  # 순수 6자리 초대코드 발급
        site = ConstructionSite(
            user_id=current_user.id,
            company_name=data.company_name,
            business_number=data.business_number,
            site_key=site_key,
            site_address=data.site_address,
            latitude=data.latitude,
            longitude=data.longitude,
            geofencing_radius=data.geofencing_radius,
            billing_email=f"billing@{current_user.phone_number}.com"
        )
        db.add(site)
        await db.flush()

    # 이미 매핑되어 있는지 체크
    map_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site.id,
        SiteUserMapping.user_id == current_user.id
    )
    map_result = await db.execute(map_query)
    existing_mapping = map_result.scalars().first()

    if not existing_mapping:
        mapping = SiteUserMapping(
            site_id=site.id,
            user_id=current_user.id,
            status=SiteUserStatus.APPROVED
        )
        db.add(mapping)
        await db.commit()
    else:
        # 이미 매핑되어 있다면 승인 완료 상태로 보장
        existing_mapping.status = SiteUserStatus.APPROVED
        await db.commit()

    return SiteSearchResponse(
        id=site.id,
        site_name=site.company_name,
        company_name=site.company_name,
        business_number=site.business_number,
        site_key=site.site_key or "",
        site_address=site.site_address,
        latitude=site.latitude,
        longitude=site.longitude,
        geofencing_radius=site.geofencing_radius
    )


@router.post(
    "/map-site",
    status_code=status.HTTP_201_CREATED,
    summary="설정창에서 특정 현장 키를 입력하여 매핑 신청",
    description="현장 키(site_key)를 입력하여 매핑을 신청합니다. 담당자는 PENDING 상태로 대기하며, 관리자는 APPROVED로 바로 연결됩니다."
)
async def map_site(
    data: SiteMappingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 현장 키로 대상 현장 조회
    site_query = select(ConstructionSite).where(ConstructionSite.site_key == data.site_key)
    site_result = await db.execute(site_query)
    site = site_result.scalars().first()
    
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="올바르지 않은 현장 키입니다. 현장관리자(소장님)에게 올바른 키를 전달받아 입력해 주세요."
        )

    # 기존 매핑 여부 확인
    map_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site.id,
        SiteUserMapping.user_id == current_user.id
    )
    map_result = await db.execute(map_query)
    existing_mapping = map_result.scalars().first()

    if existing_mapping:
        if existing_mapping.status == SiteUserStatus.APPROVED:
            return {"message": "이미 승인 완료된 현장입니다.", "status": "APPROVED"}
        return {"message": "이미 승인 대기 중인 현장입니다.", "status": "PENDING"}

    # 권한에 따른 초기 상태 결정
    # 현장관리자와 현장담당자 모두 즉시 APPROVED로 매핑됩니다.
    is_site_role = current_user.is_site_manager or current_user.is_site_worker
    initial_status = SiteUserStatus.APPROVED if is_site_role else SiteUserStatus.PENDING

    mapping = SiteUserMapping(
        site_id=site.id,
        user_id=current_user.id,
        status=initial_status
    )
    db.add(mapping)
    await db.commit()

    return {
        "message": "성공적으로 신청되었습니다." if initial_status == SiteUserStatus.PENDING else "성공적으로 매핑 완료되었습니다.",
        "status": initial_status.value
    }


@router.get(
    "/my-mappings",
    response_model=List[UserMappingResponse],
    summary="로그인한 유저 본인의 소속 현장 및 승인 상태 리스트 조회"
)
async def get_my_mappings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(SiteUserMapping).where(SiteUserMapping.user_id == current_user.id)
    result = await db.execute(query)
    mappings = result.scalars().all()

    response_list = []
    for m in mappings:
        site_query = select(ConstructionSite).where(ConstructionSite.id == m.site_id)
        site_result = await db.execute(site_query)
        site = site_result.scalars().first()
        if site:
            response_list.append(
                UserMappingResponse(
                    mapping_id=m.id,
                    site_id=m.site_id,
                    site_name=site.company_name,
                    company_name=site.company_name,
                    business_number=site.business_number,
                    site_key=site.site_key or "",
                    site_address=site.site_address,
                    latitude=site.latitude,
                    longitude=site.longitude,
                    geofencing_radius=site.geofencing_radius or 200.0,
                    status=m.status.value,
                    created_at=m.created_at.strftime("%Y-%m-%d %H:%M:%S") if m.created_at else ""
                )
            )
    return response_list


@router.get(
    "/{site_id}/pending-workers",
    response_model=List[PendingWorkerResponse],
    summary="특정 현장의 대기 중인 담당자 목록 조회",
    description="현장관리자 전용 기능: 해당 현장의 PENDING 상태인 담당자 가입/매핑 리스트를 가져옵니다."
)
async def get_pending_workers(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site_id,
        SiteUserMapping.user_id == current_user.id,
        SiteUserMapping.status == SiteUserStatus.APPROVED
    )
    check_result = await db.execute(check_query)
    is_manager = check_result.scalars().first()

    # 현장관리자(소장) 또는 현장담당자가 해당 현장 APPROVED 매핑을 보유한 경우 조회 허용
    if not is_manager or (not current_user.is_site_manager and not current_user.is_site_worker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 현장의 승인 완료된 관리자(소장님) 또는 담당자만 조회할 수 있습니다."
        )

    pending_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site_id,
        SiteUserMapping.status == SiteUserStatus.PENDING
    )
    pending_result = await db.execute(pending_query)
    pending_mappings = pending_result.scalars().all()

    response_list = []
    for pm in pending_mappings:
        user_query = select(User).where(User.id == pm.user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalars().first()
        if user:
            response_list.append(
                PendingWorkerResponse(
                    user_id=user.id,
                    name=user.name,
                    phone_number=user.phone_number,
                    status=pm.status.value,
                    mapping_id=pm.id
                )
            )
    return response_list


@router.patch(
    "/{site_id}/approve-worker",
    summary="현장관리자의 담당자 승인 또는 반려 처리",
    description="현장관리자가 자신의 현장에 속한 특정 담당자의 PENDING 상태를 APPROVED 또는 REJECTED로 갱신합니다."
)
async def approve_worker(
    site_id: int,
    data: ApproveWorkerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site_id,
        SiteUserMapping.user_id == current_user.id,
        SiteUserMapping.status == SiteUserStatus.APPROVED
    )
    check_result = await db.execute(check_query)
    is_manager = check_result.scalars().first()

    # 현장관리자(소장) 또는 현장담당자가 해당 현장 APPROVED 매핑을 보유한 경우 승인/반려 허용
    if not is_manager or (not current_user.is_site_manager and not current_user.is_site_worker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 현장의 승인 완료된 관리자(소장님) 또는 담당자만 담당자를 승인/반려할 수 있습니다."
        )

    target_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site_id,
        SiteUserMapping.user_id == data.worker_id,
        SiteUserMapping.status == SiteUserStatus.PENDING
    )
    target_result = await db.execute(target_query)
    mapping = target_result.scalars().first()

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 현장에 대한 대기 중인 매핑 신청 정보가 존재하지 않습니다."
        )

    if data.status.upper() == "APPROVED":
        mapping.status = SiteUserStatus.APPROVED
    elif data.status.upper() == "REJECTED":
        mapping.status = SiteUserStatus.REJECTED
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않은 승인 상태값입니다. APPROVED 또는 REJECTED만 지원합니다."
        )

    await db.commit()
    return {
        "message": f"성공적으로 담당자가 {data.status} 처리되었습니다.",
        "site_id": site_id,
        "worker_id": data.worker_id,
        "status": mapping.status.value
    }


@router.post(
    "/create-unloading-site",
    response_model=UnloadingSiteResponse,
    summary="하차지 지주 전용 하차지 정보 등록",
    description="하차지 지주가 본인 소유의 사토장/하차지 정보를 신규 등록합니다."
)
async def create_unloading_site(
    data: CreateUnloadingSiteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(땅주인) 권한을 가진 계정만 하차지를 등록할 수 있습니다."
        )

    # 신규 하차지 생성
    unloading_site = UnloadingSite(
        user_id=current_user.id,
        site_name=data.site_name,
        owner_name=current_user.name,
        preferred_soil_types=data.preferred_soil_types
    )
    db.add(unloading_site)
    await db.commit()
    await db.refresh(unloading_site)
    
    return unloading_site


@router.get(
    "/my-unloading-sites",
    response_model=List[UnloadingSiteResponse],
    summary="지주 본인의 등록된 하차지 리스트 조회"
)
async def get_my_unloading_sites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주만 조회할 수 있습니다."
        )
        
    query = select(UnloadingSite).where(UnloadingSite.user_id == current_user.id)
    result = await db.execute(query)
    sites = result.scalars().all()
    return sites
