from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.core.db import get_db
from app.models import User, ConstructionSite, SiteUserMapping, SiteUserStatus, DropOff
from app.api.auth import get_current_user
from app.schemas.locations import SiteCreate, DropOffCreate, SiteCreateResponse, DropOffCreateResponse

router = APIRouter()

@router.post(
    "/sites",
    status_code=status.HTTP_201_CREATED,
    response_model=SiteCreateResponse,
    summary="상차지(공사현장) 개설",
    description="현장관리자(SITE_MANAGER) 권한만 접근 가능. 현장을 생성하고 마스터 관리자를 APPROVED 상태로 연결합니다."
)
async def create_site(
    data: SiteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현장관리자(SITE_MANAGER) 권한이 필요합니다."
        )

    # 중복 개설 방지 로직 (동일 건설사/상호명 + 동일 사업자등록번호)
    exist_query = select(ConstructionSite).where(
        ConstructionSite.business_number == data.business_number,
        ConstructionSite.company_name == data.company_name
    )
    exist_result = await db.execute(exist_query)
    existing_site = exist_result.scalars().first()

    if existing_site:
        # 이미 존재하는 현장이라면, 해당 현장에 대한 사용자의 매핑이 존재하는지 확인
        map_query = select(SiteUserMapping).where(
            SiteUserMapping.site_id == existing_site.id,
            SiteUserMapping.user_id == current_user.id
        )
        map_result = await db.execute(map_query)
        existing_mapping = map_result.scalars().first()

        if not existing_mapping:
            mapping = SiteUserMapping(
                site_id=existing_site.id,
                user_id=current_user.id,
                status=SiteUserStatus.APPROVED
            )
            db.add(mapping)
            await db.commit()
        elif existing_mapping.status != SiteUserStatus.APPROVED:
            existing_mapping.status = SiteUserStatus.APPROVED
            await db.commit()
        
        await db.refresh(existing_site)
        return SiteCreateResponse(
            message="이미 등록된 상차지(공사현장)이며, 관리자로 즉시 매핑되었습니다.",
            site=existing_site
        )

    # 6자리 초대코드 자동 생성
    site_key = uuid.uuid4().hex[:6].upper()
    
    # 1. ConstructionSite 생성
    new_site = ConstructionSite(
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
    db.add(new_site)
    await db.flush() # ID 획득을 위해 flush

    # 2. SiteUserMapping 생성 (status = APPROVED)
    mapping = SiteUserMapping(
        site_id=new_site.id,
        user_id=current_user.id,
        status=SiteUserStatus.APPROVED
    )
    db.add(mapping)
    await db.commit()
    await db.refresh(new_site)

    return SiteCreateResponse(
        message="상차지(공사현장)가 성공적으로 개설되었습니다.",
        site=new_site
    )


@router.post(
    "/drop-offs",
    status_code=status.HTTP_201_CREATED,
    response_model=DropOffCreateResponse,
    summary="하차지 개설",
    description="하차지 지주(DROP_OFF) 권한만 접근 가능. DropOff 레코드를 생성하고 요청한 유저를 소유자로 지정합니다."
)
async def create_drop_off(
    data: DropOffCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    # 하차지 중복 개설 방지 로직 (동일 인허가번호 + 동일명)
    exist_query = select(DropOff).where(
        DropOff.permit_number == data.permit_number,
        DropOff.name == data.name
    )
    exist_result = await db.execute(exist_query)
    existing_dropoff = exist_result.scalars().first()

    if existing_dropoff:
        if existing_dropoff.owner_id == current_user.id:
            return DropOffCreateResponse(
                message="이미 등록하신 하차지 정보가 존재합니다.",
                drop_off=existing_dropoff
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 동일한 인허가번호로 등록된 하차지가 존재합니다."
            )

    # DropOff 생성
    new_dropoff = DropOff(
        owner_id=current_user.id,
        name=data.name,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        radius_meter=data.radius_meter,
        permit_number=data.permit_number,
        status="ACTIVE"
    )
    db.add(new_dropoff)
    await db.commit()
    await db.refresh(new_dropoff)

    return DropOffCreateResponse(
        message="하차지가 성공적으로 개설되었습니다.",
        drop_off=new_dropoff
    )
