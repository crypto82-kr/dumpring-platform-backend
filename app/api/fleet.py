from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel

from app.core.db import get_db
from app.models import User, Driver, Car
from app.api.auth import get_current_owner

router = APIRouter()

class DriverResponse(BaseModel):
    driver_id: int
    name: str
    phone_number: str
    car_number: str
    tonnage: float
    is_approved: bool

@router.get(
    "/my-drivers",
    response_model=List[DriverResponse],
    summary="차주 사장님이 소속 기사 및 배정 차량 목록 조회"
)
async def get_my_drivers(
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    # 차주 소유의 차량들 조회
    car_query = select(Car).where(Car.owner_id == current_owner.id)
    car_result = await db.execute(car_query)
    cars = car_result.scalars().all()
    car_ids = [c.id for c in cars]

    if not car_ids:
        return []

    # 차량에 배정된 기사들 조회
    driver_query = select(Driver).where(Driver.current_car_id.in_(car_ids))
    driver_result = await db.execute(driver_query)
    drivers = driver_result.scalars().all()

    response_list = []
    for d in drivers:
        # 기사 유저 정보 매핑
        name = "선등록 대기기사"
        phone = d.registered_phone
        if d.user_id:
            user_query = select(User).where(User.id == d.user_id)
            user_result = await db.execute(user_query)
            u = user_result.scalars().first()
            if u:
                name = u.name
                phone = u.phone_number

        # 차량 정보 매핑
        car = next((c for c in cars if c.id == d.current_car_id), None)
        car_number = car.car_number if car else "미지정"
        tonnage = car.tonnage if car else 0.0

        response_list.append(
            DriverResponse(
                driver_id=d.id,
                name=name,
                phone_number=phone,
                car_number=car_number,
                tonnage=tonnage,
                is_approved=d.is_approved
            )
        )
    return response_list


@router.post(
    "/disconnect-driver/{driver_id}",
    summary="소속 기사 등록 해제 (연결 끊기)",
    description="차주 사장님이 소속 차량에 배정되어 있는 기사를 등록 해제하여 그룹에서 제외시킵니다."
)
async def disconnect_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    # 1. 대상 기사 조회
    driver_query = select(Driver).where(Driver.id == driver_id)
    driver_result = await db.execute(driver_query)
    driver = driver_result.scalars().first()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 기사를 찾을 수 없습니다."
        )

    # 2. 권한 검증: 배정 차량의 소유자가 현재 차주인지 체크
    if driver.current_car_id:
        car_query = select(Car).where(Car.id == driver.current_car_id)
        car_result = await db.execute(car_query)
        car = car_result.scalars().first()
        
        if not car or car.owner_id != current_owner.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 기사는 귀하의 소속 기사가 아니므로 등록 해제할 수 없습니다."
            )
    else:
        # 차량이 지정되지 않고 폰 번호로만 있는 경우 (또는 이미 매핑된 경우)
        if driver.user_id:
            # 기사 유저의 ID를 확인하여 매칭 해제 지원
            pass

    # 3. 해제 처리: 드라이버 레코드의 차 배정을 끊고, 승인 취소 및 매칭 초기화
    driver.current_car_id = None
    driver.is_approved = False
    
    # 또는 영구 삭제를 원할 경우: db.delete(driver)도 고려할 수 있으나, soft-reset인 user_id 초기화가 더욱 안전함
    # 여기서는 차주 소속에서 완전히 방출하기 위해 레코드를 제거하거나 초기화합니다.
    # 안전하게 기사 테이블에서 해당 관계 레코드를 완전 삭제하여 차주 리스트에서 치워버립니다.
    await db.delete(driver)
 
    await db.commit()
    return {"message": "기사 등록이 정상적으로 해제되었습니다."}
 
 
class CarResponse(BaseModel):
    id: int
    car_number: str
    tonnage: float
    driver_name: str
    inspection_date: str
 
@router.get(
    "/my-cars",
    response_model=List[CarResponse],
    summary="차주 사장님이 등록한 차량 목록 조회"
)
async def get_my_cars(
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    car_query = select(Car).where(Car.owner_id == current_owner.id)
    car_result = await db.execute(car_query)
    cars = car_result.scalars().all()
    
    response_list = []
    for c in cars:
        # 이 차량에 지정된 기사 찾기
        driver_query = select(Driver).where(Driver.current_car_id == c.id)
        driver_result = await db.execute(driver_query)
        d = driver_result.scalars().first()
        
        driver_name = "미배정"
        if d:
            if d.user_id:
                user_query = select(User).where(User.id == d.user_id)
                user_result = await db.execute(user_query)
                u = user_result.scalars().first()
                if u:
                    driver_name = u.name
            else:
                driver_name = "선등록 대기기사"
                
        response_list.append(
            CarResponse(
                id=c.id,
                car_number=c.car_number,
                tonnage=c.tonnage,
                driver_name=driver_name,
                inspection_date="2026-12-31",
                machinery_reg_file=c.machinery_reg_file,
                machinery_reg_url=c.machinery_reg_url,
                biz_license_file=c.biz_license_file,
                biz_license_url=c.biz_license_url,
                insurance_file=c.insurance_file,
                insurance_url=c.insurance_url,
            )
        )
    return response_list


class CreateCarRequest(BaseModel):
    car_number: str
    tonnage: float
    car_model: str | None = None
    machinery_reg_file: str | None = None
    machinery_reg_url: str | None = None
    biz_license_file: str | None = None
    biz_license_url: str | None = None
    insurance_file: str | None = None
    insurance_url: str | None = None


class CarResponse(BaseModel):
    id: int
    car_number: str
    tonnage: float
    driver_name: str
    inspection_date: str
    machinery_reg_file: str | None = None
    machinery_reg_url: str | None = None
    biz_license_file: str | None = None
    biz_license_url: str | None = None
    insurance_file: str | None = None
    insurance_url: str | None = None

    class Config:
        orm_mode = True


@router.post(
    "/my-cars",
    response_model=CarResponse,
    status_code=status.HTTP_201_CREATED,
    summary="차주 사장님의 신규 보유 차량 등록"
)
async def create_my_car(
    data: CreateCarRequest,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    # 중복 차량 번호 확인
    query = select(Car).where(Car.car_number == data.car_number.strip())
    result = await db.execute(query)
    existing_car = result.scalars().first()

    if existing_car:
        # 이미 등록된 차량인 경우 소유권 및 정보 업데이트
        existing_car.owner_id = current_owner.id
        existing_car.tonnage = data.tonnage
        if data.machinery_reg_file: existing_car.machinery_reg_file = data.machinery_reg_file
        if data.machinery_reg_url: existing_car.machinery_reg_url = data.machinery_reg_url
        if data.biz_license_file: existing_car.biz_license_file = data.biz_license_file
        if data.biz_license_url: existing_car.biz_license_url = data.biz_license_url
        if data.insurance_file: existing_car.insurance_file = data.insurance_file
        if data.insurance_url: existing_car.insurance_url = data.insurance_url
        await db.commit()
        await db.refresh(existing_car)
        return CarResponse(
            id=existing_car.id,
            car_number=existing_car.car_number,
            tonnage=existing_car.tonnage,
            driver_name="미배정",
            inspection_date="2026-12-31",
            machinery_reg_file=existing_car.machinery_reg_file,
            machinery_reg_url=existing_car.machinery_reg_url,
            biz_license_file=existing_car.biz_license_file,
            biz_license_url=existing_car.biz_license_url,
            insurance_file=existing_car.insurance_file,
            insurance_url=existing_car.insurance_url,
        )

    # 신규 차량 생성
    new_car = Car(
        owner_id=current_owner.id,
        car_number=data.car_number.strip(),
        tonnage=data.tonnage,
        machinery_reg_file=data.machinery_reg_file,
        machinery_reg_url=data.machinery_reg_url,
        biz_license_file=data.biz_license_file,
        biz_license_url=data.biz_license_url,
        insurance_file=data.insurance_file,
        insurance_url=data.insurance_url,
    )
    db.add(new_car)
    await db.commit()
    await db.refresh(new_car)

    return CarResponse(
        id=new_car.id,
        car_number=new_car.car_number,
        tonnage=new_car.tonnage,
        driver_name="미배정",
        inspection_date="2026-12-31",
        machinery_reg_file=new_car.machinery_reg_file,
        machinery_reg_url=new_car.machinery_reg_url,
        biz_license_file=new_car.biz_license_file,
        biz_license_url=new_car.biz_license_url,
        insurance_file=new_car.insurance_file,
        insurance_url=new_car.insurance_url,
    )
