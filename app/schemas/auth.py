from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class DriverRegister(BaseModel):
    """
    덤프 트럭 기사 회원가입 요청 스키마
    """
    phone_number: str = Field(..., description="휴대폰 번호 (로그인 ID)", min_length=10, max_length=15)
    password: str = Field(..., description="비밀번호", min_length=4)
    name: str = Field(..., description="기사 실명")
    ci: Optional[str] = Field(None, description="본인인증 고유 키(CI)")

class UserResponse(BaseModel):
    """
    민감한 패스워드 정보를 배제한 표준 사용자 정보 반환 스키마
    """
    id: int
    ci: Optional[str] = None
    phone_number: str
    name: str
    
    is_site_manager: bool
    is_site_worker: bool
    is_owner: bool
    is_driver: bool
    is_drop_off: bool
    is_admin: bool
    
    created_at: datetime
    updated_at: datetime

    # Pydantic v2에서 SQLAlchemy ORM 객체 매핑 지원 설정
    model_config = ConfigDict(from_attributes=True)

class OwnerRegister(BaseModel):
    """
    덤프 트럭 차주 회원가입 요청 스키마
    """
    phone_number: str = Field(..., description="휴대폰 번호 (로그인 ID)", min_length=10, max_length=15)
    password: str = Field(..., description="비밀번호", min_length=4)
    name: str = Field(..., description="차주 실명/담당자명")
    ci: Optional[str] = Field(None, description="본인인증 고유 키(CI)")
    is_direct_driver: bool = Field(False, description="차주 사장님이 현장에서 덤프를 직접 운행(기사 겸직)하는지 여부")

class LoginRequest(BaseModel):
    """
    로그인 요청 스키마
    """
    phone_number: str = Field(..., description="휴대폰 번호 (로그인 ID)")
    password: str = Field(..., description="비밀번호")

class TokenResponse(BaseModel):
    """
    로그인 성공 시 Access Token 반환 스키마
    """
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class FleetRegister(BaseModel):
    """
    차주 소유의 덤프 트럭 및 소속 기사 선등록 요청 스키마
    """
    car_number: str = Field(..., description="차량 번호 (예: 경기80사1234)", min_length=5)
    tonnage: float = Field(..., description="차량 톤수 (예: 15.0, 24.0, 25.5 등)", gt=0)
    driver_phone: str = Field(..., description="소속 운전기사 휴대폰 번호 (기사가 가입 시 매칭됨)", min_length=10, max_length=15)


class SiteManagerRegister(BaseModel):
    """
    현장관리자 회원가입 요청 스키마
    """
    phone_number: str = Field(..., description="휴대폰 번호 (로그인 ID)", min_length=10, max_length=15)
    password: str = Field(..., description="비밀번호", min_length=4)
    name: str = Field(..., description="현장관리자 실명/담당자명")
    ci: Optional[str] = Field(None, description="본인인증 고유 키(CI)")
    company_name: str = Field(..., description="건설사/상호명")
    site_name: str = Field(..., description="현장명")
    business_number: str = Field(..., description="사업자등록번호")


class SiteWorkerRegister(BaseModel):
    """
    현장담당자 회원가입 요청 스키마
    """
    phone_number: str = Field(..., description="휴대폰 번호 (로그인 ID)", min_length=10, max_length=15)
    password: str = Field(..., description="비밀번호", min_length=4)
    name: str = Field(..., description="현장담당자 실명")
    ci: Optional[str] = Field(None, description="본인인증 고유 키(CI)")
    company_name: str = Field(..., description="건설사/상호명")
    site_name: str = Field(..., description="현장명")
    site_key: str = Field(..., description="현장관리자가 부여한 현장 키 (예: SITE-A1B2C3)")


class DropOffRegister(BaseModel):
    """
    하차지 지주 회원가입 요청 스키마
    """
    phone_number: str = Field(..., description="휴대폰 번호 (로그인 ID)", min_length=10, max_length=15)
    password: str = Field(..., description="비밀번호", min_length=4)
    name: str = Field(..., description="하차지 지주 실명")
    ci: Optional[str] = Field(None, description="본인인증 고유 키(CI)")
    location_name: str = Field(..., description="하차지/사토장 명칭")
    address: str = Field(..., description="하차지 주소")
    permit_number: str = Field(..., description="개발행위/토사 반입 허가증 번호")

