from pydantic import BaseModel, Field
from typing import Optional

class SiteCreate(BaseModel):
    """
    상차지 등록용 Pydantic 스키마
    """
    company_name: str = Field(..., description="건설사/상호명")
    business_number: str = Field(..., description="사업자등록번호")
    site_address: Optional[str] = Field(None, description="상차지 주소")
    latitude: Optional[float] = Field(None, description="위도")
    longitude: Optional[float] = Field(None, description="경도")
    geofencing_radius: float = Field(200.0, description="지오펜싱 반경 (기본 200m)")


class DropOffCreate(BaseModel):
    """
    하차지 등록용 Pydantic 스키마
    """
    name: str = Field(..., description="하차지명")
    address: str = Field(..., description="주소")
    latitude: float = Field(..., description="위도")
    longitude: float = Field(..., description="경도")
    radius_meter: float = Field(200.0, description="도착 감지 반경 (기본 200m)")
    permit_number: str = Field(..., description="인허가번호")
    capacity: Optional[int] = Field(80000, description="허용 용량")
    soil_deal_type: Optional[str] = Field("sell", description="토사 거래 방식 구분 (sell, buy, free)")


class SiteResponse(BaseModel):
    id: int
    company_name: str
    business_number: str
    site_key: str
    site_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofencing_radius: float

    class Config:
        from_attributes = True


class SiteCreateResponse(BaseModel):
    message: str
    site: SiteResponse


class DropOffResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    address: str
    latitude: float
    longitude: float
    radius_meter: float
    permit_number: str
    status: str
    capacity: Optional[int] = 80000
    soil_deal_type: Optional[str] = "sell"

    class Config:
        from_attributes = True


class DropOffCreateResponse(BaseModel):
    message: str
    drop_off: DropOffResponse


class DropOffUpdate(BaseModel):
    name: Optional[str] = Field(None, description="하차지명")
    address: Optional[str] = Field(None, description="주소")
    latitude: Optional[float] = Field(None, description="위도")
    longitude: Optional[float] = Field(None, description="경도")
    radius_meter: Optional[float] = Field(None, description="도착 감지 반경")
    permit_number: Optional[str] = Field(None, description="인허가번호")
    status: Optional[str] = Field(None, description="상태 (ACTIVE, PAUSED 등)")
    capacity: Optional[int] = Field(None, description="허용 용량")
    soil_deal_type: Optional[str] = Field(None, description="토사 거래 방식 구분")


class SiteUpdate(BaseModel):
    """
    상차지 수정용 Pydantic 스키마
    """
    company_name: Optional[str] = Field(None, description="건설사/상호명")
    business_number: Optional[str] = Field(None, description="사업자등록번호")
    site_address: Optional[str] = Field(None, description="상차지 주소")
    latitude: Optional[float] = Field(None, description="위도")
    longitude: Optional[float] = Field(None, description="경도")
    geofencing_radius: Optional[float] = Field(None, description="지오펜싱 반경")

