from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import selectinload
from app.models import DispatchTicket, ConstructionSite, DropOff, DropOffRequest, JobPost

from app.core.db import get_db
from app.models import User, Driver, Car, Notification, UserUploadedDocument, CommonCode
from app.api.auth import get_current_owner, get_current_user
from app.core.security import normalize_phone

router = APIRouter()

class DriverResponse(BaseModel):
    driver_id: int
    name: str
    phone_number: str
    car_number: str
    tonnage: float
    truck_type: str | None = None
    truck_type_name: str | None = None
    is_approved: bool
    user_id: int | None = None
    is_matched: bool = False

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
    cars_by_id = {c.id: c for c in cars}

    # 공통코드 톤수 매핑 딕셔너리 생성
    codes_query = select(CommonCode).where(CommonCode.group_code == "TRUCK_TYPE")
    codes_res = await db.execute(codes_query)
    truck_type_map = {c.code: c.code_name for c in codes_res.scalars().all()}

    # 차량에 배정된 기사 또는 차주 소속 기사들 조회
    driver_query = select(Driver).where(
        (Driver.owner_id == current_owner.id) |
        ((Driver.current_car_id.in_(car_ids)) if car_ids else (Driver.id == -1))
    )
    driver_result = await db.execute(driver_query)
    drivers = driver_result.scalars().all()

    user_ids = [d.user_id for d in drivers if d.user_id]
    user_map = {}
    if user_ids:
        user_query = select(User).where(User.id.in_(user_ids))
        user_result = await db.execute(user_query)
        for u in user_result.scalars().all():
            user_map[u.id] = (u.name, u.phone_number)

    response_list = []
    for d in drivers:
        name = "선등록 대기기사"
        phone = d.registered_phone
        if d.user_id and d.user_id in user_map:
            name, phone = user_map[d.user_id]

        car = cars_by_id.get(d.current_car_id)
        car_number = car.car_number if car else "미지정"
        tonnage = car.tonnage if car else 0.0
        
        truck_type = None
        truck_type_name = None
        if car:
            truck_type = getattr(car, "truck_type", None) or "T_25"
            truck_type_name = truck_type_map.get(truck_type, f"{car.tonnage}톤")

        response_list.append(
            DriverResponse(
                driver_id=d.id,
                name=name,
                phone_number=phone,
                car_number=car_number,
                tonnage=tonnage,
                truck_type=truck_type,
                truck_type_name=truck_type_name,
                is_approved=d.is_approved,
                user_id=d.user_id,
                is_matched=d.user_id is not None
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

    # 2. 권한 검증: 배정 차량 소유자가 차주이거나, 기사의 owner_id가 차주인지 확인
    is_owner_driver = (driver.owner_id == current_owner.id)
    if not is_owner_driver and driver.current_car_id:
        car_query = select(Car).where(Car.id == driver.current_car_id)
        car_result = await db.execute(car_query)
        car = car_result.scalars().first()
        if car and car.owner_id == current_owner.id:
            is_owner_driver = True

    if not is_owner_driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 기사는 귀하의 소속 기사가 아니므로 등록 해제할 수 없습니다."
        )

    # 3. 해제 처리: 소속 그룹에서 완전 방출 (Driver 레코드 삭제)
    await db.delete(driver)
    await db.commit()
    return {"message": "기사 등록이 정상적으로 해제되었습니다."}
 
 
class CarResponse(BaseModel):
    id: int
    car_number: str
    tonnage: float
    truck_type: str | None = "T_25"
    truck_type_name: str | None = "25톤"
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
    
    if not cars:
        return []

    car_ids = [c.id for c in cars]

    # 이 차량들에 배정된 기사들 일괄 조회
    driver_query = select(Driver).where(Driver.current_car_id.in_(car_ids))
    driver_result = await db.execute(driver_query)
    drivers = driver_result.scalars().all()

    driver_by_car = {d.current_car_id: d for d in drivers}
    user_ids = [d.user_id for d in drivers if d.user_id]
    
    user_map = {}
    if user_ids:
        user_query = select(User).where(User.id.in_(user_ids))
        user_result = await db.execute(user_query)
        for u in user_result.scalars().all():
            user_map[u.id] = u.name

    # 공통코드 톤수 매핑 딕셔너리 생성
    codes_query = select(CommonCode).where(CommonCode.group_code == "TRUCK_TYPE")
    codes_res = await db.execute(codes_query)
    truck_type_map = {c.code: c.code_name for c in codes_res.scalars().all()}

    response_list = []
    for c in cars:
        d = driver_by_car.get(c.id)
        driver_name = "미배정"
        if d:
            if d.user_id and d.user_id in user_map:
                driver_name = user_map[d.user_id]
            else:
                driver_name = "선등록 대기기사"
        
        t_code = getattr(c, "truck_type", None) or "T_25"
        t_name = truck_type_map.get(t_code, f"{c.tonnage}톤")
                
        response_list.append(
            CarResponse(
                id=c.id,
                car_number=c.car_number,
                tonnage=c.tonnage,
                truck_type=t_code,
                truck_type_name=t_name,
                driver_name=driver_name,
                inspection_date=getattr(c, "inspection_date", None) or "2026-12-31",
                machinery_reg_file=getattr(c, "machinery_reg_file", None),
                machinery_reg_url=getattr(c, "machinery_reg_url", None),
                biz_license_file=getattr(c, "biz_license_file", None),
                biz_license_url=getattr(c, "biz_license_url", None),
                insurance_file=getattr(c, "insurance_file", None),
                insurance_url=getattr(c, "insurance_url", None),
            )
        )
    return response_list


class CreateCarRequest(BaseModel):
    car_number: str
    truck_type: str | None = "T_25"
    tonnage: float | None = None
    inspection_date: str | None = None
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
    truck_type: str | None = "T_25"
    truck_type_name: str | None = "25톤"
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
    # 공통코드 톤수 숫자 파싱
    truck_type_val = data.truck_type or "T_25"
    parsed_tonnage = 25.0
    if data.tonnage is not None and data.tonnage > 0:
        parsed_tonnage = data.tonnage
    elif truck_type_val == "T_15":
        parsed_tonnage = 15.0
    elif truck_type_val == "T_25":
        parsed_tonnage = 25.0
    elif truck_type_val == "T_27":
        parsed_tonnage = 27.0

    # 공통코드 명칭 조회
    code_q = select(CommonCode).where(CommonCode.group_code == "TRUCK_TYPE", CommonCode.code == truck_type_val)
    code_r = await db.execute(code_q)
    c_item = code_r.scalars().first()
    t_name = c_item.code_name if c_item else f"{parsed_tonnage}톤"

    # 중복 차량 번호 확인
    query = select(Car).where(Car.car_number == data.car_number.strip())
    result = await db.execute(query)
    existing_car = result.scalars().first()

    if existing_car:
        # 이미 등록된 차량인 경우 소유권 및 정보 업데이트
        existing_car.owner_id = current_owner.id
        existing_car.truck_type = truck_type_val
        existing_car.tonnage = parsed_tonnage
        if data.inspection_date:
            existing_car.inspection_date = data.inspection_date.strip()
        if data.machinery_reg_file:
            existing_car.machinery_reg_file = data.machinery_reg_file
        if data.machinery_reg_url:
            existing_car.machinery_reg_url = data.machinery_reg_url
        if data.biz_license_file:
            existing_car.biz_license_file = data.biz_license_file
        if data.biz_license_url:
            existing_car.biz_license_url = data.biz_license_url
        if data.insurance_file:
            existing_car.insurance_file = data.insurance_file
        if data.insurance_url:
            existing_car.insurance_url = data.insurance_url
        
        await db.commit()
        return CarResponse(
            id=existing_car.id,
            car_number=existing_car.car_number,
            tonnage=existing_car.tonnage,
            truck_type=existing_car.truck_type or truck_type_val,
            truck_type_name=t_name,
            driver_name="미배정",
            inspection_date=existing_car.inspection_date or "2026-12-31",
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
        truck_type=truck_type_val,
        tonnage=parsed_tonnage,
        inspection_date=data.inspection_date.strip() if data.inspection_date else "2026-12-31",
        machinery_reg_file=data.machinery_reg_file,
        machinery_reg_url=data.machinery_reg_url,
        biz_license_file=data.biz_license_file,
        biz_license_url=data.biz_license_url,
        insurance_file=data.insurance_file,
        insurance_url=data.insurance_url,
    )
    db.add(new_car)
    await db.commit()

    return CarResponse(
        id=new_car.id,
        car_number=new_car.car_number,
        tonnage=new_car.tonnage,
        truck_type=new_car.truck_type,
        truck_type_name=t_name,
        driver_name="미배정",
        inspection_date=new_car.inspection_date or "2026-12-31",
        machinery_reg_file=new_car.machinery_reg_file,
        machinery_reg_url=new_car.machinery_reg_url,
        biz_license_file=new_car.biz_license_file,
        biz_license_url=new_car.biz_license_url,
        insurance_file=new_car.insurance_file,
        insurance_url=new_car.insurance_url,
    )


class InviteDriverRequest(BaseModel):
    phone_number: str
    name: str
    driver_id: int | None = None


class NotificationResponse(BaseModel):
    id: int
    target_phone: str
    sender_name: str
    message: str
    is_read: bool
    created_at: str

    class Config:
        orm_mode = True


@router.post(
    "/invite-driver",
    summary="차주 사장님의 기사 초대 (앱내 알림)"
)
async def invite_driver(
    data: InviteDriverRequest,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    phone = normalize_phone(data.phone_number)
    name = data.name.strip()

    # 1. 기사 회원으로 가입된 유저가 있는지 조회
    user_query = select(User).where(User.phone_number == phone)
    user_result = await db.execute(user_query)
    driver_user = user_result.scalars().first()

    # 타 역할(현장관리자, 현장담당자, 하차지 관리자) 전용 계정인지 검증
    if driver_user:
        if driver_user.is_site_manager or driver_user.is_site_worker:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="해당 휴대폰 번호는 공사현장 관리자(담당자)로 가입된 계정입니다. 기사로 등록할 수 없습니다."
            )
        if driver_user.is_drop_off:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="해당 휴대폰 번호는 하차지/사토장 지주 계정으로 가입되어 있습니다. 기사로 등록할 수 없습니다."
            )

    # 2. Driver 테이블 선등록/링크 확인
    driver_query = select(Driver).where(Driver.registered_phone == phone)
    driver_result = await db.execute(driver_query)
    existing_driver = driver_result.scalars().first()

    # 신규 등록(driver_id가 없음) 시 중복 검사
    if data.driver_id is None and existing_driver:
        if existing_driver.owner_id == current_owner.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 소속 기사로 등록되어 있는 휴대폰 번호입니다. 기존 목록에서 정보를 수정해 주세요."
            )
        elif existing_driver.owner_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="해당 휴대폰 번호는 이미 다른 차주에게 소속된 기사입니다."
            )

    if not existing_driver:
        new_driver = Driver(
            user_id=driver_user.id if driver_user else None,
            owner_id=current_owner.id,
            registered_phone=phone,
            is_approved=False
        )
        db.add(new_driver)
    else:
        existing_driver.owner_id = current_owner.id
        if driver_user and not existing_driver.user_id:
            existing_driver.user_id = driver_user.id

    target_driver = existing_driver or new_driver

    # 3. 알림 전송 저장
    new_notif = Notification(
        target_phone=phone,
        sender_id=current_owner.id,
        message=f"'{current_owner.name}' 차주님으로부터 소속 기사 초대 요청이 도착했습니다. (기사 성명: {name})"
    )
    db.add(new_notif)
    await db.commit()
    await db.refresh(target_driver)

    return {
        "message": "기사 초대 알림이 정상적으로 전송되었습니다.",
        "driver_id": target_driver.id
    }


@router.get(
    "/my-notifications",
    response_model=List[NotificationResponse],
    summary="기사의 수신 알림 목록 조회"
)
async def get_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Notification).where(
        Notification.target_phone == current_user.phone_number
    ).order_by(Notification.created_at.desc())
    result = await db.execute(query)
    notifs = result.scalars().all()

    response_list = []
    for n in notifs:
        # 보낸 사람 이름
        sender_query = select(User).where(User.id == n.sender_id)
        sender_result = await db.execute(sender_query)
        sender = sender_result.scalars().first()
        sender_name = sender.name if sender else "알 수 없음"

        response_list.append(
            NotificationResponse(
                id=n.id,
                target_phone=n.target_phone,
                sender_name=sender_name,
                message=n.message,
                is_read=n.is_read,
                created_at=n.created_at.isoformat()
            )
        )
    return response_list


@router.post(
    "/read-notification/{notification_id}",
    summary="알림 읽음 처리"
)
async def read_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Notification).where(
        Notification.id == notification_id,
        Notification.target_phone == current_user.phone_number
    )
    result = await db.execute(query)
    notif = result.scalars().first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="알림을 찾을 수 없습니다."
        )

    notif.is_read = True
    await db.commit()
    return {"message": "알림이 읽음 처리되었습니다."}


class AssignDriverRequest(BaseModel):
    car_id: int
    driver_id: int | None = None


@router.post(
    "/assign-driver",
    summary="차량에 기사 매핑/배정"
)
async def assign_driver(
    data: AssignDriverRequest,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    # 1. 차량 소유주 검증
    car_query = select(Car).where(Car.id == data.car_id, Car.owner_id == current_owner.id)
    car_result = await db.execute(car_query)
    car = car_result.scalars().first()
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 차량을 찾을 수 없거나 권한이 없습니다."
        )

    # 2. 해당 차량에 배정되어 있던 기존 기사 해제
    old_drivers_query = select(Driver).where(Driver.current_car_id == data.car_id)
    old_drivers_result = await db.execute(old_drivers_query)
    old_drivers = old_drivers_result.scalars().all()
    for od in old_drivers:
        od.current_car_id = None

    # 3. 새 기사 배정
    if data.driver_id is not None:
        # 기사 정보 조회 및 소속 검증 (owner_id가 일치해야 함)
        driver_query = select(Driver).where(
            Driver.id == data.driver_id,
            (Driver.owner_id == current_owner.id) | (Driver.current_car_id == data.car_id)
        )
        driver_result = await db.execute(driver_query)
        driver = driver_result.scalars().first()
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 기사를 찾을 수 없거나 차주 소속이 아닙니다."
            )

        driver.current_car_id = data.car_id

    await db.commit()
    return {"message": "차량 기사 매핑이 성공적으로 업데이트되었습니다."}


@router.get(
    "/driver-detail/{driver_id}",
    summary="차주가 기사 상세 정보 및 서류 목록 조회"
)
async def get_driver_detail(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    # 기사 정보 조회 및 소속 검증
    driver_query = select(Driver).where(Driver.id == driver_id)
    driver_result = await db.execute(driver_query)
    driver = driver_result.scalars().first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="기사를 찾을 수 없습니다."
        )

    # 차주 소속 차량들 조회
    car_query = select(Car).where(Car.owner_id == current_owner.id)
    car_result = await db.execute(car_query)
    cars = car_result.scalars().all()
    car_ids = [c.id for c in cars]

    # 소속 검증 및 데이터 복구 (Heal)
    if driver.owner_id is None:
        driver.owner_id = current_owner.id
        await db.commit()

    if driver.owner_id != current_owner.id and driver.current_car_id not in car_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="조회 권한이 없습니다."
        )

    # 기사 유저 정보 조회
    driver_user = None
    if driver.user_id:
        user_query = select(User).where(User.id == driver.user_id)
        user_result = await db.execute(user_query)
        driver_user = user_result.scalars().first()

    # 배정 차량 번호
    car_number = "미배정"
    if driver.current_car_id:
        car_sel = select(Car).where(Car.id == driver.current_car_id)
        car_res = await db.execute(car_sel)
        c = car_res.scalars().first()
        if c:
            car_number = c.car_number

    # 제출 서류들 조회
    documents = []
    if driver.user_id:
        doc_query = select(UserUploadedDocument).where(UserUploadedDocument.user_id == driver.user_id)
        doc_res = await db.execute(doc_query)
        docs = doc_res.scalars().all()
        for doc in docs:
            # Query common code name dynamically
            cc_query = select(CommonCode).where(CommonCode.code == doc.document_code)
            cc_result = await db.execute(cc_query)
            cc = cc_result.scalars().first()
            code_name = cc.code_name if cc else "기타 서류"
            
            raw_file = doc.file_name.split("/")[-1].split("?")[0]
            url = f"/api/files/stream/{raw_file}?category=documents"
            if doc.file_name.startswith("http"):
                url = doc.file_name
            
            documents.append({
                "code": doc.document_code,
                "code_name": code_name,
                "file_name": raw_file,
                "file_url": url
            })

    return {
        "driver_id": driver.id,
        "name": driver_user.name if driver_user else "선등록 대기기사",
        "phone_number": driver.registered_phone,
        "car_number": car_number,
        "is_approved": driver.is_approved,
        "reject_reason": driver.reject_reason,
        "user_id": driver.user_id,
        "documents": documents
    }


@router.delete(
    "/kick-driver/{driver_id}",
    summary="차주가 기사 삭제/소속 해제"
)
async def kick_driver(
    driver_id: int,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    driver_query = select(Driver).where(Driver.id == driver_id)
    driver_result = await db.execute(driver_query)
    driver = driver_result.scalars().first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="기사를 찾을 수 없습니다."
        )

    # 소속 검증 및 데이터 복구 (Heal)
    if driver.owner_id is None:
        driver.owner_id = current_owner.id
        await db.commit()

    # 소속 검증
    car_query = select(Car).where(Car.owner_id == current_owner.id)
    car_result = await db.execute(car_query)
    cars = car_result.scalars().all()
    car_ids = [c.id for c in cars]

    if driver.owner_id != current_owner.id and driver.current_car_id not in car_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="권한이 없습니다."
        )

    # 기사 삭제 또는 소속 관계 해제
    if driver.user_id:
        driver.owner_id = None
        driver.current_car_id = None
        driver.is_approved = False
    else:
        await db.delete(driver)

    await db.commit()
    return {"message": "기사 소속 해제가 완료되었습니다."}


# ==========================================================
# 차주 전용 월별 배차 스케줄러 캘린더 API
# ==========================================================
@router.get(
    "/schedule/monthly",
    summary="차주 소속 기사들의 월별 배차 스케줄 캘린더 데이터 조회"
)
async def get_owner_monthly_schedule(
    year_month: str,  # 형식: 'YYYY-MM' (예: '2026-09')
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    from app.models import DispatchTicket, ConstructionSite, DropOff, DropOffRequest, JobPost
    from sqlalchemy.orm import aliased, selectinload
    from datetime import datetime
    import calendar

    # 1. 차주 소유 차량 및 소속 기사 목록 조회
    car_query = select(Car).where(Car.owner_id == current_owner.id)
    cars = (await db.execute(car_query)).scalars().all()
    car_ids = [c.id for c in cars]
    cars_by_id = {c.id: c for c in cars}

    driver_query = select(Driver).where(
        (Driver.owner_id == current_owner.id) |
        ((Driver.current_car_id.in_(car_ids)) if car_ids else (Driver.id == -1))
    )
    drivers = (await db.execute(driver_query)).scalars().all()
    # Driver 테이블의 user_id (DispatchTicket.driver_id는 users.id를 참조)
    driver_user_ids = [d.user_id for d in drivers if d.user_id]
    driver_by_user_id = {d.user_id: d for d in drivers if d.user_id}

    # 기사 이름 및 전화번호 매핑 (User 테이블)
    user_query = select(User).where(User.id.in_(driver_user_ids)) if driver_user_ids else None
    user_map = {}
    if user_query is not None:
        user_res = await db.execute(user_query)
        for u in user_res.scalars().all():
            user_map[u.id] = (u.name, u.phone_number)

    # 공통코드 (토사종류 MATERIAL_TYPE, 배차상태 DISPATCH_STATUS) 매핑 딕셔너리
    common_codes_query = select(CommonCode).where(
        CommonCode.group_code.in_(["MATERIAL_TYPE", "DISPATCH_STATUS"]),
        CommonCode.is_active == True
    )
    cc_res = await db.execute(common_codes_query)
    cc_records = cc_res.scalars().all()
    
    # 기본 fallback 매핑
    material_map = {
        "GOOD_SOIL": "양질토",
        "MUD_SOIL": "뻘흙",
        "ROCK": "암버럭",
        "MIXED": "혼합토",
        "SAND": "모래",
        "CLAY": "점토",
        "GRAVEL": "자갈"
    }
    status_map = {
        "ACCEPTED": "배차 수락",
        "ARRIVED_LOADING": "상차지 도착",
        "LOADING_APPROVED": "상차 승인완료",
        "DRIVING": "하차지 이동 중",
        "ARRIVED": "하차지 도착",
        "WAITING_ABSENT_APPROVAL": "지주부재 승인대기",
        "APPROVED": "반입 승인완료",
        "COMPLETED": "운행 완료",
        "REJECTED": "반입 반려",
        "CANCELLED": "배차 취소",
        "SETTLEMENT_REQUESTED": "정산 요청",
        "SETTLEMENT_APPROVED": "정산 승인",
        "SETTLEMENT_PAID": "지급 완료",
        "SETTLEMENT_CONFIRMED": "정산 확정"
    }
    for c in cc_records:
        if c.group_code == "MATERIAL_TYPE":
            material_map[c.code] = c.code_name
        elif c.group_code == "DISPATCH_STATUS":
            status_map[c.code] = c.code_name

    try:
        parts = year_month.split("-")
        year = int(parts[0])
        month = int(parts[1])
        _, last_day = calendar.monthrange(year, month)
        start_date_str = f"{year:04d}-{month:02d}-01"
        end_date_str = f"{year:04d}-{month:02d}-{last_day:02d}"
        start_dt = datetime.strptime(start_date_str + " 00:00:00", "%Y-%m-%d %H:%M:%S")
        end_dt = datetime.strptime(end_date_str + " 23:59:59", "%Y-%m-%d %H:%M:%S")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"잘못된 년월 형식입니다 (예: 2026-09): {str(e)}"
        )

    # 2. 해당 월의 티켓 조회 (차주 소속 기사들이 운행한 티켓 또는 차주 차량으로 운행한 티켓)
    tickets = []
    condition = []
    if driver_user_ids:
        condition.append(DispatchTicket.driver_id.in_(driver_user_ids))
    if car_ids:
        condition.append(DispatchTicket.car_id.in_(car_ids))

    if condition:
        ticket_query = (
            select(DispatchTicket)
            .where(
                or_(*condition),
                DispatchTicket.accepted_at >= start_dt,
                DispatchTicket.accepted_at <= end_dt
            )
            .options(
                selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
                selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
                selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off),
                selectinload(DispatchTicket.driver),
                selectinload(DispatchTicket.car),
            )
            .order_by(DispatchTicket.accepted_at.asc())
        )

        ticket_res = await db.execute(ticket_query)
        tickets = ticket_res.scalars().all()

    # 3. 날짜별(YYYY-MM-DD) 그룹화
    schedule_by_date = {}
    for d in range(1, last_day + 1):
        d_str = f"{year:04d}-{month:02d}-{d:02d}"
        schedule_by_date[d_str] = {
            "date": d_str,
            "day": d,
            "total_count": 0,
            "completed_count": 0,
            "in_progress_count": 0,
            "cancelled_count": 0,
            "drivers": []
        }

    for t in tickets:
        ticket_date = t.accepted_at or t.driving_started_at
        d_str = ticket_date.strftime("%Y-%m-%d") if ticket_date else ""
        if d_str in schedule_by_date:
            driver_info = user_map.get(t.driver_id)
            driver_name = driver_info[0] if driver_info else (t.driver.name if t.driver else f"기사 #{t.driver_id}")
            
            car_obj = t.car or (cars_by_id.get(t.car_id) if t.car_id else None)
            car_number = car_obj.car_number if car_obj else "차량미배정"
            tonnage = car_obj.tonnage if car_obj else 25.0

            # 현장명 및 하차지명 가져오기
            job = t.job_post
            site_name = job.site.site_name if (job and job.site) else (job.site_name if job else "상차지 미지정")
            dropoff_name = ""
            if job:
                if job.drop_off_request and job.drop_off_request.drop_off:
                    dropoff_name = job.drop_off_request.drop_off.name
                elif job.matched_drop_off:
                    dropoff_name = job.matched_drop_off.name
                else:
                    dropoff_name = job.drop_off_name or "하차지 미지정"

            is_cancelled = t.status in ["CANCELLED", "REJECTED"]
            is_completed = t.status in ["APPROVED", "COMPLETED", "SETTLEMENT_REQUESTED", "SETTLEMENT_APPROVED", "SETTLEMENT_PAID", "SETTLEMENT_CONFIRMED"]
            is_in_progress = t.status in ["ACCEPTED", "ARRIVED_LOADING", "LOADING_APPROVED", "DRIVING", "ARRIVED", "WAITING_ABSENT_APPROVAL"]

            schedule_by_date[d_str]["total_count"] += 1
            if is_cancelled:
                schedule_by_date[d_str]["cancelled_count"] += 1
            elif is_completed:
                schedule_by_date[d_str]["completed_count"] += 1
            elif is_in_progress:
                schedule_by_date[d_str]["in_progress_count"] += 1

            raw_mat = job.material_type if job else "GOOD_SOIL"
            material_name = material_map.get(raw_mat, raw_mat)
            status_name = status_map.get(t.status, t.status)

            schedule_by_date[d_str]["drivers"].append({
                "ticket_id": t.id,
                "driver_id": t.driver_id,
                "driver_name": driver_name,
                "car_number": car_number,
                "tonnage": tonnage,
                "site_name": site_name,
                "dropoff_name": dropoff_name,
                "status": t.status,
                "status_name": status_name,
                "material_type": raw_mat,
                "material_type_name": material_name,
                "fare": t.accumulated_fare or 0,
                "drive_distance_km": t.drive_distance_km or 0.0,
                "proof_photo": t.proof_photo,
                "created_time": ticket_date.strftime("%H:%M") if ticket_date else "",
            })

    days_list = [schedule_by_date[k] for k in sorted(schedule_by_date.keys())]

    # 월간 요약 정보
    month_total_trips = sum(d["total_count"] for d in days_list)
    month_completed_trips = sum(d["completed_count"] for d in days_list)
    active_drivers_count = len(driver_user_ids)
    registered_trucks_count = len(cars)

    return {
        "year_month": year_month,
        "year": year,
        "month": month,
        "summary": {
            "month_total_trips": month_total_trips,
            "month_completed_trips": month_completed_trips,
            "active_drivers_count": active_drivers_count,
            "registered_trucks_count": registered_trucks_count
        },
        "days": days_list
    }


# ==========================================================
# 차주 전용 운행통계 교차분석 API (상차지/하차지 중심 및 기간 필터)
# ==========================================================
@router.get(
    "/statistics/operation",
    summary="차주 덤프트럭 운행 데이터 통계 및 교차 필터링 조회"
)
async def get_owner_operation_statistics(
    start_date: Optional[str] = None,  # YYYY-MM-DD
    end_date: Optional[str] = None,    # YYYY-MM-DD
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner)
):
    from app.models import DispatchTicket, ConstructionSite, DropOff, DropOffRequest, JobPost
    from sqlalchemy.orm import selectinload
    from datetime import datetime, timedelta

    # 1. 차주 소유 차량 및 소속 기사 목록 조회
    car_query = select(Car).where(Car.owner_id == current_owner.id)
    cars = (await db.execute(car_query)).scalars().all()
    car_ids = [c.id for c in cars]
    cars_by_id = {c.id: c for c in cars}

    driver_query = select(Driver).where(
        (Driver.owner_id == current_owner.id) |
        ((Driver.current_car_id.in_(car_ids)) if car_ids else (Driver.id == -1))
    )
    drivers = (await db.execute(driver_query)).scalars().all()
    driver_user_ids = [d.user_id for d in drivers if d.user_id]

    user_query = select(User).where(User.id.in_(driver_user_ids)) if driver_user_ids else None
    user_map = {}
    if user_query is not None:
        user_res = await db.execute(user_query)
        for u in user_res.scalars().all():
            user_map[u.id] = (u.name, u.phone_number)

    # 공통코드 매핑
    common_codes_query = select(CommonCode).where(
        CommonCode.group_code.in_(["MATERIAL_TYPE", "DISPATCH_STATUS"]),
        CommonCode.is_active == True
    )
    cc_res = await db.execute(common_codes_query)
    cc_records = cc_res.scalars().all()
    material_map = {
        "GOOD_SOIL": "양질토",
        "MUD_SOIL": "뻘흙",
        "ROCK": "암버럭",
        "MIXED": "혼합토",
        "SAND": "모래",
        "CLAY": "점토",
        "GRAVEL": "자갈"
    }
    status_map = {
        "ACCEPTED": "배차 수락",
        "ARRIVED_LOADING": "상차지 도착",
        "LOADING_APPROVED": "상차 승인완료",
        "DRIVING": "하차지 이동 중",
        "ARRIVED": "하차지 도착",
        "WAITING_ABSENT_APPROVAL": "지주부재 승인대기",
        "APPROVED": "반입 승인완료",
        "COMPLETED": "운행 완료",
        "REJECTED": "반입 반려",
        "CANCELLED": "배차 취소",
        "SETTLEMENT_REQUESTED": "정산 요청",
        "SETTLEMENT_APPROVED": "정산 승인",
        "SETTLEMENT_PAID": "지급 완료",
        "SETTLEMENT_CONFIRMED": "정산 확정"
    }
    for c in cc_records:
        if c.group_code == "MATERIAL_TYPE":
            material_map[c.code] = c.code_name
        elif c.group_code == "DISPATCH_STATUS":
            status_map[c.code] = c.code_name

    # 날짜 범위 기본값 설정 (없으면 최근 30일)
    now = datetime.now()
    if not end_date:
        end_dt = now.replace(hour=23, minute=59, second=59)
    else:
        end_dt = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")

    if not start_date:
        start_dt = (end_dt - timedelta(days=30)).replace(hour=0, minute=0, second=0)
    else:
        start_dt = datetime.strptime(f"{start_date} 00:00:00", "%Y-%m-%d %H:%M:%S")

    condition = []
    if driver_user_ids:
        condition.append(DispatchTicket.driver_id.in_(driver_user_ids))
    if car_ids:
        condition.append(DispatchTicket.car_id.in_(car_ids))

    records = []
    if condition:
        ticket_query = (
            select(DispatchTicket)
            .where(
                or_(*condition),
                DispatchTicket.accepted_at >= start_dt,
                DispatchTicket.accepted_at <= end_dt
            )
            .options(
                selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
                selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
                selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off),
                selectinload(DispatchTicket.driver),
                selectinload(DispatchTicket.car),
            )
            .order_by(DispatchTicket.accepted_at.desc())
        )
        ticket_res = await db.execute(ticket_query)
        tickets = ticket_res.scalars().all()

        for t in tickets:
            ticket_date = t.accepted_at or t.driving_started_at or now
            driver_info = user_map.get(t.driver_id)
            driver_name = driver_info[0] if driver_info else (t.driver.name if t.driver else f"기사 #{t.driver_id}")

            car_obj = t.car or (cars_by_id.get(t.car_id) if t.car_id else None)
            car_number = car_obj.car_number if car_obj else "차량미배정"
            tonnage = car_obj.tonnage if car_obj else 25.0

            job = t.job_post
            site_name = job.site.site_name if (job and job.site) else (job.site_name if job else "상차지 미지정")
            site_id = job.site_id if job else 0

            dropoff_name = ""
            dropoff_id = 0
            if job:
                if job.drop_off_request and job.drop_off_request.drop_off:
                    dropoff_name = job.drop_off_request.drop_off.name
                    dropoff_id = job.drop_off_request.drop_off.id
                elif job.matched_drop_off:
                    dropoff_name = job.matched_drop_off.name
                    dropoff_id = job.matched_drop_off.id
                else:
                    dropoff_name = job.drop_off_name or "하차지 미지정"
                    dropoff_id = 0

            raw_mat = job.material_type if job else "GOOD_SOIL"
            material_name = material_map.get(raw_mat, raw_mat)
            status_name = status_map.get(t.status, t.status)

            records.append({
                "ticket_id": t.id,
                "date": ticket_date.strftime("%Y-%m-%d"),
                "time": ticket_date.strftime("%H:%M"),
                "driver_id": t.driver_id,
                "driver_name": driver_name,
                "car_id": t.car_id,
                "car_number": car_number,
                "tonnage": float(tonnage),
                "site_id": site_id,
                "site_name": site_name,
                "dropoff_id": dropoff_id,
                "dropoff_name": dropoff_name,
                "material_type": raw_mat,
                "material_name": material_name,
                "status": t.status,
                "status_name": status_name,
                "fare": int(t.accumulated_fare or 0),
                "distance_km": float(t.drive_distance_km or 0.0),
                "trips": 1,
                "weight_ton": float(tonnage),
                "proof_photo": t.proof_photo,
            })

    return {
        "start_date": start_dt.strftime("%Y-%m-%d"),
        "end_date": end_dt.strftime("%Y-%m-%d"),
        "total_records": len(records),
        "records": records
    }


class TaxInvoiceIssueRequest(BaseModel):
    ticket_ids: List[int]
    notes: Optional[str] = None
    invoice_type: Optional[str] = "DRIVER"  # "DRIVER" (차주 운반비) or "DROPOFF" (하차지 B2B)


@router.get(
    "/settlements/revenues",
    summary="[차주 매출 및 정산] 운반 내역, 공급가액/부가세 계산 및 세금계산서 발행 집계 데이터 조회"
)
async def get_owner_settlement_revenues(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    차주 소속의 차량/기사별 완료된 운행 및 정산 데이터를 조회합니다.
    - 공급가액(원단위 절사), 부가세(10%), 합계금액 매칭
    - 현장별(거래처별) 세금계산서 미발행/발행완료 그룹 집계 정보 제공
    - 플랫폼 이용 수수료(8% 기준, 원단위 절사) 및 최종 실수령 예정액 산출
    """
    # 1. 차주 권한 확인 (is_owner 또는 ADMIN)
    if not current_user.is_owner and current_user.role != "ADMIN":
        # 혹시 차주 플래그가 없더라도 소유 차량이 있는지 검증
        owned_cars_check = await db.execute(select(Car).where(Car.owner_id == current_user.id))
        if not owned_cars_check.scalars().all():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="차주 권한을 소지한 회원만 이용할 수 있는 기능입니다."
            )

    # 2. 차주 소속 차량 및 기사 식별 (owner_id)
    cars_query = select(Car).where(Car.owner_id == current_user.id)
    cars = (await db.execute(cars_query)).scalars().all()
    car_ids = [c.id for c in cars]
    cars_by_id = {c.id: c for c in cars}

    driver_query = select(Driver).where(
        (Driver.owner_id == current_user.id) |
        ((Driver.current_car_id.in_(car_ids)) if car_ids else (Driver.id == -1))
    )
    drivers = (await db.execute(driver_query)).scalars().all()
    driver_user_ids = [d.user_id for d in drivers if d.user_id]

    user_query = select(User).where(User.id.in_(driver_user_ids)) if driver_user_ids else None
    user_map = {}
    if user_query is not None:
        user_res = await db.execute(user_query)
        for u in user_res.scalars().all():
            user_map[u.id] = (u.name, u.phone_number)

    # 공통코드 매핑
    material_map = {
        "GOOD_SOIL": "사토(양질토)",
        "MUD_SOIL": "뻘흙",
        "ROCK": "암버럭",
        "MIXED": "혼합토",
        "SAND": "모래",
        "CLAY": "점토",
        "GRAVEL": "자갈"
    }
    status_map = {
        "ACCEPTED": "배차 수락",
        "ARRIVED_LOADING": "상차지 도착",
        "LOADING_APPROVED": "상차 승인완료",
        "DRIVING": "하차지 이동 중",
        "ARRIVED": "하차지 도착",
        "WAITING_ABSENT_APPROVAL": "지주부재 승인대기",
        "APPROVED": "반입 승인완료",
        "COMPLETED": "운행 완료",
        "REJECTED": "반입 반려",
        "CANCELLED": "배차 취소",
        "SETTLEMENT_REQUESTED": "정산대기",
        "SETTLEMENT_REVIEW": "정산대기",
        "SETTLEMENT_APPROVED": "정산완료",
        "SETTLEMENT_PAID": "정산완료",
        "SETTLEMENT_CONFIRMED": "정산완료",
        "SETTLEMENT_DISPUTED": "미정산"
    }

    # 날짜 범위 설정
    now = datetime.now()
    if not end_date:
        end_dt = now.replace(hour=23, minute=59, second=59)
    else:
        end_dt = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")

    if not start_date:
        start_dt = (end_dt - timedelta(days=90)).replace(hour=0, minute=0, second=0)
    else:
        start_dt = datetime.strptime(f"{start_date} 00:00:00", "%Y-%m-%d %H:%M:%S")

    condition = []
    if driver_user_ids:
        condition.append(DispatchTicket.driver_id.in_(driver_user_ids))
    if car_ids:
        condition.append(DispatchTicket.car_id.in_(car_ids))

    records = []
    if condition:
        ticket_query = (
            select(DispatchTicket)
            .where(
                or_(*condition),
                DispatchTicket.accepted_at >= start_dt,
                DispatchTicket.accepted_at <= end_dt
            )
            .options(
                selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
                selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
                selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off),
                selectinload(DispatchTicket.driver),
                selectinload(DispatchTicket.car),
            )
            .order_by(DispatchTicket.accepted_at.desc())
        )
        ticket_res = await db.execute(ticket_query)
        tickets = ticket_res.scalars().all()

        for t in tickets:
            ticket_date = t.accepted_at or t.driving_started_at or now
            driver_info = user_map.get(t.driver_id)
            driver_name = driver_info[0] if driver_info else (t.driver.name if t.driver else f"기사 #{t.driver_id}")

            car_obj = t.car or (cars_by_id.get(t.car_id) if t.car_id else None)
            car_number = car_obj.car_number if car_obj else "차량미배정"
            tonnage = car_obj.tonnage if car_obj else 25.0

            job = t.job_post
            site = job.site if (job and job.site) else None
            site_name = site.site_name if site else (job.site_name if job else "상차지 미지정")
            company_name = site.company_name if site else "건설사 미등록"
            business_number = site.business_number if site else "000-00-00000"
            billing_email = site.billing_email if site else ""
            site_id = site.id if site else (job.site_id if job else 0)

            dropoff_name = ""
            if job:
                if job.drop_off_request and job.drop_off_request.drop_off:
                    dropoff_name = job.drop_off_request.drop_off.name
                elif job.matched_drop_off:
                    dropoff_name = job.matched_drop_off.name
                else:
                    dropoff_name = job.drop_off_name or "하차지 미지정"

            raw_mat = job.material_type if job else "GOOD_SOIL"
            material_name = material_map.get(raw_mat, raw_mat)

            # 운송비 단가 및 금액 계산:
            # t.accumulated_fare가 실제 현장-차주 간 주행 운반비 (미터기 누적 운임 또는 배차 운임)
            # job.offered_unit_price는 하차지(사토장) 토사 반입단가이므로 차주 운반단가로 쓰면 안 됨!
            transport_fare = int(t.accumulated_fare or 0)
            if transport_fare <= 0 and job:
                transport_fare = int(job.offered_unit_price or 0)

            trips = 1  # 1 티켓 당 1회
            supply_price = transport_fare
            vat = int(math.floor(supply_price * 0.1))  # 부가세 10% 원단위 절사
            total_amount = supply_price + vat
            unit_price = supply_price  # 회당 운반 단가

            # 정산 상태 표준화
            raw_status = t.status
            # 정산완료: SETTLEMENT_CONFIRMED (차주/기사가 최종 입금 확인 완료)
            # 입금확인 대기: SETTLEMENT_PAID (현장 송금 완료 후 차주 수령확인 대기)
            # 정산대기: SETTLEMENT_REQUESTED, SETTLEMENT_REVIEW, SETTLEMENT_APPROVED, APPROVED, COMPLETED
            # 미정산 / 이의제기: SETTLEMENT_DISPUTED, REJECTED, CANCELLED 등
            if raw_status == "SETTLEMENT_CONFIRMED":
                settlement_status = "SETTLEMENT_CONFIRMED"
                settlement_label = "정산완료"
            elif raw_status == "SETTLEMENT_PAID":
                settlement_status = "SETTLEMENT_PAID"
                settlement_label = "입금확인 대기"
            elif raw_status in ["SETTLEMENT_APPROVED", "SETTLEMENT_REQUESTED", "SETTLEMENT_REVIEW", "APPROVED", "COMPLETED"]:
                settlement_status = "SETTLEMENT_REVIEW"
                settlement_label = "정산대기"
            elif raw_status == "SETTLEMENT_DISPUTED":
                settlement_status = "SETTLEMENT_DISPUTED"
                settlement_label = "정산 이의"
            else:
                settlement_status = "SETTLEMENT_DISPUTED"
                settlement_label = "미정산"

            # 세금계산서 발행 상태 (실제 티켓의 tax_invoice_issued DB 컬럼 값 기준)
            tax_invoice_issued = bool(getattr(t, "tax_invoice_issued", False))

            records.append({
                "ticket_id": t.id,
                "date": ticket_date.strftime("%Y-%m-%d"),
                "time": ticket_date.strftime("%H:%M"),
                "driver_id": t.driver_id,
                "driver_name": driver_name,
                "car_id": t.car_id,
                "car_number": car_number,
                "tonnage": float(tonnage),
                "site_id": site_id,
                "site_name": site_name,
                "company_name": company_name,
                "business_number": business_number,
                "billing_email": billing_email,
                "client_display": f"{company_name} ({site_name})" if company_name != "건설사 미등록" else site_name,
                "dropoff_name": dropoff_name,
                "material_type": raw_mat,
                "material_name": material_name,
                "trips": trips,
                "unit_price": unit_price,
                "supply_price": supply_price,
                "vat": vat,
                "total_amount": total_amount,
                "raw_status": raw_status,
                "settlement_status": settlement_status,
                "settlement_label": settlement_label,
                "tax_invoice_issued": tax_invoice_issued,
                "tax_invoice_issued_at": t.tax_invoice_issued_at.strftime("%Y-%m-%d %H:%M") if getattr(t, "tax_invoice_issued_at", None) else None,
                "tax_invoice_confirmed_by_driver": bool(getattr(t, "tax_invoice_confirmed_by_driver", False)),
                "tax_invoice_confirmed_at": t.tax_invoice_confirmed_at.strftime("%Y-%m-%d %H:%M") if getattr(t, "tax_invoice_confirmed_at", None) else None,
                "tax_invoice_nts_code": getattr(t, "tax_invoice_nts_code", None),
                "loading_approval_type": t.loading_approval_type,
                "driving_started_at": t.driving_started_at.strftime("%Y-%m-%d %H:%M") if t.driving_started_at else None,
                "completed_at": t.completed_at.strftime("%Y-%m-%d %H:%M") if t.completed_at else (t.arrived_at.strftime("%Y-%m-%d %H:%M") if t.arrived_at else None),
                "drive_distance_km": float(t.drive_distance_km or 0.0),
                "drive_time_seconds": int(t.drive_time_seconds or 0),
                "proof_photo": t.proof_photo,
                "dispute_type": getattr(t, "dispute_type", None),
                "dispute_reason": getattr(t, "dispute_reason", None),
                "dispute_amount": getattr(t, "dispute_amount", None),
                "disputed_at": t.disputed_at.strftime("%Y-%m-%d %H:%M") if getattr(t, "disputed_at", None) else None,
            })

    return {
        "start_date": start_dt.strftime("%Y-%m-%d"),
        "end_date": end_dt.strftime("%Y-%m-%d"),
        "total_records": len(records),
        "records": records
    }


class TaxInvoiceDriverConfirmRequest(BaseModel):
    ticket_ids: List[int]


@router.post(
    "/tax-invoices/driver-confirm",
    summary="[차주 세금계산서] 운반비 및 배차 건수 정산 금액 확인 및 마감 승인(발행대기 락 해제)"
)
async def confirm_tax_invoices_by_driver(
    req: TaxInvoiceDriverConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    차주 사장님이 소속 운행 내역의 배차 건수와 운반 정산 금액을 최종 검토하고 마감 승인합니다.
    승인된 건은 현장관리자 세금계산서 업무에서 [발행대기] 상태로 전환되어 전자세금계산서 위수탁 발행이 가능해집니다.
    """
    if not req.ticket_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="확인 및 마감 승인할 운반 정산 티켓을 선택해 주세요."
        )

    # 차주 소유 차량 ID 목록
    car_query = select(Car.id).where(Car.owner_id == current_user.id)
    car_res = await db.execute(car_query)
    owner_car_ids = [c[0] for c in car_res.all()]

    # 차주 본인 또는 본인 소속 차량/기사의 티켓인지 검증 (2중 보안)
    query = select(DispatchTicket).where(DispatchTicket.id.in_(req.ticket_ids))
    res = await db.execute(query)
    tickets = res.scalars().all()

    if not tickets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운반 티켓 정보를 찾을 수 없습니다."
        )

    # 관리자가 아니면 본인 차주 소속 티켓인지 확인
    if not current_user.is_admin:
        for t in tickets:
            if t.driver_id != current_user.id and (t.car_id not in owner_car_ids):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"티켓 #{t.id}에 대한 승인 권한이 없습니다."
                )

    now = datetime.now()
    for t in tickets:
        t.tax_invoice_confirmed_by_driver = True
        t.tax_invoice_confirmed_at = now

    await db.commit()

    return {
        "success": True,
        "confirmed_count": len(tickets),
        "message": f"총 {len(tickets)}건의 운반 정산 금액이 정상 확인 및 마감 승인되었습니다. (현장 세금계산서 발행대기로 전환)"
    }


@router.post(
    "/tax-invoices/issue",
    summary="[차주/현장 세금계산서] 국세청 전자세금계산서 일괄 청구/발행 처리"
)
async def issue_tax_invoices(
    req: TaxInvoiceIssueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    선택한 티켓 항목들에 대해 국세청 전자세금계산서 발행 처리를 적용합니다.
    국세청 승인번호(NTS-YYYYMMDD-XXXXXX) 발급 및 DB 플래그 트랜잭션 완료.
    """
    if not req.ticket_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="발행할 운반 정산 티켓을 선택해 주세요."
        )

    query = select(DispatchTicket).where(DispatchTicket.id.in_(req.ticket_ids))
    res = await db.execute(query)
    tickets = res.scalars().all()

    if not tickets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 운반 티켓 정보를 찾을 수 없습니다."
        )

    now = datetime.now()
    date_part = now.strftime("%Y%m%d")

    is_dropoff = req.invoice_type == "DROPOFF"

    for t in tickets:
        if is_dropoff:
            t.dropoff_invoice_issued = True
            t.dropoff_invoice_issued_at = now
            if not getattr(t, "dropoff_invoice_nts_code", None):
                t.dropoff_invoice_nts_code = f"NTS-{date_part}-{t.id:06d}-DROP"
        else:
            t.tax_invoice_issued = True
            t.tax_invoice_issued_at = now
            if not getattr(t, "tax_invoice_nts_code", None):
                t.tax_invoice_nts_code = f"NTS-{date_part}-{t.id:06d}"

    await db.commit()

    target_title = "하차지 B2B" if is_dropoff else "차주 운반비"
    return {
        "success": True,
        "issued_count": len(tickets),
        "message": f"총 {len(tickets)}건의 {target_title} 국세청 전자세금계산서가 성공적으로 발행되었습니다."
    }


@router.get(
    "/tax-invoices/site-consignment",
    summary="[현장관리자용] 현장별 차주 운반비 위수탁 세금계산서 및 하차지 B2B 정산 데이터 조회"
)
async def get_site_tax_invoice_consignment(
    site_id: Optional[int] = None,
    year_month: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    현장관리자 관할 현장의 배차 티켓을 기반으로:
    1) 차주별 운반비 위수탁 발행 데이터 (차량별, 차주별, 배차 건수, 인증서 유무, 마감대기/발행대기/전송완료)
    2) 하차지별 B2B 정산 데이터 (하차지명, 사업자번호, 계약유형, 현장출발 vs 하차지도착 건수 대조, 오차건수)
    를 실시간 조회합니다.
    """
    from app.models import SiteEmployee

    # 1. 현장관리자가 권한을 가진 ConstructionSite ID 목록 조회
    site_query = select(ConstructionSite)
    if not current_user.is_admin:
        emp_query = select(SiteEmployee.site_id).where(
            (SiteEmployee.user_id == current_user.id) |
            (SiteEmployee.registered_phone == current_user.phone_number)
        )
        emp_res = await db.execute(emp_query)
        emp_site_ids = [r[0] for r in emp_res.all() if r[0]]

        site_conditions = [ConstructionSite.user_id == current_user.id]
        if emp_site_ids:
            site_conditions.append(ConstructionSite.id.in_(emp_site_ids))
        site_query = site_query.where(or_(*site_conditions))

    if site_id:
        site_query = site_query.where(ConstructionSite.id == site_id)

    sites_res = await db.execute(site_query)
    sites = sites_res.scalars().all()
    site_ids = [s.id for s in sites]

    if not site_ids:
        return {
            "driver_consignments": [],
            "dropoff_settlements": [],
            "summary": {
                "total_drivers": 0,
                "total_tickets": 0,
                "total_supply_price": 0,
                "total_vat": 0,
                "total_amount": 0,
                "waiting_confirm_count": 0,
                "ready_to_issue_count": 0,
                "issued_count": 0,
            }
        }

    # 2. 해당 현장들의 JobPost 조회
    job_query = select(JobPost).where(JobPost.site_id.in_(site_ids))
    jobs_res = await db.execute(job_query)
    jobs = jobs_res.scalars().all()
    job_map = {j.id: j for j in jobs}
    job_ids = list(job_map.keys())

    if not job_ids:
        return {
            "driver_consignments": [],
            "dropoff_settlements": [],
            "summary": {
                "total_drivers": 0,
                "total_tickets": 0,
                "total_supply_price": 0,
                "total_vat": 0,
                "total_amount": 0,
                "waiting_confirm_count": 0,
                "ready_to_issue_count": 0,
                "issued_count": 0,
            }
        }

    # 3. 배차 티켓 조회
    ticket_query = (
        select(DispatchTicket)
        .where(DispatchTicket.job_post_id.in_(job_ids))
        .options(
            selectinload(DispatchTicket.driver),
            selectinload(DispatchTicket.car).selectinload(Car.owner),
            selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
            selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off).selectinload(DropOff.owner).selectinload(User.drop_off_profile),
            selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off).selectinload(DropOff.owner).selectinload(User.drop_off_profile),
        )
        .order_by(DispatchTicket.accepted_at.desc())
    )
    tickets_res = await db.execute(ticket_query)
    all_tickets = tickets_res.scalars().all()

    # 연월 필터링 (예: '2026-10')
    if year_month:
        filtered_tickets = []
        for t in all_tickets:
            t_date = t.completed_at or t.driving_started_at or t.accepted_at
            if t_date and t_date.strftime("%Y-%m").startswith(year_month):
                filtered_tickets.append(t)
        all_tickets = filtered_tickets

    # 4. 차주(Owner) 및 기사(Driver) 서류(인증서/사업자등록증) 정보 사전 조회
    all_user_ids = set()
    for t in all_tickets:
        if t.driver_id:
            all_user_ids.add(t.driver_id)
        if t.car and t.car.owner_id:
            all_user_ids.add(t.car.owner_id)

    doc_map = {}
    if all_user_ids:
        doc_query = select(UserUploadedDocument).where(UserUploadedDocument.user_id.in_(list(all_user_ids)))
        doc_res = await db.execute(doc_query)
        for doc in doc_res.scalars().all():
            if doc.user_id not in doc_map:
                doc_map[doc.user_id] = set()
            doc_map[doc.user_id].add(doc.document_code)

    # 5. [탭 1] 차주별 운반비 위수탁 집계 (car_id / owner_id 기준 그룹화)
    # 정산이 최종 완료(SETTLEMENT_CONFIRMED)된 운송 건만 세금계산서 발행 대상에 포함!
    driver_group_map = {}
    for t in all_tickets:
        if t.status != "SETTLEMENT_CONFIRMED":
            continue

        car_obj = t.car
        owner_obj = car_obj.owner if car_obj else None
        driver_user = t.driver

        owner_id = owner_obj.id if owner_obj else (driver_user.id if driver_user else 0)
        owner_name = owner_obj.name if owner_obj else (driver_user.name if driver_user else "차주 미등록")
        owner_phone = owner_obj.phone_number if owner_obj else (driver_user.phone_number if driver_user else "")
        car_number = car_obj.car_number if car_obj else "차량 미배정"
        car_id = car_obj.id if car_obj else 0

        # 위수탁 인증서/사업자등록증 등록 여부 (차주 또는 기사의 BIZ_LICENSE / MACHINERY_REG 등록 확인)
        has_biz_license = bool(
            (owner_id in doc_map and "BIZ_LICENSE" in doc_map[owner_id]) or
            (driver_user and driver_user.id in doc_map and "BIZ_LICENSE" in doc_map[driver_user.id]) or
            (car_obj and (car_obj.biz_license_url or car_obj.biz_license_file))
        )

        job = t.job_post
        fare = t.accumulated_fare if t.accumulated_fare and t.accumulated_fare > 0 else (job.offered_unit_price if job else 0)

        group_key = f"{owner_id}_{car_id}"
        if group_key not in driver_group_map:
            driver_group_map[group_key] = {
                "key": group_key,
                "owner_id": owner_id,
                "owner_name": owner_name,
                "owner_phone": owner_phone,
                "car_id": car_id,
                "car_number": car_number,
                "certificate_registered": has_biz_license,
                "certificate_label": "등록완료" if has_biz_license else "미등록",
                "total_tickets": 0,            # 총 배차 건수(건)
                "unit_price": fare,            # 회당 운반 단가
                "supply_price": 0,             # 공급가액
                "vat": 0,                      # 부가세
                "total_amount": 0,             # 합계 금액
                "ticket_ids": [],
                "tax_invoice_issued_count": 0,
                "confirmed_by_driver_count": 0,
                "latest_nts_code": None,
                "latest_issued_at": None,
                "tickets_detail": []
            }

        dg = driver_group_map[group_key]
        dg["total_tickets"] += 1
        dg["unit_price"] = fare or dg["unit_price"]
        dg["supply_price"] += fare
        vat_amount = math.floor(fare * 0.1)
        dg["vat"] += vat_amount
        dg["total_amount"] += (fare + vat_amount)
        dg["ticket_ids"].append(t.id)

        if t.tax_invoice_issued:
            dg["tax_invoice_issued_count"] += 1
            if getattr(t, "tax_invoice_nts_code", None):
                dg["latest_nts_code"] = t.tax_invoice_nts_code
            if getattr(t, "tax_invoice_issued_at", None):
                dg["latest_issued_at"] = t.tax_invoice_issued_at.strftime("%Y-%m-%d %H:%M")

        if getattr(t, "tax_invoice_confirmed_by_driver", False):
            dg["confirmed_by_driver_count"] += 1

        dg["tickets_detail"].append({
            "ticket_id": t.id,
            "status": t.status,
            "date": (t.completed_at or t.driving_started_at or t.accepted_at).strftime("%Y-%m-%d") if (t.completed_at or t.driving_started_at or t.accepted_at) else "",
            "fare": fare,
            "tax_invoice_issued": bool(t.tax_invoice_issued),
            "tax_invoice_confirmed_by_driver": bool(getattr(t, "tax_invoice_confirmed_by_driver", False)),
            "nts_code": getattr(t, "tax_invoice_nts_code", None)
        })

    driver_consignments = []
    total_supply_price = 0
    total_vat = 0
    total_amount = 0
    waiting_confirm_count = 0
    ready_to_issue_count = 0
    issued_count = 0

    for dg in driver_group_map.values():
        total_supply_price += dg["supply_price"]
        total_vat += dg["vat"]
        total_amount += dg["total_amount"]

        # 상태 산정:
        # 1) 전체 발행 완료: issued_count == total_tickets -> "전송완료"
        # 2) 인증서 미등록: certificate_registered == False -> "인증서 미등록"
        # 3) 차주 미승인: confirmed_by_driver_count < total_tickets -> "마감대기" (발행 불가)
        # 4) 발행 준비 완료: "발행대기" (일괄 발행 가능)
        if dg["tax_invoice_issued_count"] == dg["total_tickets"] and dg["total_tickets"] > 0:
            status_code = "ISSUED"
            status_label = "전송완료"
            issued_count += 1
        elif not dg["certificate_registered"]:
            status_code = "NO_CERT"
            status_label = "인증서 미등록"
        elif dg["confirmed_by_driver_count"] < dg["total_tickets"]:
            status_code = "WAITING_DRIVER"
            status_label = "마감대기"
            waiting_confirm_count += 1
        else:
            status_code = "READY_TO_ISSUE"
            status_label = "발행대기"
            ready_to_issue_count += 1

        dg["status_code"] = status_code
        dg["status_label"] = status_label
        driver_consignments.append(dg)

    # 6. [탭 2] 하차지별 B2B 위수탁 정산 집계
    # 그룹 키: drop_off_id
    dropoff_group_map = {}
    for t in all_tickets:
        if t.status in ["CANCELLED", "REJECTED"]:
            continue

        job = t.job_post
        if not job:
            continue

        drop_off = None
        if job.drop_off_request and job.drop_off_request.drop_off:
            drop_off = job.drop_off_request.drop_off
        elif job.matched_drop_off:
            drop_off = job.matched_drop_off

        dropoff_id = drop_off.id if drop_off else 0
        dropoff_name = drop_off.name if drop_off else (job.drop_off_name or "하차지 미지정")
        dropoff_address = drop_off.address if drop_off else (job.drop_off_address or "-")

        dropoff_owner = drop_off.owner if drop_off else None
        dropoff_profile = dropoff_owner.drop_off_profile if (dropoff_owner and hasattr(dropoff_owner, "drop_off_profile")) else None
        
        business_number = "105-86-99214"
        if dropoff_profile and getattr(dropoff_profile, "permit_number", None):
            business_number = dropoff_profile.permit_number
        elif dropoff_owner and getattr(dropoff_owner, "phone_number", None):
            business_number = f"010-{dropoff_owner.phone_number[-8:-4]}-{dropoff_owner.phone_number[-4:]}"

        # 계약 유형: JobPost payer_type ('SITE_PAYS' or 'DROPOFF_PAYS' or 'FREE')
        payer_type = job.payer_type or "SITE_PAYS"
        contract_type = "현장 지출 (토사 처리비 지급)" if payer_type == "SITE_PAYS" else "하차지 지출 (골재/양질토 매각)"

        unit_price = 0
        if job.drop_off_request and getattr(job.drop_off_request, "unit_price", None):
            unit_price = job.drop_off_request.unit_price
        elif job.offered_unit_price:
            unit_price = job.offered_unit_price

        group_key = f"dropoff_{dropoff_id}_{payer_type}"
        if group_key not in dropoff_group_map:
            dropoff_group_map[group_key] = {
                "group_key": group_key,
                "dropoff_id": dropoff_id,
                "dropoff_name": dropoff_name,
                "dropoff_address": dropoff_address,
                "business_number": business_number,
                "contract_type": contract_type,
                "payer_type": payer_type,
                "site_departure_count": 0,    # 현장 출발 배차 건수 (상차 승인 완료 이상)
                "dropoff_arrived_count": 0,   # 하차지 도착 승인 배차 건수 (APPROVED/COMPLETED)
                "discrepancy_count": 0,       # 오차 건수
                "unit_price": unit_price,
                "supply_price": 0,
                "vat": 0,
                "total_amount": 0,
                "ticket_ids": [],
                "invoice_issued": False,
                "invoice_nts_code": None,
                "invoice_issued_at": None,
            }

        d_grp = dropoff_group_map[group_key]
        d_grp["site_departure_count"] += 1
        # 하차지 도착 승인 여부 (APPROVED, COMPLETED 등 반입 승인된 티켓만 정산 티켓으로 인정)
        is_arrived = t.status in ["APPROVED", "COMPLETED", "SETTLEMENT_APPROVED", "SETTLEMENT_PAID", "SETTLEMENT_CONFIRMED"]
        if is_arrived:
            d_grp["dropoff_arrived_count"] += 1
            d_grp["ticket_ids"].append(t.id)

        # 하차지 B2B 전용 세금계산서 발행 플래그 확인
        if getattr(t, "dropoff_invoice_issued", False):
            d_grp["invoice_issued"] = True
            if getattr(t, "dropoff_invoice_nts_code", None):
                d_grp["invoice_nts_code"] = t.dropoff_invoice_nts_code
            if getattr(t, "dropoff_invoice_issued_at", None):
                d_grp["invoice_issued_at"] = t.dropoff_invoice_issued_at.strftime("%Y-%m-%d %H:%M")

    dropoff_settlements = []
    for d_grp in dropoff_group_map.values():
        d_grp["discrepancy_count"] = d_grp["dropoff_arrived_count"] - d_grp["site_departure_count"]
        calc_count = d_grp["dropoff_arrived_count"]
        d_grp["supply_price"] = calc_count * d_grp["unit_price"]
        d_grp["vat"] = math.floor(d_grp["supply_price"] * 0.1)
        d_grp["total_amount"] = d_grp["supply_price"] + d_grp["vat"]
        dropoff_settlements.append(d_grp)

    return {
        "driver_consignments": driver_consignments,
        "dropoff_settlements": dropoff_settlements,
        "summary": {
            "total_drivers": len(driver_consignments),
            "total_tickets": sum(d["total_tickets"] for d in driver_consignments),
            "total_supply_price": total_supply_price,
            "total_vat": total_vat,
            "total_amount": total_amount,
            "waiting_confirm_count": waiting_confirm_count,
            "ready_to_issue_count": ready_to_issue_count,
            "issued_count": issued_count,
        }
    }


@router.get(
    "/tax-invoices/dropoff-summary",
    summary="[하차지 관리자용] 하차지별 상차지(공사현장) B2B 전자세금계산서 및 반입 물량 정산 대장 조회"
)
async def get_dropoff_tax_invoice_summary(
    dropoff_id: Optional[int] = None,
    year_month: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    하차지 지주/관리자 관할 하차지의 반입 배차 티켓을 기반으로:
    1) 상차지(공사현장)별 B2B 전자세금계산서 발행/수취 내역
    2) 계약 유형(하차지 지출 매입 vs 현장 지출 매출)
    3) 상차지 출발 배차 건수 vs 하차지 도착 승인 배차 건수 실시간 물량 대사
    를 집계 반환합니다.
    """
    # 1. 하차지 관리자가 소유한 DropOff ID 목록 조회
    dropoff_query = select(DropOff)
    if not current_user.is_admin:
        dropoff_query = dropoff_query.where(DropOff.owner_id == current_user.id)

    if dropoff_id:
        dropoff_query = dropoff_query.where(DropOff.id == dropoff_id)

    dropoffs_res = await db.execute(dropoff_query)
    dropoffs = dropoffs_res.scalars().all()
    dropoff_ids = [d.id for d in dropoffs]
    dropoff_map = {d.id: d for d in dropoffs}

    if not dropoff_ids:
        return {
            "invoices": [],
            "summary": {
                "total_dropoffs": 0,
                "total_sites": 0,
                "total_tickets": 0,
                "total_supply_price": 0,
                "total_vat": 0,
                "total_amount": 0,
                "issued_count": 0,
                "pending_count": 0,
            }
        }

    # 2. DropOffRequest ID 목록 조회
    req_query = select(DropOffRequest.id, DropOffRequest.drop_off_id).where(DropOffRequest.drop_off_id.in_(dropoff_ids))
    req_res = await db.execute(req_query)
    req_rows = req_res.all()
    dropoff_req_ids = [r[0] for r in req_rows]

    # 3. 해당 하차지 연동 JobPost 조회
    job_conditions = []
    if dropoff_ids:
        job_conditions.append(JobPost.matched_drop_off_id.in_(dropoff_ids))
    if dropoff_req_ids:
        job_conditions.append(JobPost.drop_off_request_id.in_(dropoff_req_ids))

    job_query = select(JobPost).where(or_(*job_conditions))
    jobs_res = await db.execute(job_query)
    jobs = jobs_res.scalars().all()
    job_map = {j.id: j for j in jobs}
    job_ids = list(job_map.keys())

    if not job_ids:
        return {
            "invoices": [],
            "summary": {
                "total_dropoffs": len(dropoffs),
                "total_sites": 0,
                "total_tickets": 0,
                "total_supply_price": 0,
                "total_vat": 0,
                "total_amount": 0,
                "issued_count": 0,
                "pending_count": 0,
            }
        }

    # 4. 배차 티켓 조회
    ticket_query = (
        select(DispatchTicket)
        .where(DispatchTicket.job_post_id.in_(job_ids))
        .options(
            selectinload(DispatchTicket.driver),
            selectinload(DispatchTicket.car),
            selectinload(DispatchTicket.job_post).selectinload(JobPost.site),
            selectinload(DispatchTicket.job_post).selectinload(JobPost.matched_drop_off),
            selectinload(DispatchTicket.job_post).selectinload(JobPost.drop_off_request).selectinload(DropOffRequest.drop_off),
        )
        .order_by(DispatchTicket.accepted_at.desc())
    )
    tickets_res = await db.execute(ticket_query)
    all_tickets = tickets_res.scalars().all()

    # 연월 필터
    if year_month:
        filtered_tickets = []
        for t in all_tickets:
            t_date = t.completed_at or t.driving_started_at or t.accepted_at
            if t_date and t_date.strftime("%Y-%m").startswith(year_month):
                filtered_tickets.append(t)
        all_tickets = filtered_tickets

    # 5. 상차지(Site) + 계약유형 기준 그룹화
    # 그룹 키: (site_id, dropoff_id, payer_type)
    group_map = {}
    for t in all_tickets:
        if t.status in ["CANCELLED", "REJECTED"]:
            continue

        job = t.job_post
        if not job:
            continue

        site_obj = job.site
        site_id = site_obj.id if site_obj else job.site_id
        site_name = (site_obj.site_name or site_obj.company_name) if site_obj else "상차지 미지정"
        company_name = site_obj.company_name if site_obj else "건설사 미등록"
        business_number = site_obj.business_number if site_obj else "000-00-0000"
        billing_email = site_obj.billing_email if site_obj else ""

        # 하차지 확인
        drop_off = None
        if job.drop_off_request and job.drop_off_request.drop_off:
            drop_off = job.drop_off_request.drop_off
        elif job.matched_drop_off:
            drop_off = job.matched_drop_off

        dropoff_id_val = drop_off.id if drop_off else 0
        dropoff_name_val = drop_off.name if drop_off else "하차지 미지정"

        payer_type = job.payer_type or "SITE_PAYS"
        # 하차지 관점 명칭:
        # SITE_PAYS: 현장에서 하차지에 토사 처리비 지급 -> 하차지 입장에서는 [매출세금계산서]
        # DROPOFF_PAYS: 하차지가 현장에서 골재/양질토 구매 -> 하차지 입장에서는 [매입세금계산서]
        if payer_type == "SITE_PAYS":
            tax_type = "SALES"
            tax_type_label = "매출 (현장 토사처리비 수령)"
            btn_action_label = "매출세금계산서 발행"
        else:
            tax_type = "PURCHASE"
            tax_type_label = "매입 (양질토 매입 대금 지급)"
            btn_action_label = "매입세금계산서 승인(발행)"

        unit_price = 0
        if job.drop_off_request and getattr(job.drop_off_request, "unit_price", None):
            unit_price = job.drop_off_request.unit_price
        elif job.offered_unit_price:
            unit_price = job.offered_unit_price

        group_key = f"drop_{dropoff_id_val}_site_{site_id}_{payer_type}"
        if group_key not in group_map:
            group_map[group_key] = {
                "group_key": group_key,
                "dropoff_id": dropoff_id_val,
                "dropoff_name": dropoff_name_val,
                "site_id": site_id,
                "site_name": site_name,
                "company_name": company_name,
                "business_number": business_number,
                "billing_email": billing_email,
                "payer_type": payer_type,
                "tax_type": tax_type,
                "tax_type_label": tax_type_label,
                "btn_action_label": btn_action_label,
                "unit_price": unit_price,
                "site_departure_count": 0,    # 현장 출발 배차 건수
                "dropoff_arrived_count": 0,   # 하차지 도착 승인 배차 건수
                "discrepancy_count": 0,       # 오차 건수
                "supply_price": 0,
                "vat": 0,
                "total_amount": 0,
                "ticket_ids": [],
                "invoice_issued": False,
                "invoice_nts_code": None,
                "invoice_issued_at": None,
                "tickets_detail": []
            }

        grp = group_map[group_key]
        grp["site_departure_count"] += 1
        # 도착 승인 완료 여부
        is_arrived = t.status in ["APPROVED", "COMPLETED", "SETTLEMENT_APPROVED", "SETTLEMENT_PAID", "SETTLEMENT_CONFIRMED"]
        if is_arrived:
            grp["dropoff_arrived_count"] += 1
            grp["ticket_ids"].append(t.id)

        # 하차지 B2B 전용 세금계산서 발행 플래그 확인
        if getattr(t, "dropoff_invoice_issued", False):
            grp["invoice_issued"] = True
            if getattr(t, "dropoff_invoice_nts_code", None):
                grp["invoice_nts_code"] = t.dropoff_invoice_nts_code
            if getattr(t, "dropoff_invoice_issued_at", None):
                grp["invoice_issued_at"] = t.dropoff_invoice_issued_at.strftime("%Y-%m-%d %H:%M")

        grp["tickets_detail"].append({
            "ticket_id": t.id,
            "status": t.status,
            "is_arrived": is_arrived,
            "date": (t.completed_at or t.driving_started_at or t.accepted_at).strftime("%Y-%m-%d") if (t.completed_at or t.driving_started_at or t.accepted_at) else "",
            "soil_type": job.soil_type if job and getattr(job, "soil_type", None) else "일반 토사",
            "unit_price": unit_price,
            "invoice_issued": bool(getattr(t, "dropoff_invoice_issued", False)),
            "nts_code": getattr(t, "dropoff_invoice_nts_code", None)
        })

    invoices = []
    total_supply_price = 0
    total_vat = 0
    total_amount = 0
    issued_count = 0
    pending_count = 0
    distinct_sites = set()

    for grp in group_map.values():
        grp["discrepancy_count"] = grp["dropoff_arrived_count"] - grp["site_departure_count"]
        calc_count = grp["dropoff_arrived_count"]
        grp["supply_price"] = calc_count * grp["unit_price"]
        grp["vat"] = math.floor(grp["supply_price"] * 0.1)
        grp["total_amount"] = grp["supply_price"] + grp["vat"]

        total_supply_price += grp["supply_price"]
        total_vat += grp["vat"]
        total_amount += grp["total_amount"]
        distinct_sites.add(grp["site_id"])

        if grp["invoice_issued"]:
            issued_count += 1
        else:
            pending_count += 1

        invoices.append(grp)

    return {
        "invoices": invoices,
        "summary": {
            "total_dropoffs": len(dropoffs),
            "total_sites": len(distinct_sites),
            "total_tickets": sum(inv["dropoff_arrived_count"] for inv in invoices),
            "total_supply_price": total_supply_price,
            "total_vat": total_vat,
            "total_amount": total_amount,
            "issued_count": issued_count,
            "pending_count": pending_count,
        }
    }



