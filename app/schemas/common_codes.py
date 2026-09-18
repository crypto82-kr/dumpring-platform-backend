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

class TonnageTariffItem(BaseModel):
    code: str = Field(..., description="톤수 코드 (예: TON_15, TON_25)")
    name: str = Field(..., description="톤수 명칭 (예: 15톤, 25.5톤)")
    desc: Optional[str] = Field("", description="설명")
    base_tariff: int = Field(..., description="기본 운반 단가 (원)")

class PricingPolicyResponse(BaseModel):
    tonnage_tariffs: list[TonnageTariffItem]
    commission_rate: float
    calculation_method: str
    continuous_distance_unit_fare: int
    continuous_time_unit_fare: int
    over_plan_distance_unit_fare: int
    over_plan_time_unit_fare: int
    peak_pricing_enabled: bool
    morning_peak_start: str
    morning_peak_end: str
    morning_distance_unit_fare: int
    morning_time_unit_fare: int
    evening_peak_start: str
    evening_peak_end: str
    evening_distance_unit_fare: int
    evening_time_unit_fare: int

class MeterPricingPolicyUpdate(BaseModel):
    tonnage_tariffs: Optional[list[TonnageTariffItem]] = None
    commission_rate: Optional[float] = 5.0
    calculation_method: str = "CONTINUOUS"
    continuous_distance_unit_fare: int = 1000
    continuous_time_unit_fare: int = 200
    over_plan_distance_unit_fare: int = 1500
    over_plan_time_unit_fare: int = 200
    peak_pricing_enabled: Optional[bool] = False
    morning_peak_start: Optional[str] = "07:00"
    morning_peak_end: Optional[str] = "09:30"
    morning_distance_unit_fare: Optional[int] = 1300
    morning_time_unit_fare: Optional[int] = 250
    evening_peak_start: Optional[str] = "17:00"
    evening_peak_end: Optional[str] = "20:00"
    evening_distance_unit_fare: Optional[int] = 1300
    evening_time_unit_fare: Optional[int] = 250

