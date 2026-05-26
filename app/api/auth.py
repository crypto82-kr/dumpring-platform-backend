from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError
import logging

from app.core.db import get_db
from app.models import User, Driver
from app.schemas.auth import DriverRegister, OwnerRegister, LoginRequest, TokenResponse, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token, ALGORITHM
from app.core.config import settings

logger = logging.getLogger("dumpring.auth")

# JWT 인증 처리를 위한 HTTPBearer 스키마 선언
security = HTTPBearer()

router = APIRouter()


@router.post(
    "/register-driver",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="덤프 트럭 기사 회원가입 및 선등록 연동",
    description="기사가 본인인증(CI) 및 폰 번호로 회원 가입을 수행합니다. 가입 시 차주가 기사의 폰 번호로 선등록해 둔 차량/차주 정보가 있다면 자동으로 연동(매칭)됩니다."
)
async def register_driver(
    data: DriverRegister,
    db: AsyncSession = Depends(get_db)
):
    # 1. 중복 가입 체크
    query = select(User).where(User.phone_number == data.phone_number)
    result = await db.execute(query)
    existing_user = result.scalars().first()
    
    if existing_user:
        logger.warning(f"회원 가입 실패: 이미 존재하는 휴대폰 번호 ({data.phone_number})")
        # 중복 휴대폰 번호에 대한 프론트엔드 맞춤형 커스텀 에러 처리
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ALREADY_REGISTERED",
                "message": "이미 가입된 휴대폰 번호입니다. 로그인해 주세요."
            }
        )

    try:
        # 2. 비밀번호 암호화 및 유저 엔티티 생성
        hashed_password = get_password_hash(data.password)
        new_user = User(
            phone_number=data.phone_number,
            password=hashed_password,
            name=data.name,
            ci=data.ci,
            is_driver=True,  # 기사 가입이므로 기사 권한 토글을 기본 활성화
            is_owner=False,
            is_site_manager=False,
            is_admin=False
        )
        
        db.add(new_user)
        # ID를 발급받기 위해 트랜잭션을 commit하지 않고 임시 반영(flush) 수행
        await db.flush()
        
        logger.info(f"신규 기사 유저 생성 성공: ID {new_user.id}, 이름: {new_user.name}")

        # 3. 차주 선등록 매칭 로직 작동
        # drivers 테이블에서 가입하려는 기사의 휴대폰 번호로 선등록된 건이 있는지 비동기 조회
        driver_query = select(Driver).where(Driver.registered_phone == data.phone_number)
        driver_result = await db.execute(driver_query)
        pre_registered_driver = driver_result.scalars().first()
        
        if pre_registered_driver:
            # 일치하는 선등록 레코드가 있는 경우, 기사 레코드와 유저 계정을 1:1 매칭 연동
            pre_registered_driver.user_id = new_user.id
            logger.info(f"★ [매칭 성공] 차주 선등록 기사 데이터 발견 및 매칭 연동 완료 (Driver ID: {pre_registered_driver.id} -> User ID: {new_user.id})")
        else:
            # 선등록 정보가 아직 없는 기사인 경우, 신규 기사 프로필 레코드를 생성하여 등록
            # 추후 차주가 차량을 매칭하거나 신규 등록할 수 있는 여지를 확보합니다.
            new_driver_profile = Driver(
                user_id=new_user.id,
                registered_phone=data.phone_number,
                is_approved=False  # 본사/차주 승인 대기 기본값
            )
            db.add(new_driver_profile)
            logger.info(f"기사 선등록 데이터가 없어 신규 Driver 프로필을 생성했습니다. (User ID: {new_user.id})")

        # 4. 최종 커밋 반영
        await db.commit()
        await db.refresh(new_user)
        
        return new_user

    except Exception as e:
        logger.error(f"회원 가입 및 매칭 처리 중 치명적인 에러 발생: {str(e)}")
        await db.rollback()
        raise e


@router.post(
    "/register-owner",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="덤프 트럭 차주 회원가입",
    description="차주 사장님이 본인인증(CI) 및 폰 번호로 가입합니다. 차주 사장님이 직접 운전(is_direct_driver=True)하시는 경우 기사 권한도 자동으로 함께 세팅됩니다."
)
async def register_owner(
    data: OwnerRegister,
    db: AsyncSession = Depends(get_db)
):
    # 1. 중복 가입 체크
    query = select(User).where(User.phone_number == data.phone_number)
    result = await db.execute(query)
    existing_user = result.scalars().first()
    
    if existing_user:
        logger.warning(f"차주 가입 실패: 이미 존재하는 휴대폰 번호 ({data.phone_number})")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ALREADY_REGISTERED",
                "message": "이미 가입된 휴대폰 번호입니다. 로그인해 주세요."
            }
        )

    try:
        # 2. 비밀번호 암호화 및 차주 유저 엔티티 생성
        hashed_password = get_password_hash(data.password)
        new_user = User(
            phone_number=data.phone_number,
            password=hashed_password,
            name=data.name,
            ci=data.ci,
            is_owner=True,  # 차주 권한 활성화
            is_driver=data.is_direct_driver,  # 직접 운전 시 기사 권한 동시 켜기
            is_site_manager=False,
            is_admin=False
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"신규 차주 유저 생성 성공: ID {new_user.id}, 직접운전여부: {data.is_direct_driver}")
        return new_user

    except Exception as e:
        logger.error(f"차주 회원 가입 중 에러 발생: {str(e)}")
        await db.rollback()
        raise e


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="통합 로그인 및 토큰 발급",
    description="휴대폰 번호와 비밀번호를 검증하여 API 호출 권한을 부여하는 서명된 Access Token(JWT)을 발급합니다."
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. 사용자 조회
    query = select(User).where(User.phone_number == data.phone_number)
    result = await db.execute(query)
    user = result.scalars().first()
    
    # 2. 로그인 예외 처리
    if not user or not verify_password(data.password, user.password):
        logger.warning(f"로그인 인증 실패: 번호 {data.phone_number} 또는 패스워드 불일치")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="휴대폰 번호 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. JWT 발급
    access_token = create_access_token(subject=user.id)
    logger.info(f"로그인 성공: User ID {user.id} ({user.name}) - JWT 액세스 토큰 발행 완료")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


# ==========================================
# FastAPI 공통 인증 의존성 함수 (Authorization Dependency)
# ==========================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    HTTP Bearer 헤더의 JWT 토큰을 해석하여 현재 인증된 사용자의 DB 엔티티를 반환합니다.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 자격 증명이 유효하지 않습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 토큰 디코딩
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception
        
    # 사용자 DB 엔티티 조회
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
        
    return user


async def get_current_owner(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    현재 로그인된 사용자가 '차주(is_owner=True)' 권한을 지녔는지 검증하고 반환합니다.
    권한이 없을 경우 403 Forbidden 에러를 반환합니다.
    """
    if not current_user.is_owner:
        logger.warning(f"인가 오류: User ID {current_user.id}은 차주 권한이 없습니다.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="차주 권한을 소지한 회원만 이용할 수 있는 기능입니다."
        )
    return current_user

