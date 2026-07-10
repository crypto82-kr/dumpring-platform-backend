from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError
from typing import List, Optional
import logging
import uuid

from app.core.db import get_db
from app.models import User, Driver, SiteProfile, DropOffProfile, SiteEmployee, ConstructionSite, SiteUserMapping, SiteUserStatus
from app.schemas.auth import (
    DriverRegister, OwnerRegister, LoginRequest, TokenResponse, UserResponse,
    SiteManagerRegister, SiteWorkerRegister, DropOffRegister
)
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
    "/signup/site-manager",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="공사현장 관리자 회원가입",
    description="현장관리자 계정을 생성하고 관련 현장 상세 프로필(SiteProfile) 정보를 저장합니다."
)
async def signup_site_manager(
    data: SiteManagerRegister,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.phone_number == data.phone_number)
    result = await db.execute(query)
    existing_user = result.scalars().first()
    
    if existing_user:
        logger.warning(f"현장관리자 가입 실패: 이미 존재하는 휴대폰 번호 ({data.phone_number})")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ALREADY_REGISTERED",
                "message": "이미 가입된 휴대폰 번호입니다. 로그인해 주세요."
            }
        )

    try:
        hashed_password = get_password_hash(data.password)
        new_user = User(
            phone_number=data.phone_number,
            password=hashed_password,
            name=data.name,
            ci=data.ci,
            is_site_manager=True,
            is_site_worker=False,
            is_owner=False,
            is_driver=False,
            is_drop_off=False,
            is_admin=False
        )
        db.add(new_user)
        await db.flush()

        new_profile = SiteProfile(
            user_id=new_user.id,
            company_name=data.company_name,
            site_name=data.site_name,
            business_number=data.business_number
        )
        db.add(new_profile)

        # ConstructionSite 생성 또는 조회
        site_query = select(ConstructionSite).where(
            ConstructionSite.business_number == data.business_number,
            ConstructionSite.company_name == data.company_name
        )
        site_result = await db.execute(site_query)
        site = site_result.scalars().first()

        if not site:
            site_key = f"SITE-{uuid.uuid4().hex[:6].upper()}"
            site = ConstructionSite(
                user_id=new_user.id,
                company_name=data.company_name,
                business_number=data.business_number,
                site_key=site_key,
                billing_email=f"billing@{data.phone_number}.com"  # 임시 이메일
            )
            db.add(site)
            await db.flush()

        # SiteUserMapping 생성 (관리자는 즉시 APPROVED)
        mapping = SiteUserMapping(
            site_id=site.id,
            user_id=new_user.id,
            status=SiteUserStatus.APPROVED
        )
        db.add(mapping)
        
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"신규 현장관리자 유저 및 프로필 생성 성공: ID {new_user.id}")
        return new_user

    except Exception as e:
        logger.error(f"현장관리자 회원가입 중 에러 발생: {str(e)}")
        await db.rollback()
        raise e


@router.post(
    "/signup/site-worker",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="공사현장 담당자 회원가입",
    description="현장담당자 계정을 생성하고 관련 현장 프로필을 저장합니다. 기존에 선등록된 현장 직원 정보가 있다면 자동 연동(매칭)됩니다."
)
async def signup_site_worker(
    data: SiteWorkerRegister,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.phone_number == data.phone_number)
    result = await db.execute(query)
    existing_user = result.scalars().first()
    
    if existing_user:
        logger.warning(f"현장담당자 가입 실패: 이미 존재하는 휴대폰 번호 ({data.phone_number})")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ALREADY_REGISTERED",
                "message": "이미 가입된 휴대폰 번호입니다. 로그인해 주세요."
            }
        )

    try:
        hashed_password = get_password_hash(data.password)
        new_user = User(
            phone_number=data.phone_number,
            password=hashed_password,
            name=data.name,
            ci=data.ci,
            is_site_manager=False,
            is_site_worker=True,
            is_owner=False,
            is_driver=False,
            is_drop_off=False,
            is_admin=False
        )
        db.add(new_user)
        await db.flush()

        new_profile = SiteProfile(
            user_id=new_user.id,
            company_name=data.company_name,
            site_name=data.site_name,
            business_number=data.business_number
        )
        db.add(new_profile)

        # ConstructionSite 조회 (site_key 기반)
        site_query = select(ConstructionSite).where(
            ConstructionSite.site_key == data.site_key
        )
        site_result = await db.execute(site_query)
        site = site_result.scalars().first()

        if not site:
            logger.warning(f"현장담당자 가입 실패: 유효하지 않은 현장 키 ({data.site_key})")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="올바르지 않은 현장 키입니다. 현장관리자(소장님)에게 문의하여 올바른 현장 키를 입력해 주세요."
            )

        # SiteUserMapping 생성 (담당자는 PENDING으로 시작)
        mapping = SiteUserMapping(
            site_id=site.id,
            user_id=new_user.id,
            status=SiteUserStatus.PENDING
        )
        db.add(mapping)

        # SiteEmployee 선등록 매칭 로직 작동
        employee_query = select(SiteEmployee).where(SiteEmployee.registered_phone == data.phone_number)
        employee_result = await db.execute(employee_query)
        pre_registered_employees = employee_result.scalars().all()
        
        for emp in pre_registered_employees:
            emp.user_id = new_user.id
            logger.info(f"★ [매칭 성공] 선등록 현장 직원 데이터 발견 및 매칭 연동 완료 (Employee ID: {emp.id} -> User ID: {new_user.id})")
        
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"신규 현장담당자 유저 및 프로필 생성 성공: ID {new_user.id}")
        return new_user

    except Exception as e:
        logger.error(f"현장담당자 회원가입 중 에러 발생: {str(e)}")
        await db.rollback()
        raise e


@router.post(
    "/signup/drop-off",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="하차지 지주 회원가입",
    description="하차지 지주 계정을 생성하고 관련 하차지 상세 프로필(DropOffProfile) 정보를 저장합니다."
)
async def signup_drop_off(
    data: DropOffRegister,
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.phone_number == data.phone_number)
    result = await db.execute(query)
    existing_user = result.scalars().first()
    
    if existing_user:
        logger.warning(f"하차지 지주 가입 실패: 이미 존재하는 휴대폰 번호 ({data.phone_number})")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ALREADY_REGISTERED",
                "message": "이미 가입된 휴대폰 번호입니다. 로그인해 주세요."
            }
        )

    try:
        hashed_password = get_password_hash(data.password)
        new_user = User(
            phone_number=data.phone_number,
            password=hashed_password,
            name=data.name,
            ci=data.ci,
            is_site_manager=False,
            is_site_worker=False,
            is_owner=False,
            is_driver=False,
            is_drop_off=True,
            is_admin=False
        )
        db.add(new_user)
        await db.flush()

        new_profile = DropOffProfile(
            user_id=new_user.id,
            location_name=data.location_name,
            address=data.address,
            permit_number=data.permit_number
        )
        db.add(new_profile)
        
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"신규 하차지 지주 유저 및 프로필 생성 성공: ID {new_user.id}")
        return new_user

    except Exception as e:
        logger.error(f"하차지 지주 회원가입 중 에러 발생: {str(e)}")
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


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    현재 로그인된 사용자가 '어드민(is_admin=True)' 권한을 지녔는지 검증하고 반환합니다.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="시스템 총괄 관리자(ADMIN) 권한이 필요합니다."
        )
    return current_user


# ==========================================
# ==========================================
# 필수 서류 공통코드화 및 가입 심사/승인 API
# ==========================================

from app.models import CommonCode, UserUploadedDocument
from app.schemas.auth import RequiredDocumentResponse, DocumentUploadRequest, MemberStatusResponse, SubmitApprovalRequest

@router.get(
    "/required-documents",
    summary="역할별 필수제출 서류 목록 조회",
    response_model=List[RequiredDocumentResponse],
    description="가입 시 필수 제출해야 하는 서류 종류를 공통코드에서 조회합니다. role은 'driver'(기사) 또는 'owner'(차주)입니다."
)
async def get_required_documents(
    role: str,
    db: AsyncSession = Depends(get_db)
):
    group_code = "REQUIRED_DOC_DRIVER" if role.lower() == "driver" else "REQUIRED_DOC_OWNER"
    
    query = select(CommonCode).where(
        CommonCode.group_code == group_code,
        CommonCode.is_active == True
    ).order_by(CommonCode.display_order.asc())
    
    result = await db.execute(query)
    codes = result.scalars().all()
    
    return [
        RequiredDocumentResponse(
            code=c.code,
            code_name=c.code_name,
            display_order=c.display_order
        ) for c in codes
    ]


@router.post(
    "/upload-document",
    summary="필수 서류 개별 파일명 등록 (업로드)",
    description="기사 또는 차주가 특정 코드(예: LICENSE, BIZ_LICENSE)의 필수 서류를 임시 업로드 등록합니다."
)
async def upload_document(
    data: DocumentUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. 기존 업로드 내역이 있는지 조회
    query = select(UserUploadedDocument).where(
        UserUploadedDocument.user_id == current_user.id,
        UserUploadedDocument.document_code == data.document_code
    )
    result = await db.execute(query)
    existing_doc = result.scalars().first()
    
    if existing_doc:
        # 이미 제출된 경우 기존 파일 정보 덮어쓰기
        existing_doc.file_name = data.file_name
        logger.info(f"유저 [ID: {current_user.id}] 필수서류 [{data.document_code}] 덮어쓰기 업데이트 완료.")
    else:
        new_doc = UserUploadedDocument(
            user_id=current_user.id,
            document_code=data.document_code,
            file_name=data.file_name
        )
        db.add(new_doc)
        logger.info(f"유저 [ID: {current_user.id}] 신규 필수서류 [{data.document_code}] 등록 완료.")
        
    await db.commit()
    return {"message": "서류가 정상적으로 업로드 처리되었습니다."}


@router.get(
    "/member-status",
    summary="로그인 회원의 서류제출 및 승인현황 조회",
    response_model=MemberStatusResponse,
    description="로그인한 기사 또는 차주가 본인의 전체 서류 제출 개수와 승인 여부, 반려 사유, 미제출 서류 목록을 실시간으로 확인합니다."
)
async def get_member_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. 역할 구분 및 필수 서류 그룹 설정
    if current_user.is_site_manager:
        role = "site_manager"
        group_code = "REQUIRED_DOC_SITE_MANAGER"
    elif current_user.is_drop_off:
        role = "drop_off"
        group_code = None
    elif current_user.is_owner:
        role = "owner"
        group_code = "REQUIRED_DOC_OWNER"
    else:
        role = "driver"
        group_code = "REQUIRED_DOC_DRIVER"
    
    # 2. 필수 공통코드 가져오기
    req_codes = []
    if group_code:
        codes_query = select(CommonCode).where(
            CommonCode.group_code == group_code,
            CommonCode.is_active == True
        ).order_by(CommonCode.display_order.asc())
        codes_result = await db.execute(codes_query)
        req_codes = codes_result.scalars().all()
    
    # 3. 유저가 제출한 서류 목록
    uploaded_codes = []
    if group_code:
        uploaded_query = select(UserUploadedDocument).where(UserUploadedDocument.user_id == current_user.id)
        uploaded_result = await db.execute(uploaded_query)
        uploaded_docs = uploaded_result.scalars().all()
        uploaded_codes = [d.document_code for d in uploaded_docs]
    
    # 4. 미제출 서류 목록 도출
    missing_docs = []
    for rc in req_codes:
        if rc.code not in uploaded_codes:
            missing_docs.append(
                RequiredDocumentResponse(
                    code=rc.code,
                    code_name=rc.code_name,
                    display_order=rc.display_order
                )
            )
            
    # 5. 심사 승인 여부 확인
    is_approved = False
    reject_reason = None
    
    if role == "driver":
        driver_query = select(Driver).where(Driver.user_id == current_user.id)
        driver_result = await db.execute(driver_query)
        driver = driver_result.scalars().first()
        if driver:
            is_approved = driver.is_approved
            reject_reason = driver.reject_reason
    else:
        # 차주
        is_approved = current_user.is_approved
        reject_reason = current_user.reject_reason
        
    return MemberStatusResponse(
        is_approved=is_approved,
        reject_reason=reject_reason,
        uploaded_documents=uploaded_codes,
        missing_documents=missing_docs
    )


@router.post(
    "/submit-approval",
    summary="회원 상세정보 제출 및 승인 요청",
    description="회원이 역할별 필수 상세 정보를 입력하고 최종 승인을 요청합니다."
)
async def submit_approval(
    data: SubmitApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    
    if current_user.is_site_manager:
        # Site Profile
        sp_query = select(SiteProfile).where(SiteProfile.user_id == current_user.id)
        sp_res = await db.execute(sp_query)
        profile = sp_res.scalars().first()
        if not profile:
            profile = SiteProfile(
                user_id=current_user.id,
                company_name=data.company_name or "",
                site_name=data.site_name or "",
                business_number=data.business_number or ""
            )
            db.add(profile)
        else:
            if data.company_name: profile.company_name = data.company_name
            if data.site_name: profile.site_name = data.site_name
            if data.business_number: profile.business_number = data.business_number
            
        # Construction Site
        cs_query = select(ConstructionSite).where(ConstructionSite.user_id == current_user.id)
        cs_res = await db.execute(cs_query)
        site = cs_res.scalars().first()
        if not site:
            site_key = f"SITE-{uuid.uuid4().hex[:6].upper()}"
            site = ConstructionSite(
                user_id=current_user.id,
                company_name=data.company_name or "",
                business_number=data.business_number or "",
                billing_email=f"billing@{current_user.phone_number}.com",
                site_key=site_key,
                site_address=data.address or "",
                latitude=data.latitude or 37.5665,
                longitude=data.longitude or 126.9780
            )
            db.add(site)
            await db.flush()
            
            # Site Mapping
            mapping = SiteUserMapping(
                site_id=site.id,
                user_id=current_user.id,
                status=SiteUserStatus.APPROVED
            )
            db.add(mapping)
        else:
            if data.company_name: site.company_name = data.company_name
            if data.business_number: site.business_number = data.business_number
            if data.address: site.site_address = data.address
            if data.latitude is not None: site.latitude = data.latitude
            if data.longitude is not None: site.longitude = data.longitude

    elif current_user.is_drop_off:
        # Drop Off Profile
        dp_query = select(DropOffProfile).where(DropOffProfile.user_id == current_user.id)
        dp_res = await db.execute(dp_query)
        profile = dp_res.scalars().first()
        if not profile:
            profile = DropOffProfile(
                user_id=current_user.id,
                location_name=data.location_name or "",
                address=data.address or "",
                permit_number=data.permit_number or ""
            )
            db.add(profile)
        else:
            if data.location_name: profile.location_name = data.location_name
            if data.address: profile.address = data.address
            if data.permit_number: profile.permit_number = data.permit_number
            
        # Drop Off Site
        do_query = select(DropOff).where(DropOff.owner_id == current_user.id)
        do_res = await db.execute(do_query)
        drop_off = do_res.scalars().first()
        if not drop_off:
            drop_off = DropOff(
                owner_id=current_user.id,
                name=data.location_name or "",
                address=data.address or "",
                latitude=data.latitude or 37.5665,
                longitude=data.longitude or 126.9780,
                permit_number=data.permit_number or ""
            )
            db.add(drop_off)
        else:
            if data.location_name: drop_off.name = data.location_name
            if data.address: drop_off.address = data.address
            if data.permit_number: drop_off.permit_number = data.permit_number
            if data.latitude is not None: drop_off.latitude = data.latitude
            if data.longitude is not None: drop_off.longitude = data.longitude

    elif current_user.is_owner:
        if data.is_direct_driver is not None:
            current_user.is_driver = data.is_direct_driver
            
    await db.commit()
    return {"message": "승인 요청 제출이 완료되었습니다."}


@router.get(
    "/admin/pending-members",
    summary="[어드민] 가입 심사 대기 중인 회원(차주/기사) 목록 조회",
    description="관리자가 제출된 서류를 보고 승인할 수 있도록, 대기 중인 기사/차주 회원 리스트와 그들이 제출한 서류 세부를 통합 반환합니다."
)
async def get_pending_members(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    response_list = []
    
    # 기사 중 아직 미승인(is_approved = False) 유저 검색
    driver_query = select(Driver).where(Driver.is_approved == False)
    driver_res = await db.execute(driver_query)
    drivers = driver_res.scalars().all()
    
    for d in drivers:
        name = "기사"
        phone = d.registered_phone
        user_id = d.user_id
        if user_id:
            u_query = select(User).where(User.id == user_id)
            u_res = await db.execute(u_query)
            u = u_res.scalars().first()
            if u:
                name = u.name
                phone = u.phone_number
                
        # 제출 서류
        doc_query = select(UserUploadedDocument).where(UserUploadedDocument.user_id == user_id)
        doc_res = await db.execute(doc_query)
        docs = doc_res.scalars().all()
        doc_summary = ", ".join([f"{d.document_code}: {d.file_name}" for d in docs])
        
        response_list.append({
            "id": user_id,
            "type": "기사 가입",
            "name": name,
            "phone_number": phone,
            "docs": doc_summary or "미제출",
            "created_at": d.created_at
        })
        
    # 차주 중 아직 미승인(is_approved = False) 유저 검색
    owner_query = select(User).where(User.is_owner == True, User.is_approved == False)
    owner_res = await db.execute(owner_query)
    owners = owner_res.scalars().all()
    
    for o in owners:
        # 어드민 계정은 제외
        if o.is_admin:
            continue
            
        doc_query = select(UserUploadedDocument).where(UserUploadedDocument.user_id == o.id)
        doc_res = await db.execute(doc_query)
        docs = doc_res.scalars().all()
        doc_summary = ", ".join([f"{d.document_code}: {d.file_name}" for d in docs])
        
        response_list.append({
            "id": o.id,
            "type": "차주 가입",
            "name": o.name,
            "phone_number": o.phone_number,
            "docs": doc_summary or "미제출",
            "created_at": o.created_at
        })

    # 현장관리자 중 아직 미승인(is_approved = False) 유저 검색 (site_profile 조인)
    site_mgr_query = select(User).options(selectinload(User.site_profile), selectinload(User.construction_sites)).where(User.is_site_manager == True, User.is_approved == False)
    site_mgr_res = await db.execute(site_mgr_query)
    site_managers = site_mgr_res.scalars().all()

    for sm in site_managers:
        if sm.is_admin:
            continue

        doc_query = select(UserUploadedDocument).where(UserUploadedDocument.user_id == sm.id)
        doc_res = await db.execute(doc_query)
        docs = doc_res.scalars().all()
        doc_summary = ", ".join([f"{d.document_code}: {d.file_name}" for d in docs])

        company = "협력 도급사"
        site_name_val = f"{sm.name}의 현장"
        biz_no = "미등록"
        address_val = "현장 주소 미등록"

        if sm.site_profile:
            if sm.site_profile.company_name:
                company = sm.site_profile.company_name
            if sm.site_profile.site_name:
                site_name_val = sm.site_profile.site_name
            if sm.site_profile.business_number:
                biz_no = sm.site_profile.business_number

        if sm.construction_sites:
            first_site = sm.construction_sites[0]
            if first_site.site_address:
                address_val = first_site.site_address

        response_list.append({
            "id": sm.id,
            "type": "현장관리자 가입",
            "name": sm.name,
            "phone_number": sm.phone_number,
            "docs": doc_summary or "미제출",
            "created_at": sm.created_at,
            "company_name": company,
            "site_name": site_name_val,
            "business_number": biz_no,
            "address": address_val
        })
        
    return response_list


@router.post(
    "/admin/members/{user_id}/approve",
    summary="[어드민] 특정 회원 최종 승인 처리",
    description="어드민이 서류 심사 결과에 대해 회원 가입을 최종 승인합니다."
)
async def approve_member(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 유저를 찾을 수 없습니다."
        )
        
    # 역할에 따라 승인 처리
    if user.is_driver:
        d_query = select(Driver).where(Driver.user_id == user_id)
        d_res = await db.execute(d_query)
        driver = d_res.scalars().first()
        if driver:
            driver.is_approved = True
            driver.reject_reason = None
            
    if user.is_owner or user.is_site_manager or user.is_drop_off:
        user.is_approved = True
        user.reject_reason = None
        
    await db.commit()
    return {"message": "회원 가입 서류 심사가 성공적으로 최종 승인 완료되었습니다."}


@router.post(
    "/admin/members/{user_id}/reject",
    summary="[어드민] 특정 회원 반려(거절) 처리",
    description="어드민이 사유와 함께 회원 가입 신청을 반려(거절) 처리합니다."
)
async def reject_member(
    user_id: int,
    reject_reason: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 유저를 찾을 수 없습니다."
        )
        
    # 역할에 따라 반려 처리
    if user.is_driver:
        d_query = select(Driver).where(Driver.user_id == user_id)
        d_res = await db.execute(d_query)
        driver = d_res.scalars().first()
        if driver:
            driver.is_approved = False
            driver.reject_reason = reject_reason
            
    if user.is_owner or user.is_site_manager or user.is_drop_off:
        user.is_approved = False
        user.reject_reason = reject_reason
        
    await db.commit()
    return {"message": "회원 가입 신청이 성공적으로 반려되었습니다."}


from pydantic import BaseModel

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None

@router.put(
    "/profile",
    summary="개인정보 및 프로필 수정",
    description="로그인한 사용자의 이름, 휴대폰 번호, 또는 비밀번호를 변경합니다."
)
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.name is not None:
        current_user.name = data.name
    if data.phone_number is not None:
        if data.phone_number != current_user.phone_number:
            query = select(User).where(User.phone_number == data.phone_number)
            result = await db.execute(query)
            existing = result.scalars().first()
            if existing:
                raise HTTPException(status_code=400, detail="이미 존재하는 전화번호입니다.")
            current_user.phone_number = data.phone_number
    if data.password is not None and data.password.strip() != "":
        current_user.password = get_password_hash(data.password)
    
    await db.commit()
    await db.refresh(current_user)
    return {"message": "프로필이 성공적으로 수정되었습니다.", "user": {
        "id": current_user.id,
        "name": current_user.name,
        "phone_number": current_user.phone_number,
        "is_owner": current_user.is_owner,
        "is_driver": current_user.is_driver,
        "is_site_manager": current_user.is_site_manager,
        "is_site_worker": current_user.is_site_worker,
        "is_drop_off": current_user.is_drop_off,
        "is_approved": current_user.is_approved
    }}


