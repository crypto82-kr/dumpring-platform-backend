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

class CarInfoResponse(BaseModel):
    id: int
    car_number: str
    tonnage: float

    class Config:
        orm_mode = True
        from_attributes = True

class DriverInfoResponse(BaseModel):
    id: int
    name: str
    phone_number: str

    class Config:
        orm_mode = True
        from_attributes = True

class DispatchTicketResponse(BaseModel):
    id: int
    job_post_id: int
    driver_id: int
    car_id: int
    status: str
    loading_approval_type: Optional[str] = None
    loading_rejection_reason: Optional[str] = None
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
    driver: Optional[DriverInfoResponse] = None
    car: Optional[CarInfoResponse] = None
    actual_material_type: Optional[str] = None
    changed_drop_off_id: Optional[int] = None
    change_reason: Optional[str] = None
    changed_at: Optional[KstDateTime] = None
    changed_drop_off: Optional[Any] = None

    class Config:
        orm_mode = True
        from_attributes = True

class ApproveLoadingRequest(BaseModel):
    approval_type: str = Field("OFFICE", description="'QR_SITE', 'QR_DRIVER', 'OFFICE', 'QR'")
    loaded_soil_type: Optional[str] = Field(None, description="상차 확인된 토사 종류")
    approval_memo: Optional[str] = Field(None, description="상차 확인 메모")

class RejectLoadingRequest(BaseModel):
    reason: str = Field(..., description="상차 보류/반려 사유 (품목 불일치, 과적 등)")

class InspectionRequest(BaseModel):
    decision: str = Field(..., description="APPROVED 또는 REJECTED")
    soil_type: Optional[str] = Field(None, description="지주가 육안 판정한 토사 종류 (선택사항)")
    rejection_reason: Optional[str] = Field(None, description="반입 반려(회차) 사유")
    inspection_type: Optional[str] = Field("OFFICE", description="'QR_SITE', 'QR_DRIVER', 'OFFICE'")

class ArriveRequest(BaseModel):
    drive_distance_km: Optional[float] = Field(None, description="실제 주행 거리 (km)")
    drive_time_seconds: Optional[int] = Field(None, description="실제 주행 시간 (초)")
    accumulated_fare: Optional[int] = Field(None, description="계산된 요금 (원)")
    offline_count: Optional[int] = Field(0, description="운행 중 오프라인/꺼짐 횟수")
    max_single_offline_seconds: Optional[int] = Field(0, description="단일 최대 오프라인 시간 (초)")
    total_offline_seconds: Optional[int] = Field(0, description="총 오프라인 시간 (초)")
    client_timestamp_ms: Optional[int] = Field(None, description="기사 단말기 현재 에폭 타임스탬프 (ms)")


class GpsTrackPoint(BaseModel):
    latitude: float = Field(..., description="위도")
    longitude: float = Field(..., description="경도")
    speed_kmh: float = Field(0.0, description="속도(km/h)")
    heading: Optional[float] = Field(None, description="방위각")
    accuracy: Optional[float] = Field(None, description="GPS 정확도(m)")
    recorded_at: Optional[datetime] = Field(None, description="수집 시각")

class GpsTrackBatchRequest(BaseModel):
    points: list[GpsTrackPoint] = Field(..., description="10초 동안 수집된 GPS 좌표 목록")

class GpsTrackResponse(BaseModel):
    id: int
    ticket_id: int
    driver_id: int
    latitude: float
    longitude: float
    speed_kmh: float
    heading: Optional[float]
    accuracy: Optional[float]
    recorded_at: datetime

    class Config:
        from_attributes = True


class ChangeMaterialDropOffRequest(BaseModel):
    new_material_type: Optional[str] = Field(None, description="실제 적재된 토질 종류 코드")
    new_drop_off_id: Optional[int] = Field(None, description="새로 변경할 하차지(사토장) ID")
    reason: str = Field(..., description="변경 사유 (예: 굴착 중 뻘토 발생으로 수용 가능한 사토장으로 긴급 변경)")
