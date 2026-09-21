from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List
from pydantic import BaseModel

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

