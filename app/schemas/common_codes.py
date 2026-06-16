from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CommonCodeCreate(BaseModel):
    group_code: str = Field(..., description="코드 그룹 (예: MATERIAL_TYPE, TRUCK_TYPE)", example="MATERIAL_TYPE")
    code: str = Field(..., description="코드값 (예: GOOD_SOIL, T_25)", example="GOOD_SOIL")
    code_name: str = Field(..., description="코드 한글/표시명 (예: 양질토, 25톤)", example="양질토")
    display_order: int = Field(0, description="정렬 순서")
    is_active: bool = Field(True, description="활성화 여부")


class CommonCodeResponse(BaseModel):
    id: int
    group_code: str
    code: str
    code_name: str
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CommonCodeUpdate(BaseModel):
    code_name: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class MeterPricingPolicyUpdate(BaseModel):
    calculation_method: str
    continuous_distance_unit_fare: int
    continuous_time_unit_fare: int
    over_plan_distance_unit_fare: int
    over_plan_time_unit_fare: int
