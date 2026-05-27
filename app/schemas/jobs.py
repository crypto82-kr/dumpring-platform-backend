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

class JobPostCreate(BaseModel):
    site_id: int = Field(..., description="발주 공사현장 ID")
    drop_off_request_id: int = Field(..., description="매치하려는 하차지 수용 공고 ID")
    work_date: datetime = Field(..., description="작업 희망 날짜 및 시간")
    required_trucks: int = Field(..., description="필요한 덤프 대수")


class JobPostResponse(BaseModel):
    id: int
    site_id: int
    drop_off_request_id: int
    author_id: int
    work_date: datetime
    required_trucks: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
