from pydantic import BaseModel, Field
from typing import Optional

class SiteEmployeeCreate(BaseModel):
    """
    현장 직원 등록용 Pydantic 스키마
    """
    phone_number: str = Field(..., description="등록할 직원의 휴대폰 번호 (로그인 ID)")
    employee_role: str = Field("staff", description="직원 직무 역할 ('staff' 또는 'admin')")

class SiteEmployeeResponse(BaseModel):
    """
    현장 직원 상세 조회 응답용 Pydantic 스키마
    """
    id: int
    site_id: int
    registered_phone: str
    employee_role: str
    user_id: Optional[int] = None
    name: Optional[str] = None  # 가입 완료 시 유저 실명, 미가입 시 '가입 대기'
    status: str  # '가입 완료' 또는 '가입 대기'

    class Config:
        from_attributes = True
