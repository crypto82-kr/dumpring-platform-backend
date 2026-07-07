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
    
    # 필수 제출 서류 파일명/경로
    license_file: str = Field(..., description="운전면허증 (대형/1종) 파일명")
    safety_training_file: str = Field(..., description="건설업 기초안전교육 이수증 파일명")
    special_labor_training_file: str = Field(..., description="교육실시확인서 (특수형태근로자) 파일명")

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
    is_approved: bool
    reject_reason: Optional[str] = None
    
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
    
    # 필수 제출 서류 파일명/경로
    biz_license_file: str = Field(..., description="사업자등록증 파일명")
    machinery_reg_file: str = Field(..., description="건설기계 등록증·검사증 파일명")
    insurance_file: str = Field(..., description="보험가입증 파일명")
    
    # 직접 운행 시 기사용 필수 서류
    license_file: Optional[str] = Field(None, description="운전면허증 파일명 (직접운전 시 필수)")
    safety_training_file: Optional[str] = Field(None, description="건설업 기초안전교육 이수증 파일명 (직접운전 시 필수)")
    special_labor_training_file: Optional[str] = Field(None, description="교육실시확인서 (특수형태근로자) 파일명 (직접운전 시 필수)")

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
    
    # 필수 제출 서류 파일명/경로
    dust_report_file: str = Field(..., description="비산먼지 배출신고서 파일명")
    construction_contract_file: str = Field(..., description="공사 계약서 파일명")


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
    
    # 필수 제출 서류 파일명/경로
    development_permit_file: str = Field(..., description="개발행위 허가증 파일명")
    land_use_agreement_file: str = Field(..., description="토지 사용 승낙서 / 토지 대장 파일명")


class RequiredDocumentResponse(BaseModel):
    code: str
    code_name: str
    display_order: int

class DocumentUploadRequest(BaseModel):
    document_code: str
    file_name: str

class MemberStatusResponse(BaseModel):
    is_approved: bool
    is_submitted: bool = False
    reject_reason: Optional[str] = None
    uploaded_documents: list[str] = []
    missing_documents: list[RequiredDocumentResponse] = []


class SubmitApprovalRequest(BaseModel):
    company_name: Optional[str] = None
    site_name: Optional[str] = None
    business_number: Optional[str] = None
    address: Optional[str] = None
    detail_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    location_name: Optional[str] = None
    permit_number: Optional[str] = None
    
    is_direct_driver: Optional[bool] = None


class PreRegisterRequest(BaseModel):
    phone_number: str = Field(..., description="휴대폰 번호", min_length=10, max_length=15)
    password: str = Field(..., description="비밀번호", min_length=4)
    name: str = Field(..., description="사용자 실명")
    role: str = Field(..., description="선택 권한 (site_manager / dropoff_manager / owner)")

