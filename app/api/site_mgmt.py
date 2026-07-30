from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import selectinload
import uuid
import re

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
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    biz_license_url: Optional[str] = None
    dust_report_url: Optional[str] = None
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
    managers: Optional[str] = Field(None, description="담당자 성명/연락처")
    biz_license_url: Optional[str] = Field(None, description="사업자등록증 서류 첨부 URL")
    dust_report_url: Optional[str] = Field(None, description="비산먼지 배출신고 필증 첨부 서류 URL")

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
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    worker_name: Optional[str] = None
    worker_phone: Optional[str] = None

class PendingWorkerResponse(BaseModel):
    user_id: int
    name: str
    phone_number: str
    status: str
    mapping_id: int


# --- Helper function for parsing managers ---
def parse_managers_string(managers_str: Optional[str]):
    if not managers_str:
        return None, None
    import re
    # Look for phone pattern like 010-xxxx-xxxx or 010xxxxxxxx or 02-xxx-xxxx
    phone_match = re.search(r'(0\d{1,2}-?\d{3,4}-?\d{4})', managers_str)
    phone = phone_match.group(1) if phone_match else None
    
    # The name is whatever is not the phone or parentheses
    name = managers_str
    if phone:
        name = name.replace(phone, "")
    name = re.sub(r'[\(\)\-\s,]+', ' ', name).strip()
    if not name:
        name = None
    return name, phone


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
    sql_query = select(ConstructionSite).options(selectinload(ConstructionSite.creator)).where(
        (ConstructionSite.site_key.ilike(f"%{query}%")) |
        (ConstructionSite.company_name.ilike(f"%{query}%"))
    )
    result = await db.execute(sql_query)
    sites = result.scalars().all()
    
    return [
        SiteSearchResponse(
            id=s.id,
            site_name=s.site_name or s.company_name or "현장명 없음",
            company_name=s.company_name,
            business_number=s.business_number,
            site_key=s.site_key or "",
            site_address=s.site_address,
            latitude=s.latitude,
            longitude=s.longitude,
            geofencing_radius=s.geofencing_radius,
            manager_name=s.manager_name or (s.creator.name if s.creator else None),
            manager_phone=s.manager_phone or (s.creator.phone_number if s.creator else None)
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
        m_name, m_phone = parse_managers_string(data.managers)
        site = ConstructionSite(
            user_id=current_user.id,
            site_name=data.site_name,
            company_name=data.company_name,
            business_number=data.business_number,
            site_key=site_key,
            site_address=data.site_address,
            latitude=data.latitude,
            longitude=data.longitude,
            geofencing_radius=data.geofencing_radius,
            billing_email=f"billing@{current_user.phone_number}.com",
            manager_name=m_name,
            manager_phone=m_phone,
            biz_license_url=data.biz_license_url,
            dust_report_url=data.dust_report_url
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
        site_name=site.site_name or site.company_name or "현장명 없음",
        company_name=site.company_name,
        business_number=site.business_number,
        site_key=site.site_key or "",
        site_address=site.site_address,
        latitude=site.latitude,
        longitude=site.longitude,
        geofencing_radius=site.geofencing_radius,
        manager_name=site.manager_name or current_user.name,
        manager_phone=site.manager_phone or current_user.phone_number,
        biz_license_url=site.biz_license_url,
        dust_report_url=site.dust_report_url
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
    mapped_site_ids = set()

    # 1. 현장관리자가 직접 개설(user_id)한 공사 현장들 포함
    created_sites_query = select(ConstructionSite).options(selectinload(ConstructionSite.creator)).where(ConstructionSite.user_id == current_user.id)
    created_res = await db.execute(created_sites_query)
    created_sites = created_res.scalars().all()

    for site in created_sites:
        mapped_site_ids.add(site.id)

        emp_q = select(SiteEmployee).options(selectinload(SiteEmployee.user)).where(SiteEmployee.site_id == site.id)
        emp_res = await db.execute(emp_q)
        emp_obj = emp_res.scalars().first()

        w_name = emp_obj.user.name if (emp_obj and emp_obj.user) else (emp_obj.name if emp_obj else None)
        w_phone = emp_obj.registered_phone if emp_obj else None

        response_list.append(
            UserMappingResponse(
                mapping_id=site.id,
                site_id=site.id,
                site_name=site.site_name or site.company_name or "현장명 없음",
                company_name=site.company_name,
                business_number=site.business_number,
                site_key=site.site_key or "",
                site_address=site.site_address,
                latitude=site.latitude,
                longitude=site.longitude,
                geofencing_radius=site.geofencing_radius or 200.0,
                status="APPROVED",
                created_at=site.created_at.strftime("%Y-%m-%d %H:%M:%S") if site.created_at else "",
                manager_name=site.manager_name or (site.creator.name if site.creator else None),
                manager_phone=site.manager_phone or (site.creator.phone_number if site.creator else None),
                worker_name=w_name,
                worker_phone=w_phone
            )
        )

    # 2. SiteUserMapping 매핑된 현장들 포함
    for m in mappings:
        if m.site_id in mapped_site_ids:
            continue
        site_query = select(ConstructionSite).options(selectinload(ConstructionSite.creator)).where(ConstructionSite.id == m.site_id)
        site_result = await db.execute(site_query)
        site = site_result.scalars().first()
        if site:
            mapped_site_ids.add(site.id)

            emp_q = select(SiteEmployee).options(selectinload(SiteEmployee.user)).where(SiteEmployee.site_id == site.id)
            emp_res = await db.execute(emp_q)
            emp_obj = emp_res.scalars().first()

            w_name = emp_obj.user.name if (emp_obj and emp_obj.user) else (emp_obj.name if emp_obj else None)
            w_phone = emp_obj.registered_phone if emp_obj else None

            response_list.append(
                UserMappingResponse(
                    mapping_id=m.id,
                    site_id=m.site_id,
                    site_name=site.site_name or site.company_name or "현장명 없음",
                    company_name=site.company_name,
                    business_number=site.business_number,
                    site_key=site.site_key or "",
                    site_address=site.site_address,
                    latitude=site.latitude,
                    longitude=site.longitude,
                    geofencing_radius=site.geofencing_radius or 200.0,
                    status=m.status.value,
                    created_at=m.created_at.strftime("%Y-%m-%d %H:%M:%S") if m.created_at else "",
                    manager_name=site.manager_name or (site.creator.name if site.creator else None),
                    manager_phone=site.manager_phone or (site.creator.phone_number if site.creator else None),
                    worker_name=w_name,
                    worker_phone=w_phone
                )
            )

    # 현장담당자의 경우 SiteEmployee 선등록 매칭 현장도 자동 포함
    if current_user.is_site_worker or True:
        raw_phone = current_user.phone_number or ""
        digits = re.sub(r"\D", "", raw_phone)
        formatted_phone = f"{digits[:3]}-{digits[3:7]}-{digits[7:]}" if len(digits) == 11 else raw_phone

        emp_q = select(SiteEmployee).options(selectinload(SiteEmployee.site).selectinload(ConstructionSite.creator), selectinload(SiteEmployee.user)).where(
            (SiteEmployee.user_id == current_user.id) |
            (SiteEmployee.registered_phone == raw_phone) |
            (SiteEmployee.registered_phone == formatted_phone) |
            (SiteEmployee.registered_phone == digits)
        )
        emp_res = await db.execute(emp_q)
        employees = emp_res.scalars().all()

        for emp in employees:
            if emp.site and emp.site.id not in mapped_site_ids:
                site = emp.site
                mapped_site_ids.add(site.id)

                w_name = emp.user.name if emp.user else (emp.name or current_user.name)
                w_phone = emp.registered_phone or current_user.phone_number

                response_list.append(
                    UserMappingResponse(
                        mapping_id=emp.id,
                        site_id=site.id,
                        site_name=site.site_name or site.company_name or "현장명 없음",
                        company_name=site.company_name,
                        business_number=site.business_number,
                        site_key=site.site_key or "",
                        site_address=site.site_address,
                        latitude=site.latitude,
                        longitude=site.longitude,
                        geofencing_radius=site.geofencing_radius or 200.0,
                        status="APPROVED",
                        created_at=emp.created_at.strftime("%Y-%m-%d %H:%M:%S") if emp.created_at else "",
                        manager_name=site.manager_name or (site.creator.name if site.creator else None),
                        manager_phone=site.manager_phone or (site.creator.phone_number if site.creator else None),
                        worker_name=w_name or "임꺽정",
                        worker_phone=w_phone
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


# --- B2B ConstructionSite CRUD APIs for Admin/Managers ---

class ConstructionSiteDetailResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    site_name: Optional[str] = None
    business_number: str
    billing_email: str
    site_key: Optional[str]
    site_address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    geofencing_radius: float
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateSiteRequest(BaseModel):
    company_name: Optional[str] = None
    site_name: Optional[str] = None
    business_number: Optional[str] = None
    site_address: Optional[str] = None
    billing_email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofencing_radius: Optional[float] = None
    managers: Optional[str] = None


@router.get(
    "/admin-sites",
    response_model=List[ConstructionSiteDetailResponse],
    summary="[어드민/현장관리자] 전체 공사현장 목록 조회"
)
async def list_all_sites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 플랫폼 어드민, 하차지 지주인 경우 전체 공사현장 리턴
    if current_user.is_admin or current_user.is_drop_off:
        query = select(ConstructionSite).options(selectinload(ConstructionSite.creator))
        result = await db.execute(query)
        sites = result.scalars().all()
    else:
        mapped_query = select(SiteUserMapping.site_id).where(
            SiteUserMapping.user_id == current_user.id,
            SiteUserMapping.status == SiteUserStatus.APPROVED
        )
        mapped_result = await db.execute(mapped_query)
        mapped_site_ids = mapped_result.scalars().all()
        
        query = select(ConstructionSite).options(selectinload(ConstructionSite.creator)).where(
            (ConstructionSite.user_id == current_user.id) | 
            (ConstructionSite.id.in_(mapped_site_ids))
        )
        result = await db.execute(query)
        sites = result.scalars().all()

    return [
        ConstructionSiteDetailResponse(
            id=s.id,
            user_id=s.user_id,
            company_name=s.company_name,
            site_name=s.site_name,
            business_number=s.business_number,
            billing_email=s.billing_email,
            site_key=s.site_key,
            site_address=s.site_address,
            latitude=s.latitude,
            longitude=s.longitude,
            geofencing_radius=s.geofencing_radius,
            manager_name=s.manager_name or (s.creator.name if s.creator else None),
            manager_phone=s.manager_phone or (s.creator.phone_number if s.creator else None)
        ) for s in sites
    ]


@router.post(
    "/admin-sites",
    response_model=ConstructionSiteDetailResponse,
    summary="[어드민/현장관리자] 신규 공사현장 등록"
)
async def admin_create_site(
    data: CreateSiteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    site_key = uuid.uuid4().hex[:6].upper()
    m_name, m_phone = parse_managers_string(data.managers)
    site = ConstructionSite(
        user_id=current_user.id,
        company_name=data.company_name,
        site_name=data.site_name,
        business_number=data.business_number,
        site_key=site_key,
        site_address=data.site_address,
        latitude=data.latitude or 37.5665,
        longitude=data.longitude or 126.9780,
        geofencing_radius=data.geofencing_radius,
        billing_email=f"billing@{current_user.phone_number}.com",
        manager_name=m_name,
        manager_phone=m_phone
    )
    db.add(site)
    await db.commit()
    
    # Query with creator loaded
    query = select(ConstructionSite).options(selectinload(ConstructionSite.creator)).where(ConstructionSite.id == site.id)
    result = await db.execute(query)
    site = result.scalars().first()

    return ConstructionSiteDetailResponse(
        id=site.id,
        user_id=site.user_id,
        company_name=site.company_name,
        site_name=site.site_name,
        business_number=site.business_number,
        billing_email=site.billing_email,
        site_key=site.site_key,
        site_address=site.site_address,
        latitude=site.latitude,
        longitude=site.longitude,
        geofencing_radius=site.geofencing_radius,
        manager_name=site.manager_name or (site.creator.name if site.creator else None),
        manager_phone=site.manager_phone or (site.creator.phone_number if site.creator else None)
    )


@router.put(
    "/admin-sites/{site_id}",
    response_model=ConstructionSiteDetailResponse,
    summary="[어드민/현장관리자] 공사현장 수정"
)
async def update_site_detail(
    site_id: int,
    data: UpdateSiteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ConstructionSite).where(ConstructionSite.id == site_id)
    result = await db.execute(query)
    site = result.scalars().first()
    if not site:
        raise HTTPException(status_code=404, detail="해당 현장을 찾을 수 없습니다.")

    # 제약 조건: 해당 현장에 매칭 완료(기사 모집 중) 또는 승인 대기 중인 활성 오더가 존재하면 수정 금지
    from app.models import JobPost
    active_job_query = select(JobPost).where(
        JobPost.site_id == site_id,
        JobPost.status.in_(["OPEN", "WAITING_APPROVAL"])
    )
    active_job_res = await db.execute(active_job_query)
    if active_job_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 매칭 완료(기사 모집 중)이거나 승인 대기 중인 배차 요청 오더가 존재하여 현장 기본 정보를 수정할 수 없습니다."
        )

    if data.company_name is not None:
        site.company_name = data.company_name
    if data.site_name is not None:
        site.site_name = data.site_name
    if data.business_number is not None:
        site.business_number = data.business_number
    if data.site_address is not None:
        site.site_address = data.site_address
    if data.billing_email is not None:
        site.billing_email = data.billing_email
    if data.latitude is not None:
        site.latitude = data.latitude
    if data.longitude is not None:
        site.longitude = data.longitude
    if data.geofencing_radius is not None:
        site.geofencing_radius = data.geofencing_radius
    if data.managers is not None:
        m_name, m_phone = parse_managers_string(data.managers)
        site.manager_name = m_name
        site.manager_phone = m_phone

    await db.commit()
    
    # Query with creator loaded
    query = select(ConstructionSite).options(selectinload(ConstructionSite.creator)).where(ConstructionSite.id == site_id)
    result = await db.execute(query)
    site = result.scalars().first()

    return ConstructionSiteDetailResponse(
        id=site.id,
        user_id=site.user_id,
        company_name=site.company_name,
        site_name=site.site_name,
        business_number=site.business_number,
        billing_email=site.billing_email,
        site_key=site.site_key,
        site_address=site.site_address,
        latitude=site.latitude,
        longitude=site.longitude,
        geofencing_radius=site.geofencing_radius,
        manager_name=site.manager_name or (site.creator.name if site.creator else None),
        manager_phone=site.manager_phone or (site.creator.phone_number if site.creator else None)
    )


@router.delete(
    "/admin-sites/{site_id}",
    summary="[어드민/현장관리자] 공사현장 삭제"
)
async def delete_site(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ConstructionSite).where(ConstructionSite.id == site_id)
    result = await db.execute(query)
    site = result.scalars().first()
    if not site:
        raise HTTPException(status_code=404, detail="해당 현장을 찾을 수 없습니다.")

    await db.delete(site)
    await db.commit()
    return {"message": "현장이 성공적으로 삭제되었습니다."}


# --- SiteEmployee (현장 소속 직원) 관리 APIs ---

from app.models import SiteEmployee
from app.schemas.site_mgmt import SiteEmployeeCreate, SiteEmployeeResponse

@router.get(
    "/{site_id}/employees",
    response_model=List[SiteEmployeeResponse],
    summary="공사현장의 소속 직원 목록 조회",
    description="현장관리자 전용 기능: 해당 현장에 소속되거나 선등록된 직원 목록을 조회합니다."
)
async def get_site_employees(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 권한 검사: 현재 사용자가 해당 현장에 승인된 관리자 또는 담당자/소장인지 확인
    check_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site_id,
        SiteUserMapping.user_id == current_user.id,
        SiteUserMapping.status == SiteUserStatus.APPROVED
    )
    check_result = await db.execute(check_query)
    is_manager = check_result.scalars().first()

    if not is_manager or (not current_user.is_site_manager and not current_user.is_site_worker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 현장의 승인 완료된 관리자(소장님) 또는 담당자만 직원 목록을 조회할 수 있습니다."
        )

    # SiteEmployee 조회
    emp_query = select(SiteEmployee).where(SiteEmployee.site_id == site_id)
    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()

    response_list = []
    for emp in employees:
        user_name = "가입 대기"
        status_str = "가입 대기"
        if emp.user_id:
            user_query = select(User).where(User.id == emp.user_id)
            user_result = await db.execute(user_query)
            user_obj = user_result.scalars().first()
            if user_obj:
                user_name = user_obj.name
                status_str = "가입 완료"

        response_list.append(
            SiteEmployeeResponse(
                id=emp.id,
                site_id=emp.site_id,
                registered_phone=emp.registered_phone,
                employee_role=emp.employee_role,
                user_id=emp.user_id,
                name=user_name,
                status=status_str
            )
        )
    return response_list


@router.post(
    "/{site_id}/employees",
    response_model=SiteEmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="공사현장에 신규 직원 선등록",
    description="현장관리자 전용 기능: 해당 현장에 소속될 직원을 휴대폰 번호로 선등록합니다."
)
async def register_site_employee(
    site_id: int,
    data: SiteEmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 권한 검사
    check_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site_id,
        SiteUserMapping.user_id == current_user.id,
        SiteUserMapping.status == SiteUserStatus.APPROVED
    )
    check_result = await db.execute(check_query)
    is_manager = check_result.scalars().first()

    if not is_manager or (not current_user.is_site_manager and not current_user.is_site_worker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 현장의 승인 완료된 관리자(소장님) 또는 담당자만 직원을 선등록할 수 있습니다."
        )

    # 중복 등록 확인
    exist_query = select(SiteEmployee).where(
        SiteEmployee.site_id == site_id,
        SiteEmployee.registered_phone == data.phone_number
    )
    exist_result = await db.execute(exist_query)
    existing_emp = exist_result.scalars().first()
    if existing_emp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 이 현장에 등록되어 있는 휴대폰 번호입니다."
        )

    # 해당 휴대폰 번호의 기 가입 유저가 있는지 체크
    user_query = select(User).where(User.phone_number == data.phone_number)
    user_result = await db.execute(user_query)
    matched_user = user_result.scalars().first()

    target_user_id = None
    user_name = "가입 대기"
    status_str = "가입 대기"

    if matched_user:
        target_user_id = matched_user.id
        user_name = matched_user.name
        status_str = "가입 완료"
        
        # 기 가입 유저인 경우 현장직원(is_site_worker) 권한 설정 보장
        matched_user.is_site_worker = True
        
        # 현장과 매핑 자동 생성 (APPROVED 상태)
        map_query = select(SiteUserMapping).where(
            SiteUserMapping.site_id == site_id,
            SiteUserMapping.user_id == matched_user.id
        )
        map_res = await db.execute(map_query)
        existing_map = map_res.scalars().first()
        if not existing_map:
            new_map = SiteUserMapping(
                site_id=site_id,
                user_id=matched_user.id,
                status=SiteUserStatus.APPROVED
            )
            db.add(new_map)
        else:
            existing_map.status = SiteUserStatus.APPROVED

    new_emp = SiteEmployee(
        site_id=site_id,
        user_id=target_user_id,
        registered_phone=data.phone_number,
        employee_role=data.employee_role
    )
    db.add(new_emp)
    await db.commit()
    await db.refresh(new_emp)

    return SiteEmployeeResponse(
        id=new_emp.id,
        site_id=new_emp.site_id,
        registered_phone=new_emp.registered_phone,
        employee_role=new_emp.employee_role,
        user_id=new_emp.user_id,
        name=user_name,
        status=status_str
    )


@router.delete(
    "/{site_id}/employees/{employee_id}",
    summary="공사현장 소속 직원 삭제/해제",
    description="현장관리자 전용 기능: 해당 현장에서 소속된 직원을 해제(삭제)합니다."
)
async def delete_site_employee(
    site_id: int,
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 권한 검사
    check_query = select(SiteUserMapping).where(
        SiteUserMapping.site_id == site_id,
        SiteUserMapping.user_id == current_user.id,
        SiteUserMapping.status == SiteUserStatus.APPROVED
    )
    check_result = await db.execute(check_query)
    is_manager = check_result.scalars().first()

    if not is_manager or (not current_user.is_site_manager and not current_user.is_site_worker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 현장의 승인 완료된 현장관리자 또는 현장담당자만 직원을 해제할 수 있습니다."
        )

    # 직원 조회
    emp_query = select(SiteEmployee).where(
        SiteEmployee.id == employee_id,
        SiteEmployee.site_id == site_id
    )
    emp_result = await db.execute(emp_query)
    employee = emp_result.scalars().first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 현장 직원을 찾을 수 없습니다."
        )

    # 만약 유저가 매핑되어 있었다면 현장 매핑 삭제 또는 상태 해제
    if employee.user_id:
        map_query = select(SiteUserMapping).where(
            SiteUserMapping.site_id == site_id,
            SiteUserMapping.user_id == employee.user_id
        )
        map_res = await db.execute(map_query)
        mapping = map_res.scalars().first()
        if mapping:
            await db.delete(mapping)

    await db.delete(employee)
    await db.commit()

    return {"message": "성공적으로 현장 직원이 소속 해제되었습니다."}


# --- Standalone Site Worker Personnel Management Schemas & Endpoints ---
class CreateStandaloneEmployeeRequest(BaseModel):
    name: str = Field(..., description="담당자 성명")
    phone_number: str = Field(..., description="휴대폰 번호")
    employee_role: str = Field("현장통제/도장", description="직책/역할")
    site_id: Optional[int] = Field(None, description="소속 현장 ID")

class UpdateStandaloneEmployeeRequest(BaseModel):
    name: Optional[str] = Field(None, description="담당자 성명")
    phone_number: Optional[str] = Field(None, description="휴대폰 번호")
    employee_role: Optional[str] = Field(None, description="직책/역할")
    site_id: Optional[int] = Field(None, description="소속 현장 ID")

class StandaloneEmployeeResponse(BaseModel):
    id: int
    name: str
    phone_number: str
    employee_role: str
    site_id: Optional[int] = None
    site_name: Optional[str] = None
    is_approved: bool
    status: str
    reject_reason: Optional[str] = None
    created_at: str

@router.get(
    "/all-employees",
    response_model=List[StandaloneEmployeeResponse],
    summary="[현장소장/어드민] 등록된 현장담당자 인원 전체 목록 조회"
)
async def list_all_standalone_employees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 어드민이면 전체, 그 외(현장소장/담당자)는 본인이 생성하거나 매핑된 현장의 담당자만 조회
    if current_user.is_admin:
        query = select(SiteEmployee).order_by(SiteEmployee.id.desc())
    else:
        # 로그인한 사용자가 소유한 현장 ID 목록
        own_sites_query = select(ConstructionSite.id).where(ConstructionSite.user_id == current_user.id)
        own_site_res = await db.execute(own_sites_query)
        own_site_ids = own_site_res.scalars().all()

        # 로그인한 사용자가 매핑(APPROVED)된 현장 ID 목록
        mapped_sites_query = select(SiteUserMapping.site_id).where(
            SiteUserMapping.user_id == current_user.id,
            SiteUserMapping.status == SiteUserStatus.APPROVED
        )
        mapped_site_res = await db.execute(mapped_sites_query)
        mapped_site_ids = mapped_site_res.scalars().all()

        allowed_site_ids = list(set(own_site_ids + mapped_site_ids))

        if allowed_site_ids:
            query = select(SiteEmployee).where(SiteEmployee.site_id.in_(allowed_site_ids)).order_by(SiteEmployee.id.desc())
        else:
            # 매핑되거나 소유한 현장이 없는 경우 빈 목록 리턴
            return []

    res = await db.execute(query)
    employees = res.scalars().all()
    
    result = []
    for emp in employees:
        site_name = None
        if emp.site_id:
            site_query = select(ConstructionSite).where(ConstructionSite.id == emp.site_id)
            site_res = await db.execute(site_query)
            site_obj = site_res.scalars().first()
            if site_obj:
                site_name = site_obj.site_name

        # User 테이블과 SiteEmployee 테이블 중 하나라도 승인(is_approved)되었으면 APPROVED로 판단
        is_approved_flag = emp.is_approved
        if not is_approved_flag and emp.user_id:
            u_query = select(User).where(User.id == emp.user_id)
            u_res = await db.execute(u_query)
            u_obj = u_res.scalars().first()
            if u_obj and u_obj.is_approved:
                is_approved_flag = True

        status_str = "APPROVED" if is_approved_flag else ("REJECTED" if emp.reject_reason else "PENDING")
        created_str = emp.created_at.strftime("%Y-%m-%d") if emp.created_at else ""
        result.append(StandaloneEmployeeResponse(
            id=emp.id,
            name=emp.name or "현장담당자",
            phone_number=emp.registered_phone,
            employee_role=emp.employee_role or "현장통제/도장",
            site_id=emp.site_id,
            site_name=site_name or "소속 현장 미지정",
            is_approved=is_approved_flag,
            status=status_str,
            reject_reason=emp.reject_reason,
            created_at=created_str
        ))
    return result

@router.post(
    "/all-employees",
    response_model=StandaloneEmployeeResponse,
    summary="[현장소장] 신규 현장담당자 인원 등록 및 소속 현장 매핑"
)
async def create_standalone_employee(
    data: CreateStandaloneEmployeeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 전화번호 입력 포맷 정규화 (01012345678 -> 010-1234-5678)
    digits = re.sub(r"\D", "", data.phone_number)
    if len(digits) == 11:
        formatted_phone = f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
    elif len(digits) == 10:
        formatted_phone = f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    else:
        formatted_phone = data.phone_number.strip()
    
    # 1. SiteEmployee 중복 검사 (하이픈 유무 상관없이 양쪽 모두 체크)
    emp_check = select(SiteEmployee).where(
        (SiteEmployee.registered_phone == formatted_phone) | (SiteEmployee.registered_phone == digits)
    )
    emp_res = await db.execute(emp_check)
    if emp_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이미 등록된 담당자 휴대폰 번호입니다. ({formatted_phone})"
        )

    # 2. 이미 회원가입된 User가 존재하는지 검사 및 자동 매칭 처리
    user_check = select(User).where(
        (User.phone_number == formatted_phone) | (User.phone_number == digits)
    )
    user_res = await db.execute(user_check)
    existing_user = user_res.scalars().first()

    matched_user_id = existing_user.id if existing_user else None
    if existing_user:
        existing_user.is_site_worker = True

    new_emp = SiteEmployee(
        name=data.name,
        registered_phone=formatted_phone,
        employee_role=data.employee_role,
        site_id=data.site_id,
        user_id=matched_user_id,
        is_approved=False
    )
    db.add(new_emp)
    await db.commit()
    await db.refresh(new_emp)

    site_name = None
    if new_emp.site_id:
        site_query = select(ConstructionSite).where(ConstructionSite.id == new_emp.site_id)
        site_res = await db.execute(site_query)
        site_obj = site_res.scalars().first()
        if site_obj:
            site_name = site_obj.site_name

    created_str = new_emp.created_at.strftime("%Y-%m-%d") if new_emp.created_at else ""
    return StandaloneEmployeeResponse(
        id=new_emp.id,
        name=new_emp.name,
        phone_number=new_emp.registered_phone,
        employee_role=new_emp.employee_role,
        site_id=new_emp.site_id,
        site_name=site_name or "소속 현장 미지정",
        is_approved=new_emp.is_approved,
        status="PENDING",
        reject_reason=None,
        created_at=created_str
    )

@router.put(
    "/all-employees/{employee_id}",
    response_model=StandaloneEmployeeResponse,
    summary="[현장소장] 현장담당자 인원 정보 및 소속 현장 수정"
)
async def update_standalone_employee(
    employee_id: int,
    data: UpdateStandaloneEmployeeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(SiteEmployee).where(SiteEmployee.id == employee_id)
    res = await db.execute(query)
    emp = res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="해당 현장담당자 인원을 찾을 수 없습니다.")

    if data.name is not None:
        emp.name = data.name
    if data.phone_number is not None:
        emp.registered_phone = data.phone_number
    if data.employee_role is not None:
        emp.employee_role = data.employee_role
    if data.site_id is not None:
        emp.site_id = data.site_id

    await db.commit()
    await db.refresh(emp)

    site_name = None
    if emp.site_id:
        site_query = select(ConstructionSite).where(ConstructionSite.id == emp.site_id)
        site_res = await db.execute(site_query)
        site_obj = site_res.scalars().first()
        if site_obj:
            site_name = site_obj.site_name

        status_str = "APPROVED" if emp.is_approved else ("REJECTED" if emp.reject_reason else "PENDING")
    created_str = emp.created_at.strftime("%Y-%m-%d") if emp.created_at else ""
    return StandaloneEmployeeResponse(
        id=emp.id,
        name=emp.name,
        phone_number=emp.registered_phone,
        employee_role=emp.employee_role,
        site_id=emp.site_id,
        site_name=site_name or "소속 현장 미지정",
        is_approved=emp.is_approved,
        status=status_str,
        reject_reason=emp.reject_reason,
        created_at=created_str
    )

@router.delete(
    "/all-employees/{employee_id}",
    summary="[현장소장] 현장담당자 인원 삭제"
)
async def delete_standalone_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(SiteEmployee).where(SiteEmployee.id == employee_id)
    res = await db.execute(query)
    emp = res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="해당 현장담당자를 찾을 수 없습니다.")

    # 연동된 User 계정 확인
    target_user = None
    if emp.user_id:
        u_res = await db.execute(select(User).where(User.id == emp.user_id))
        target_user = u_res.scalars().first()
    elif emp.registered_phone:
        u_res = await db.execute(select(User).where(User.phone_number == emp.registered_phone))
        target_user = u_res.scalars().first()

    emp.user_id = None
    await db.flush()
    await db.delete(emp)
    if target_user:
        await db.delete(target_user)

    await db.commit()
    return {"message": "현장담당자 인원 및 연동 유저 계정이 완전 삭제되었습니다."}

@router.post(
    "/all-employees/{employee_id}/approve",
    summary="[플랫폼어드민] 현장담당자 인원 승인/반려 처리"
)
async def approve_standalone_employee(
    employee_id: int,
    approve: bool = Query(..., description="True면 승인, False면 반려"),
    reason: Optional[str] = Query(None, description="반려 사유"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(SiteEmployee).where(SiteEmployee.id == employee_id)
    res = await db.execute(query)
    emp = res.scalars().first()
    if not emp:
        raise HTTPException(status_code=404, detail="해당 현장담당자를 찾을 수 없습니다.")

    if approve:
        emp.is_approved = True
        emp.reject_reason = None
    else:
        emp.is_approved = False
        emp.reject_reason = reason or "플랫폼 관리자 반려"

    await db.commit()
    return {"message": f"현장담당자 승인 처리 완료 (승인여부: {approve})"}

