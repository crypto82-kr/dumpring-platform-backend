from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.db import get_db
from app.models import User, DropOff
from app.api.auth import get_current_user
from app.schemas.locations import DropOffCreate, DropOffUpdate, DropOffResponse, DropOffCreateResponse

router = APIRouter()

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
