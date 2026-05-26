from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    """
    1. User (통합 계정 테이블)
    - 하나의 계정이 본인인증(ci)을 거쳐 여러 역할 권한을 토글로 가질 수 있는 유연한 통합 계정 구조입니다.
    - 예를 들어, 차주 사장님이 직접 운전도 하는 경우 is_owner=True 및 is_driver=True를 동시에 가집니다.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    ci = Column(String, unique=True, nullable=True, index=True)  # 본인인증 고유 키 (관리자는 제외 가능하도록 Nullable)
    phone_number = Column(String, unique=True, nullable=False, index=True)  # 로그인 ID (휴대폰 번호)
    password = Column(String, nullable=False)  # 암호화된 비밀번호
    name = Column(String, nullable=False)  # 실명 또는 담당자명
    
    # 통합 계정 역할 권한 토글 (다중 선택 가능)
    is_site_manager = Column(Boolean, default=False, nullable=False)  # 공사현장 관리자 권한
    is_owner = Column(Boolean, default=False, nullable=False)         # 차주 권한
    is_driver = Column(Boolean, default=False, nullable=False)        # 운전기사 권한
    is_admin = Column(Boolean, default=False, nullable=False)         # 시스템 총괄 관리자 권한

    # 생성 및 수정일시
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    construction_sites = relationship("ConstructionSite", back_populates="creator")
    site_employees = relationship("SiteEmployee", back_populates="user")
    unloading_sites = relationship("UnloadingSite", back_populates="owner")
    drivers = relationship("Driver", back_populates="user")
    owned_cars = relationship("Car", back_populates="owner")


class ConstructionSite(Base):
    """
    2. ConstructionSite (공사현장 기본정보 테이블)
    - 본사/업체 기준의 마스터 정보를 관리하며, 공사현장을 개설한 마스터 관리자(소장/경리) 계정과 연동됩니다.
    """
    __tablename__ = "construction_sites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 현장을 개설한 마스터 관리자
    company_name = Column(String, nullable=False)  # 건설사/상호명 (예: 현대건설)
    business_number = Column(String, nullable=False)  # 사업자등록번호 (세금계산서 발행용)
    billing_email = Column(String, nullable=False)  # 세금계산서용 이메일
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="construction_sites")
    employees = relationship("SiteEmployee", back_populates="site", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="site")


class SiteEmployee(Base):
    """
    3. SiteEmployee (현장 소속 직원 테이블)
    - 공사현장에 소속되어 현장 입출입을 통제하거나 도장을 찍는 직원 정보입니다.
    - 소장님이 번호로 선등록해 둔 상태(user_id=Null)에서, 직원이 실제 본인인증 가입을 완료하면 연동되는 매칭 구조를 지원합니다.
    """
    __tablename__ = "site_employees"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)  # 소속 현장
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # 가입 완료 시 연동되는 통합 계정
    registered_phone = Column(String, nullable=False, index=True)  # 소장님이 선등록해 둔 휴대폰 번호
    employee_role = Column(String, default="staff", nullable=False)  # 'admin'(본사 관리자) 또는 'staff'(현장 통제/도장 직원)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    site = relationship("ConstructionSite", back_populates="employees")
    user = relationship("User", back_populates="site_employees")


class UnloadingSite(Base):
    """
    4. UnloadingSite (하차지 지주/사토장 테이블)
    - 땅 주인이 직접 등록하는 사토장 정보입니다. 
    - 수용 가능한 토사 종류(preferred_soil_types)를 가집니다.
    """
    __tablename__ = "unloading_sites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 땅 등록 지주 계정
    site_name = Column(String, nullable=False)  # 사토장/하차지 이름
    owner_name = Column(String, nullable=False)  # 땅 주인 실성명
    preferred_soil_types = Column(String, nullable=False)  # 수용 가능 토종 (예: 'NORMAL,ROCK', 콤마 구분자 문자열 저장 권장)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="unloading_sites")
    orders = relationship("Order", back_populates="unloading_site")


class Car(Base):
    """
    5. Car (차량 테이블)
    - 차주 소유의 덤프 트럭 기본 정보입니다.
    """
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 소유 차주 사장님
    car_number = Column(String, unique=True, nullable=False, index=True)  # 차량 번호 (예: 경기80사1234)
    tonnage = Column(Float, nullable=False)  # 덤프 톤수 (15.0, 24.0, 25.5 등)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_cars")
    drivers = relationship("Driver", back_populates="assigned_car")


class Driver(Base):
    """
    6. Driver (기사 테이블)
    - 차주가 폰 번호로 기사를 선등록(user_id=Null)한 뒤, 기사가 가입 완료 시 연동되는 유연한 1:1 매칭을 지원합니다.
    - 배정받은 차량(current_car_id) 및 본사 관리자 최종 승인 여부(is_approved)를 관리합니다.
    """
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # 기사 가입 완료 시 연동
    current_car_id = Column(Integer, ForeignKey("cars.id", ondelete="SET NULL"), nullable=True)  # 배정 차량
    registered_phone = Column(String, nullable=False, index=True)  # 차주가 선등록한 기사 휴대폰 번호
    is_approved = Column(Boolean, default=False, nullable=False)  # 차주 소속 기사 승인 여부 (본사/차주 승인 단계)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="drivers")
    assigned_car = relationship("Car", back_populates="drivers")


class Order(Base):
    """
    7. Order (기사 모집글 테이블 - 핵심 🚨)
    - 상차지(공사현장)와 하차지(지주/사토장)를 중계하고 기사를 모집하는 핵심 오더 테이블입니다.
    - 덤프 트럭 기사 모집 글은 실시간 현장 변수를 수용하기 위해 등록 시 아래 오더 승인 매커니즘을 준수합니다.
    
    [오더 승인 매커니즘]
    - 초기 상태는 무조건 'PENDING_APPROVAL'(하차지 승인 대기)입니다.
    - 하차지 지주가 토종별 사토 가능 여부를 확인 및 승인한 뒤에만 'RECRUITING'(모집중) 상태로 변경할 수 있습니다.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)  # 발주 공사현장
    unloading_site_id = Column(Integer, ForeignKey("unloading_sites.id", ondelete="RESTRICT"), nullable=False)  # 선택한 사토장(하차지 지주)
    
    # 상차지 정보
    loading_address = Column(String, nullable=False)  # 상차지 주소/명칭
    loading_lat = Column(Float, nullable=False)  # 상차지 위도 GPS
    loading_lng = Column(Float, nullable=False)  # 상차지 경도 GPS
    
    # 하차지 정보
    unloading_address = Column(String, nullable=False)  # 하차지 주소
    unloading_lat = Column(Float, nullable=False)  # 하차지 위도 GPS
    unloading_lng = Column(Float, nullable=False)  # 하차지 경도 GPS
    
    # 오더 모집 정보
    soil_type = Column(String, nullable=False)  # 사토 종류 (NORMAL, ROCK, MUD, MIXED)
    required_tonnage = Column(Float, nullable=False)  # 필요한 차량 톤수
    truck_count = Column(Integer, nullable=False)  # 모집 대수
    
    # 오더 상태 제어
    # 상태 종류: 'PENDING_APPROVAL'(하차지 승인 대기), 'RECRUITING'(모집중), 'ACTIVE'(주행/배차중), 'COMPLETED'(완료), 'CANCELLED'(취소)
    status = Column(String, default="PENDING_APPROVAL", nullable=False)  # 초기값 고정

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    site = relationship("ConstructionSite", back_populates="orders")
    unloading_site = relationship("UnloadingSite", back_populates="orders")
