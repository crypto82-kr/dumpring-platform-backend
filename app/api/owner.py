from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging

from app.core.db import get_db
from app.models import User, Car, Driver
from app.schemas.auth import FleetRegister
from app.api.auth import get_current_owner

logger = logging.getLogger("dumpring.owner")

router = APIRouter()

@router.post(
    "/register-fleet",
    status_code=status.HTTP_201_CREATED,
    summary="소속 덤프 차량 및 기사 선등록 (Fleet)",
    description="차주 전용 API입니다. 소유 중인 차량과 기사의 휴대폰 번호를 선등록하여 관리합니다. 기사가 이미 가입해 있다면 즉시 연동 매칭됩니다."
)
async def register_fleet(
    data: FleetRegister,
    current_owner: User = Depends(get_current_owner),
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"차주 [ID: {current_owner.id}, 이름: {current_owner.name}] 차량 및 기사 선등록 시도: {data.car_number}")

    # 1. 차량 번호 중복 조회 예외 처리
    car_check_query = select(Car).where(Car.car_number == data.car_number)
    car_check_result = await db.execute(car_check_query)
    existing_car = car_check_result.scalars().first()

    if existing_car:
        logger.warning(f"차량 선등록 실패: 이미 등록된 차량 번호 ({data.car_number})")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ALREADY_REGISTERED_CAR",
                "message": "이미 등록된 차량 번호입니다. 차량 번호를 확인해 주세요."
            }
        )

    try:
        # 2. 차량 등록 처리
        new_car = Car(
            owner_id=current_owner.id,
            car_number=data.car_number,
            tonnage=data.tonnage
        )
        db.add(new_car)
        # 생성된 car_id 값을 확보하기 위해 flush 실행
        await db.flush()
        
        logger.info(f"차량 임시 생성 성공 (Car ID: {new_car.id})")

        # 3. 양방향 가역 즉시 매칭 체크
        # 선등록하려는 기사 번호로 이미 가입한 유저가 있는지 확인
        user_check_query = select(User).where(User.phone_number == data.driver_phone)
        user_check_result = await db.execute(user_check_query)
        already_joined_user = user_check_result.scalars().first()

        target_user_id = None
        if already_joined_user:
            # 기사가 먼저 가입해 있는 특별한 경우라면, 즉시 user_id를 연결 매칭해 줍니다.
            target_user_id = already_joined_user.id
            logger.info(f"★ [기가입 기사 발견] 기사 유저가 이미 가입 완료 상태입니다. 즉시 연동 매칭합니다 (User ID: {target_user_id})")

        # 4. 기사 프로필 선등록 및 연동 (Driver.user_id unique 제약 조건 준수)
        existing_driver = None
        if target_user_id:
            # 기사가 이미 가입되어 있는 경우, user_id 기준으로 기존 드라이버 프로필 조회
            driver_by_user_query = select(Driver).where(Driver.user_id == target_user_id)
            driver_by_user_res = await db.execute(driver_by_user_query)
            existing_driver = driver_by_user_res.scalars().first()

        if not existing_driver:
            # phone_number 기준으로 기존 드라이버 프로필 조회
            driver_by_phone_query = select(Driver).where(Driver.registered_phone == data.driver_phone)
            driver_by_phone_res = await db.execute(driver_by_phone_query)
            existing_driver = driver_by_phone_res.scalars().first()

        if existing_driver:
            # 기존 프로필이 있으면 차량 정보와 연동 정보 갱신
            existing_driver.current_car_id = new_car.id
            if target_user_id:
                existing_driver.user_id = target_user_id
            # 전화번호 포맷을 입력된 값으로 업데이트
            existing_driver.registered_phone = data.driver_phone
            logger.info(f"기존에 등록되어 있던 기사 프로필을 최신 차량(Car ID: {new_car.id}) 및 기사 정보로 갱신 연동했습니다. (Driver ID: {existing_driver.id})")
        else:
            # 신규 기사 선등록
            new_driver = Driver(
                user_id=target_user_id,
                current_car_id=new_car.id,
                registered_phone=data.driver_phone,
                is_approved=False  # 관리자 최종 승인 대기 기본값
            )
            db.add(new_driver)
            logger.info(f"신규 기사 프로필을 등록 완료했습니다. 배정 차량: {data.car_number}")

        # 5. 한 트랜잭션 내에서 원자적으로 커밋
        await db.commit()
        
        return {
            "status": "success",
            "message": "소속 차량 및 기사가 안전하게 선등록 및 연동 완료되었습니다.",
            "car": {
                "id": new_car.id,
                "car_number": new_car.car_number,
                "tonnage": new_car.tonnage
            },
            "driver": {
                "registered_phone": data.driver_phone,
                "is_matched": target_user_id is not None
            }
        }

    except Exception as e:
        logger.error(f"차량 및 기사 선등록 처리 중 에러 발생: {str(e)}")
        await db.rollback()
        raise e
