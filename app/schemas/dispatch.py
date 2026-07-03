from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.schemas import KstDateTime
from app.schemas.jobs import JobPostResponse

class FavoriteRegionCreate(BaseModel):
    sido: str = Field(..., description="시/도 (예: 서울특별시, 경기도)")
    sigungu: str = Field(..., description="시/군/구 (예: 영등포구, 김포시)")

class FavoriteRegionResponse(BaseModel):
    id: int
    user_id: int
    sido: str
    sigungu: str
    created_at: KstDateTime

    class Config:
        orm_mode = True
        from_attributes = True

class MeterPricingPolicy(BaseModel):
    calculation_method: str  # "CONTINUOUS" | "OVER_PLAN"
    continuous_distance_unit_fare: int
    continuous_time_unit_fare: int
    over_plan_distance_unit_fare: int
    over_plan_time_unit_fare: int

class DispatchTicketResponse(BaseModel):
    id: int
    job_post_id: int
    driver_id: int
    car_id: int
    status: str
    loading_approval_type: Optional[str] = None
    proof_photo: Optional[str] = None
    accumulated_fare: int
    drive_distance_km: float
    drive_time_seconds: int
    accepted_at: KstDateTime
    driving_started_at: Optional[KstDateTime] = None
    arrived_at: Optional[KstDateTime] = None
    completed_at: Optional[KstDateTime] = None
    job_post: Optional[JobPostResponse] = None
    pricing_policy: Optional[MeterPricingPolicy] = None

    class Config:
        orm_mode = True
        from_attributes = True

class ApproveLoadingRequest(BaseModel):
    approval_type: str = Field(..., description="'QR' 또는 'OFFICE'")

class InspectionRequest(BaseModel):
    decision: str = Field(..., description="APPROVED 또는 REJECTED")
    soil_type: Optional[str] = Field(None, description="지주가 육안 판정한 토사 종류 (선택사항)")

class ArriveRequest(BaseModel):
    drive_distance_km: Optional[float] = Field(None, description="실제 주행 거리 (km)")
    drive_time_seconds: Optional[int] = Field(None, description="실제 주행 시간 (초)")
    accumulated_fare: Optional[int] = Field(None, description="계산된 요금 (원)")
    offline_count: Optional[int] = Field(0, description="운행 중 오프라인/꺼짐 횟수")
    max_single_offline_seconds: Optional[int] = Field(0, description="단일 최대 오프라인 시간 (초)")
    total_offline_seconds: Optional[int] = Field(0, description="총 오프라인 시간 (초)")
    client_timestamp_ms: Optional[int] = Field(None, description="기사 단말기 현재 에폭 타임스탬프 (ms)")
