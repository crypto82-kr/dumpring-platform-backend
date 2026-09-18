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



from app.schemas.common_codes import MeterPricingPolicyUpdate, PricingPolicyResponse, TonnageTariffItem
import json

@router.get(
    "/pricing-policy",
    response_model=PricingPolicyResponse,
    summary="수수료, 운임 및 미터기/피크타임 정산 정책 통합 조회"
)
async def get_pricing_policy(
    db: AsyncSession = Depends(get_db)
):
    # 1. DB의 실제 차량 규격(TRUCK_TYPE) 공통코드 조회
    res_truck_types = await db.execute(
        select(CommonCode)
        .where(CommonCode.group_code == "TRUCK_TYPE", CommonCode.is_active == True)
        .order_by(CommonCode.display_order.asc())
    )
    truck_types = res_truck_types.scalars().all()

    # 1-1. 만약 TRUCK_TYPE 자체가 없다면 기본 규격(T_15, T_25, T_27) 자동 등록
    if not truck_types:
        default_tt = [
            ("T_15", "15톤", 1),
            ("T_25", "25톤", 2),
            ("T_27", "27톤", 3),
        ]
        truck_types = []
        for code, name, order in default_tt:
            new_tt = CommonCode(group_code="TRUCK_TYPE", code=code, code_name=name, display_order=order, is_active=True)
            db.add(new_tt)
            truck_types.append(new_tt)
        await db.commit()

    # 1-2. 각 TRUCK_TYPE 코드에 매핑된 운임 단가(TONNAGE_TARIFF) 조회
    res_ton = await db.execute(
        select(CommonCode)
        .where(CommonCode.group_code == "TONNAGE_TARIFF", CommonCode.is_active == True)
        .order_by(CommonCode.display_order.asc())
    )
    ton_dict = {tc.code: tc for tc in res_ton.scalars().all()}

    # 기본 단가 맵 (원)
    default_tariffs = {
        "T_15": (140000, "준중형 덤프트럭"),
        "T_25": (180000, "대형 덤프트럭"),
        "T_27": (220000, "초대형 덤프트럭"),
    }

    tonnage_tariffs = []
    has_new_tariff = False
    for tt in truck_types:
        tc = ton_dict.get(tt.code)
        if tc:
            try:
                parsed = json.loads(tc.code_name)
                tonnage_tariffs.append(TonnageTariffItem(
                    code=tt.code,
                    name=tt.code_name or parsed.get("name", tt.code),
                    desc=parsed.get("desc", ""),
                    base_tariff=int(parsed.get("base_tariff", 180000))
                ))
            except Exception:
                tonnage_tariffs.append(TonnageTariffItem(
                    code=tt.code,
                    name=tt.code_name,
                    desc="",
                    base_tariff=180000
                ))
        else:
            def_base, def_desc = default_tariffs.get(tt.code, (180000, "덤프트럭"))
            payload = json.dumps({"name": tt.code_name, "desc": def_desc, "base_tariff": def_base})
            new_tc = CommonCode(
                group_code="TONNAGE_TARIFF",
                code=tt.code,
                code_name=payload,
                display_order=tt.display_order,
                is_active=True
            )
            db.add(new_tc)
            has_new_tariff = True
            tonnage_tariffs.append(TonnageTariffItem(
                code=tt.code,
                name=tt.code_name,
                desc=def_desc,
                base_tariff=def_base
            ))

    if has_new_tariff:
        await db.commit()


    # 2. 미터기 정책 및 출퇴근 피크타임 정책 (METER_PRICING_POLICY)
    res_policy = await db.execute(
        select(CommonCode).where(CommonCode.group_code == "METER_PRICING_POLICY")
    )
    policy_dict = {c.code: c.code_name for c in res_policy.scalars().all()}

    # 3. 플랫폼 수수료율 (COMMISSION_POLICY)
    res_comm = await db.execute(
        select(CommonCode).where(CommonCode.group_code == "COMMISSION_POLICY", CommonCode.code == "DEFAULT_RATE")
    )
    comm_obj = res_comm.scalars().first()
    commission_rate = float(comm_obj.code_name) if comm_obj and comm_obj.code_name else 5.0

    return PricingPolicyResponse(
        tonnage_tariffs=tonnage_tariffs,
        commission_rate=commission_rate,
        calculation_method=policy_dict.get("CALCULATION_METHOD", "CONTINUOUS"),
        continuous_distance_unit_fare=int(policy_dict.get("CONTINUOUS_DISTANCE_UNIT_FARE", "1000")),
        continuous_time_unit_fare=int(policy_dict.get("CONTINUOUS_TIME_UNIT_FARE", "200")),
        over_plan_distance_unit_fare=int(policy_dict.get("OVER_PLAN_DISTANCE_UNIT_FARE", "1500")),
        over_plan_time_unit_fare=int(policy_dict.get("OVER_PLAN_TIME_UNIT_FARE", "200")),
        peak_pricing_enabled=policy_dict.get("PEAK_PRICING_ENABLED", "false").lower() == "true",
        morning_peak_start=policy_dict.get("MORNING_PEAK_START", "07:00"),
        morning_peak_end=policy_dict.get("MORNING_PEAK_END", "09:30"),
        morning_distance_unit_fare=int(policy_dict.get("MORNING_DISTANCE_UNIT_FARE", "1300")),
        morning_time_unit_fare=int(policy_dict.get("MORNING_TIME_UNIT_FARE", "250")),
        evening_peak_start=policy_dict.get("EVENING_PEAK_START", "17:00"),
        evening_peak_end=policy_dict.get("EVENING_PEAK_END", "20:00"),
        evening_distance_unit_fare=int(policy_dict.get("EVENING_DISTANCE_UNIT_FARE", "1300")),
        evening_time_unit_fare=int(policy_dict.get("EVENING_TIME_UNIT_FARE", "250")),
    )

@router.put(
    "/pricing-policy",
    summary="수수료, 운임 및 미터기/피크타임 정책 일괄 업데이트"
)
async def update_pricing_policy(
    data: MeterPricingPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="요금 정책 수정 권한이 없습니다. (플랫폼 관리자 권한 필요)"
        )

    # 1. 톤수별 기본단가 반영
    if data.tonnage_tariffs is not None:
        for idx, t in enumerate(data.tonnage_tariffs):
            query = select(CommonCode).where(
                CommonCode.group_code == "TONNAGE_TARIFF",
                CommonCode.code == t.code
            )
            res = await db.execute(query)
            code_obj = res.scalars().first()
            payload = json.dumps({"name": t.name, "desc": t.desc, "base_tariff": t.base_tariff})
            if code_obj:
                code_obj.code_name = payload
                code_obj.display_order = idx + 1
                code_obj.is_active = True
            else:
                new_code = CommonCode(
                    group_code="TONNAGE_TARIFF",
                    code=t.code,
                    code_name=payload,
                    display_order=idx + 1,
                    is_active=True
                )
                db.add(new_code)

    # 2. 플랫폼 수수료율 반영
    if data.commission_rate is not None:
        q_comm = select(CommonCode).where(
            CommonCode.group_code == "COMMISSION_POLICY",
            CommonCode.code == "DEFAULT_RATE"
        )
        res_c = await db.execute(q_comm)
        comm_obj = res_c.scalars().first()
        if comm_obj:
            comm_obj.code_name = str(data.commission_rate)
        else:
            new_comm = CommonCode(
                group_code="COMMISSION_POLICY",
                code="DEFAULT_RATE",
                code_name=str(data.commission_rate),
                display_order=1,
                is_active=True
            )
            db.add(new_comm)

    # 3. 미터기 및 피크타임 정책 매핑
    policy_mappings = {
        "CALCULATION_METHOD": data.calculation_method,
        "CONTINUOUS_DISTANCE_UNIT_FARE": str(data.continuous_distance_unit_fare),
        "CONTINUOUS_TIME_UNIT_FARE": str(data.continuous_time_unit_fare),
        "OVER_PLAN_DISTANCE_UNIT_FARE": str(data.over_plan_distance_unit_fare),
        "OVER_PLAN_TIME_UNIT_FARE": str(data.over_plan_time_unit_fare),
        "PEAK_PRICING_ENABLED": "true" if data.peak_pricing_enabled else "false",
        "MORNING_PEAK_START": data.morning_peak_start or "07:00",
        "MORNING_PEAK_END": data.morning_peak_end or "09:30",
        "MORNING_DISTANCE_UNIT_FARE": str(data.morning_distance_unit_fare or 1300),
        "MORNING_TIME_UNIT_FARE": str(data.morning_time_unit_fare or 250),
        "EVENING_PEAK_START": data.evening_peak_start or "17:00",
        "EVENING_PEAK_END": data.evening_peak_end or "20:00",
        "EVENING_DISTANCE_UNIT_FARE": str(data.evening_distance_unit_fare or 1300),
        "EVENING_TIME_UNIT_FARE": str(data.evening_time_unit_fare or 250),
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
    return {"message": "수수료 및 운임/피크타임 정산 정책이 성공적으로 반영되었습니다."}


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




