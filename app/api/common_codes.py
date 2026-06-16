from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.db import get_db
from app.models import User, CommonCode
from app.api.auth import get_current_user
from app.schemas.common_codes import CommonCodeCreate, CommonCodeResponse

router = APIRouter()

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=CommonCodeResponse,
    summary="신규 공통 코드 등록",
    description="시스템 관리자(ADMIN) 권한자 또는 테스트 환경에서 동적으로 공통 코드 정보를 추가합니다."
)
async def create_common_code(
    data: CommonCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 비즈니스 정책: 단순 지주/기사 권한이 아닌 시스템 관리자나 현장 관리자가 제어할 수 있도록 권한 확인
    # 현 실무 설계 편의상 시스템 전체 관리자(is_admin) 검증 적용
    if not current_user.is_admin and not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공통 코드 등록 권한이 없습니다. (관리자 권한 필요)"
        )

    # 중복 체크
    query = select(CommonCode).where(
        CommonCode.group_code == data.group_code.upper(),
        CommonCode.code == data.code.upper()
    )
    result = await db.execute(query)
    existing_code = result.scalars().first()

    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이미 '{data.group_code}' 그룹에 '{data.code}' 코드가 존재합니다."
        )

    new_code = CommonCode(
        group_code=data.group_code.upper(),
        code=data.code.upper(),
        code_name=data.code_name,
        display_order=data.display_order,
        is_active=data.is_active
    )
    db.add(new_code)
    await db.commit()
    await db.refresh(new_code)

    return new_code


@router.get(
    "/{group_code}",
    response_model=List[CommonCodeResponse],
    summary="특정 그룹의 활성 공통 코드 목록 조회",
    description="지정한 그룹 코드(예: MATERIAL_TYPE, TRUCK_TYPE) 하위의 활성화(is_active=True)된 공통 코드 목록을 정렬 순서대로 조회합니다."
)
async def get_common_codes_by_group(
    group_code: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(CommonCode).where(
        CommonCode.group_code == group_code.upper(),
        CommonCode.is_active == True
    ).order_by(CommonCode.display_order.asc(), CommonCode.id.asc())

    result = await db.execute(query)
    return result.scalars().all()


from app.schemas.common_codes import CommonCodeUpdate

@router.get(
    "",
    response_model=List[CommonCodeResponse],
    summary="전체 공통 코드 목록 조회"
)
async def get_all_common_codes(
    db: AsyncSession = Depends(get_db)
):
    query = select(CommonCode).order_by(CommonCode.group_code.asc(), CommonCode.display_order.asc(), CommonCode.id.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.put(
    "/{code_id}",
    response_model=CommonCodeResponse,
    summary="공통 코드 정보 수정"
)
async def update_common_code(
    code_id: int,
    data: CommonCodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin and not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공통 코드 수정 권한이 없습니다."
        )

    query = select(CommonCode).where(CommonCode.id == code_id)
    result = await db.execute(query)
    code_obj = result.scalars().first()

    if not code_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 공통 코드가 존재하지 않습니다."
        )

    if data.code_name is not None:
        code_obj.code_name = data.code_name
    if data.display_order is not None:
        code_obj.display_order = data.display_order
    if data.is_active is not None:
        code_obj.is_active = data.is_active

    await db.commit()
    await db.refresh(code_obj)
    return code_obj


@router.delete(
    "/{code_id}",
    summary="공통 코드 삭제"
)
async def delete_common_code(
    code_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin and not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공통 코드 삭제 권한이 없습니다."
        )

    query = select(CommonCode).where(CommonCode.id == code_id)
    result = await db.execute(query)
    code_obj = result.scalars().first()

    if not code_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 공통 코드가 존재하지 않습니다."
        )

    await db.delete(code_obj)
    await db.commit()
    return {"message": "공통 코드가 삭제되었습니다."}


from app.schemas.common_codes import MeterPricingPolicyUpdate

@router.put(
    "/pricing-policy",
    summary="미터기 요금 정산 정책 일괄 업데이트"
)
async def update_pricing_policy(
    data: MeterPricingPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin and not current_user.is_site_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공통 코드 등록 권한이 없습니다. (관리자 권한 필요)"
        )

    policy_mappings = {
        "CALCULATION_METHOD": data.calculation_method,
        "CONTINUOUS_DISTANCE_UNIT_FARE": str(data.continuous_distance_unit_fare),
        "CONTINUOUS_TIME_UNIT_FARE": str(data.continuous_time_unit_fare),
        "OVER_PLAN_DISTANCE_UNIT_FARE": str(data.over_plan_distance_unit_fare),
        "OVER_PLAN_TIME_UNIT_FARE": str(data.over_plan_time_unit_fare),
    }

    for key, val in policy_mappings.items():
        query = select(CommonCode).where(
            CommonCode.group_code == "METER_PRICING_POLICY",
            CommonCode.code == key
        )
        res = await db.execute(query)
        code_obj = res.scalars().first()
        if code_obj:
            code_obj.code_name = val
        else:
            new_code = CommonCode(
                group_code="METER_PRICING_POLICY",
                code=key,
                code_name=val,
                display_order=1,
                is_active=True
            )
            db.add(new_code)
            
    await db.commit()
    return {"message": "정산 정책이 성공적으로 반영되었습니다."}
