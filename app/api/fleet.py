from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel

from app.core.db import get_db
from app.models import User, Driver, Car, Notification
from app.api.auth import get_current_owner, get_current_user

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

    # 차량에 배정된 기사 또는 차주 소속 기사들 조회
    driver_query = select(Driver).where(
        (Driver.owner_id == current_owner.id) |
        ((Driver.current_car_id.in_(car_ids)) if car_ids else (Driver.id == -1))
    )
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
    machinery_reg_file: str | None = None
    machinery_reg_url: str | None = None
    biz_license_file: str | None = None
    biz_license_url: str | None = None
    insurance_file: str | None = None
    insurance_url: str | None = None
 
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


class InviteDriverRequest(BaseModel):
    phone_number: str
    name: str


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
    phone = data.phone_number.strip()
    name = data.name.strip()

    # 1. 기사 회원으로 가입된 유저가 있는지 조회
    user_query = select(User).where(User.phone_number == phone)
    user_result = await db.execute(user_query)
    driver_user = user_result.scalars().first()

    # 2. Driver 테이블 선등록/링크 확인
    driver_query = select(Driver).where(Driver.registered_phone == phone)
    driver_result = await db.execute(driver_query)
    existing_driver = driver_result.scalars().first()

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

    # 3. 알림 전송 저장
    new_notif = Notification(
        target_phone=phone,
        sender_id=current_owner.id,
        message=f"'{current_owner.name}' 차주님으로부터 소속 기사 초대 요청이 도착했습니다. (기사 성명: {name})"
    )
    db.add(new_notif)
    await db.commit()

    return {"message": "기사 초대 알림이 정상적으로 전송되었습니다."}


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
        driver.is_approved = True  # 배정 시 자동 승인 처리

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
            code_name = "기타 서류"
            if doc.document_code == "DRIVERS_LICENSE":
                code_name = "운전면허증"
            elif doc.document_code == "CARGO_QUALIFICATION":
                code_name = "화물운송자격증"
            
            url = doc.file_name
            if url and not url.startswith("http"):
                url = "/static/uploads/documents/" + url.split("/")[-1]
            
            documents.append({
                "code": doc.document_code,
                "code_name": code_name,
                "file_name": doc.file_name.split("/")[-1],
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
