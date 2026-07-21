from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel

from app.core.db import get_db
import sqlalchemy as sa
from app.models import User, DropOff, DropOffRequest, JobPost, CommonCode, ConstructionSite
from app.api.auth import get_current_user
from app.schemas.locations import DropOffCreate, DropOffUpdate, DropOffResponse, DropOffCreateResponse
from app.schemas.jobs import DropOffRequestResponse, DropOffRequestCreate

router = APIRouter()

class UpdateDropOffRequestStatus(BaseModel):
    status: str # 'OPEN' 또는 'CLOSED'


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DropOffCreateResponse,
    summary="하차지 신규 등록",
    description="하차지 지주(DROP_OFF) 권한만 접근 가능. 새로운 하차지를 개설하고 소유자로 등록합니다."
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

    # 중복 개설 방지 로직 (동일 인허가번호 + 동일명)
    exist_query = select(DropOff).where(
        DropOff.permit_number == data.permit_number,
        DropOff.name == data.name,
        DropOff.status != "DELETED"
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


@router.get(
    "/me",
    response_model=List[DropOffResponse],
    summary="본인 소유 하차지 목록 조회",
    description="로그인한 하차지 지주 본인이 소유한 하차지 목록만 조회합니다. (삭제된 하차지는 제외)"
)
async def get_my_drop_offs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_drop_off:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="하차지 지주(DROP_OFF) 권한이 필요합니다."
        )

    query = select(DropOff).where(
        DropOff.owner_id == current_user.id,
        DropOff.status != "DELETED"
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.patch(
    "/requests/{request_id}/status",
    response_model=DropOffRequestResponse,
    summary="하차지 매립 수용 공고 상태 변경",
    description="하차지 지주가 본인이 올린 수용 공고의 활성 상태(OPEN/CLOSED)를 변경합니다."
)
async def update_drop_off_request_status(
    request_id: int,
    data: UpdateDropOffRequestStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(DropOffRequest).where(DropOffRequest.id == request_id)
    result = await db.execute(query)
    dropoff_req = result.scalars().first()

    if not dropoff_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 수용 공고를 찾을 수 없습니다."
        )

    drop_off_query = select(DropOff).where(DropOff.id == dropoff_req.drop_off_id)
    drop_off_result = await db.execute(drop_off_query)
    dropoff = drop_off_result.scalars().first()

    if not dropoff or (dropoff.owner_id != current_user.id and not current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인의 하차지 공고 상태만 변경할 수 있습니다."
        )

    new_status = data.status.upper()
    if new_status not in ["OPEN", "CLOSED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="상태값은 'OPEN' 또는 'CLOSED'여야 합니다."
        )

    # 제약 조건: CLOSED 상태로 전환 시, 대기 중이거나 진행 중인 매칭 오더가 없어야 함
    if new_status == "CLOSED":
        job_query = select(JobPost).where(
            sa.or_(
                JobPost.drop_off_request_id == request_id,
                JobPost.matched_drop_off_id == dropoff_req.drop_off_id
            ),
            JobPost.status.in_(["WAITING_APPROVAL", "OPEN"])
        )
        job_result = await db.execute(job_query)
        active_job = job_result.scalars().first()
        if active_job:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="현재 진행 중이거나 승인 대기 중인 매칭 오더가 존재하여 공고를 정지할 수 없습니다."
            )

    dropoff_req.status = new_status
    await db.commit()
    await db.refresh(dropoff_req)

    return dropoff_req


@router.patch(
    "/requests/{request_id}",
    response_model=DropOffRequestResponse,
    summary="하차지 매립 수용 공고 수정",
    description="하차지 지주가 본인이 올린 수용 공고의 상세 정보(토사 종류, 단가, 목표량 등)를 수정합니다. 단, 대기 중이거나 진행 중인 오더가 없어야 합니다."
)
async def update_drop_off_request(
    request_id: int,
    data: DropOffRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(DropOffRequest).where(DropOffRequest.id == request_id)
    result = await db.execute(query)
    dropoff_req = result.scalars().first()

    if not dropoff_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 수용 공고를 찾을 수 없습니다."
        )

    drop_off_query = select(DropOff).where(DropOff.id == dropoff_req.drop_off_id)
    drop_off_result = await db.execute(drop_off_query)
    dropoff = drop_off_result.scalars().first()

    if not dropoff or (dropoff.owner_id != current_user.id and not current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인의 하차지 공고만 수정할 수 있습니다."
        )

    # 제약 조건: 대기 중이거나 진행 중인 매칭 오더가 없어야 수정이 가능
    job_query = select(JobPost).where(
        sa.or_(
            JobPost.drop_off_request_id == request_id,
            JobPost.matched_drop_off_id == dropoff_req.drop_off_id
        ),
        JobPost.status.in_(["WAITING_APPROVAL", "OPEN"])
    )
    job_result = await db.execute(job_query)
    active_job = job_result.scalars().first()
    if active_job:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 진행 중이거나 승인 대기 중인 매칭 오더가 존재하여 공고 정보를 수정할 수 없습니다."
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

    # 데이터 업데이트
    dropoff_req.material_type = req_material
    dropoff_req.truck_type = req_truck
    dropoff_req.target_quantity = data.target_quantity
    dropoff_req.payer_type = req_payer
    dropoff_req.payment_method = req_method
    dropoff_req.unit_price = data.unit_price
    dropoff_req.has_washing_facility = data.has_washing_facility
    dropoff_req.night_work_allowed = data.night_work_allowed
    dropoff_req.rain_work_allowed = data.rain_work_allowed
    dropoff_req.start_date = data.start_date
    dropoff_req.end_date = data.end_date

    await db.commit()
    await db.refresh(dropoff_req)

    # 현장 매칭 요청 처리: matched_site_id가 주어진 경우 새 JobPost 생성
    if data.matched_site_id:
        # 해당 현장이 실제로 존재하고 본인이 관리 중인 현장인지 확인
        site_query = select(ConstructionSite).where(ConstructionSite.id == data.matched_site_id)
        site_result = await db.execute(site_query)
        target_site = site_result.scalars().first()

        if target_site:
            distance = None
            est_time = None
            if target_site.latitude and target_site.longitude and dropoff.latitude and dropoff.longitude:
                import math
                lat1, lon1 = target_site.latitude, target_site.longitude
                lat2, lon2 = dropoff.latitude, dropoff.longitude
                R = 6371.0
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                distance = round(R * c, 1)
                est_time = int(distance * 1.5 + 5)

            # WAITING_MATCH 상태인 기존 현장 공고가 존재하는지 확인
            waiting_match_query = select(JobPost).where(
                JobPost.site_id == data.matched_site_id,
                JobPost.status == "WAITING_MATCH"
            )
            waiting_match_result = await db.execute(waiting_match_query)
            waiting_match_job = waiting_match_result.scalars().first()

            if waiting_match_job:
                # 기존 현장 공고가 존재하면 새로 만들지 않고, 해당 공고의 상태를 WAITING_APPROVAL로 업데이트하고 수용 공고와 바인딩
                waiting_match_job.drop_off_request_id = dropoff_req.id
                waiting_match_job.matched_drop_off_id = dropoff_req.drop_off_id
                waiting_match_job.status = "WAITING_APPROVAL"
                waiting_match_job.offered_unit_price = dropoff_req.unit_price
                waiting_match_job.payer_type = dropoff_req.payer_type
                if distance is not None:
                    waiting_match_job.distance = distance
                if est_time is not None:
                    waiting_match_job.estimated_time = est_time
                await db.commit()
            else:
                # 이미 동일 공고에 대해 대기 중인 매칭 요청이 없는 경우에만 생성
                existing_query = select(JobPost).where(
                    JobPost.drop_off_request_id == dropoff_req.id,
                    JobPost.site_id == data.matched_site_id,
                    JobPost.status.in_(["WAITING_APPROVAL", "OPEN"])
                )
                existing_result = await db.execute(existing_query)
                existing_job = existing_result.scalars().first()

                if not existing_job:
                    new_job = JobPost(
                        site_id=data.matched_site_id,
                        drop_off_request_id=dropoff_req.id,
                        matched_drop_off_id=dropoff_req.drop_off_id,
                        author_id=current_user.id,
                        material_type=dropoff_req.material_type,
                        truck_type=dropoff_req.truck_type,
                        offered_unit_price=dropoff_req.unit_price,
                        payer_type=dropoff_req.payer_type,
                        work_date=dropoff_req.start_date,
                        required_trucks=dropoff_req.target_quantity,
                        status="WAITING_APPROVAL",
                        distance=distance,
                        estimated_time=est_time
                    )
                    db.add(new_job)
                    await db.commit()

    # 추가 바인딩 필드 설정
    dropoff_req.drop_off_name = dropoff.name
    dropoff_req.drop_off_address = dropoff.address

    return dropoff_req


@router.patch(
    "/{drop_off_id}",
    response_model=DropOffResponse,
    summary="하차지 정보 수정",
    description="본인이 소유한 하차지 정보의 세부 사항 및 상태를 변경합니다."
)
async def update_drop_off(
    drop_off_id: int,
    data: DropOffUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(DropOff).where(
        DropOff.id == drop_off_id,
        DropOff.status != "DELETED"
    )
    result = await db.execute(query)
    dropoff = result.scalars().first()

    if not dropoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="하차지 정보를 찾을 수 없거나 이미 삭제되었습니다."
        )

    if dropoff.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 하차지의 소유자만 정보를 변경할 수 있습니다."
        )

    update_dict = data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(dropoff, key, value)

    await db.commit()
    await db.refresh(dropoff)
    return dropoff


@router.delete(
    "/{drop_off_id}",
    summary="하차지 삭제 (소프트 딜리트)",
    description="본인이 소유한 하차지를 소프트 딜리트(상태값을 DELETED로 변경) 처리합니다."
)
async def delete_drop_off(
    drop_off_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(DropOff).where(
        DropOff.id == drop_off_id,
        DropOff.status != "DELETED"
    )
    result = await db.execute(query)
    dropoff = result.scalars().first()

    if not dropoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="하차지 정보를 찾을 수 없거나 이미 삭제되었습니다."
        )

    if dropoff.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 하차지의 소유자만 삭제를 진행할 수 있습니다."
        )

    # 소프트 딜리트 적용
    dropoff.status = "DELETED"
    await db.commit()

    return {"message": "하차지가 성공적으로 삭제되었습니다."}
