from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# --- DropOffRequest (하차지 매립 수용 공고) 스키마 ---

class DropOffRequestCreate(BaseModel):
    material_type: str = Field(..., description="수용 화물/토사 종류 코드 (예: GOOD_SOIL, MUD_SOIL, ROCK, MIXED)", example="GOOD_SOIL")
    truck_type: str = Field(..., description="수용 차량 종류 코드 (예: T_15, T_25, T_27)", example="T_25")
    target_quantity: int = Field(..., description="목표 수량 (대수 단위)", example=100)
    payer_type: str = Field(..., description="비용 지급 주체 코드 (예: SITE_PAYS, DROP_OFF_PAYS, FREE)", example="SITE_PAYS")
    payment_method: str = Field(..., description="정산 방식 코드 (예: MONTHLY, DAILY)", example="MONTHLY")
    unit_price: int = Field(..., description="수용 단가 (원)", example=45000)
    has_washing_facility: bool = Field(False, description="세륜기 유무")
    night_work_allowed: bool = Field(False, description="야간 작업 허용 여부")
    rain_work_allowed: bool = Field(False, description="우천 작업 허용 여부")
    start_date: datetime = Field(..., description="수용 시작 날짜")
    end_date: datetime = Field(..., description="수용 종료 날짜")


class DropOffRequestResponse(BaseModel):
    id: int
    drop_off_id: int
    material_type: str
    truck_type: str
    target_quantity: int
    current_quantity: int
    payer_type: str
    payment_method: str
    unit_price: int
    has_washing_facility: bool
    night_work_allowed: bool
    rain_work_allowed: bool
    start_date: datetime
    end_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- JobPost (현장 덤프 모집 오더) 스키마 ---

# 흐름 A: 하차지 수용 공고를 지정하여 오더 작성 (기존)
class JobPostCreate(BaseModel):
    site_id: int = Field(..., description="발주 공사현장 ID")
    drop_off_request_id: int = Field(..., description="매치하려는 하차지 수용 공고 ID")
    work_date: datetime = Field(..., description="작업 희망 날짜 및 시간")
    required_trucks: int = Field(..., description="필요한 덤프 대수")


# 흐름 B: 상차지가 하차지 없이 먼저 모집 공고 등록 (신규)
class SiteJobPostCreate(BaseModel):
    site_id: int = Field(..., description="발주 공사현장 ID")
    material_type: str = Field(..., description="토사 종류 코드 (예: GOOD_SOIL, ROCK)", example="GOOD_SOIL")
    truck_type: str = Field(..., description="차량 규격 코드 (예: T_15, T_25)", example="T_25")
    work_date: datetime = Field(..., description="작업 희망 날짜 및 시간")
    required_trucks: int = Field(..., description="필요한 덤프 대수", example=10)
    offered_unit_price: int = Field(..., description="상차지 제시 단가 (원)", example=50000)
    payer_type: str = Field(..., description="비용 지급 주체 코드 (예: SITE_PAYS, FREE)", example="SITE_PAYS")
    memo: Optional[str] = Field(None, description="메모 / 특이사항", example="양질토 위주, 오전 작업 선호")


# 흐름 B: 하차지 지주가 상차지 공고에 매칭 요청
class JobMatchRequest(BaseModel):
    drop_off_id: int = Field(..., description="매칭하려는 본인 소유 하차지 ID")


class JobPostResponse(BaseModel):
    id: int
    site_id: int
    drop_off_request_id: Optional[int] = None
    author_id: int
    material_type: Optional[str] = None
    truck_type: Optional[str] = None
    offered_unit_price: Optional[int] = None
    payer_type: Optional[str] = None
    memo: Optional[str] = None
    matched_drop_off_id: Optional[int] = None
    work_date: datetime
    required_trucks: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
