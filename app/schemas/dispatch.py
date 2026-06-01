from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class FavoriteRegionCreate(BaseModel):
    sido: str = Field(..., description="시/도 (예: 서울특별시, 경기도)")
    sigungu: str = Field(..., description="시/군/구 (예: 영등포구, 김포시)")

class FavoriteRegionResponse(BaseModel):
    id: int
    user_id: int
    sido: str
    sigungu: str
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

class DispatchTicketResponse(BaseModel):
    id: int
    job_post_id: int
    driver_id: int
    car_id: int
    status: str
    accumulated_fare: int
    drive_distance_km: float
    drive_time_seconds: int
    accepted_at: datetime
    driving_started_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True

class InspectionRequest(BaseModel):
    decision: str = Field(..., description="APPROVED 또는 REJECTED")
    soil_type: Optional[str] = Field(None, description="지주가 육안 판정한 토사 종류 (선택사항)")
