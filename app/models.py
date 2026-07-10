import enum
import sqlalchemy as sa
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, text, Enum
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
    is_site_worker = Column(Boolean, default=False, nullable=False)   # 현장담당자 권한
    is_owner = Column(Boolean, default=False, nullable=False)         # 차주 권한
    is_driver = Column(Boolean, default=False, nullable=False)        # 운전기사 권한
    is_drop_off = Column(Boolean, default=False, nullable=False)      # 하차지 지주 권한
    is_admin = Column(Boolean, default=False, nullable=False)         # 시스템 총괄 관리자 권한

    # 가입 심사 승인 여부 (차주 및 공통)
    is_approved = Column(Boolean, default=False, nullable=False)
    reject_reason = Column(String, nullable=True)

    # 생성 및 수정일시
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    construction_sites = relationship("ConstructionSite", back_populates="creator")
    site_employees = relationship("SiteEmployee", back_populates="user")
    unloading_sites = relationship("UnloadingSite", back_populates="owner")
    drivers = relationship("Driver", back_populates="user")
    owned_cars = relationship("Car", back_populates="owner")
    site_profile = relationship("SiteProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    drop_off_profile = relationship("DropOffProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    site_mappings = relationship("SiteUserMapping", back_populates="user", cascade="all, delete-orphan")
    drop_offs = relationship("DropOff", back_populates="owner", cascade="all, delete-orphan")


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
    site_key = Column(String, unique=True, nullable=True, index=True)  # 현장 구분용 고유 키 (예: SITE-A1B2C3)
    site_address = Column(String, nullable=True)  # 현장 지번/도로명 주소
    latitude = Column(Float, nullable=True)  # 현장 위도
    longitude = Column(Float, nullable=True)  # 현장 경도
    geofencing_radius = Column(Float, default=200.0, nullable=False)  # 지오펜싱 반경 (미터 단위)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="construction_sites")
    employees = relationship("SiteEmployee", back_populates="site", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="site")
    site_mappings = relationship("SiteUserMapping", back_populates="site", cascade="all, delete-orphan")


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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)  # 기사 가입 완료 시 연동
    current_car_id = Column(Integer, ForeignKey("cars.id", ondelete="SET NULL"), nullable=True)  # 배정 차량
    registered_phone = Column(String, nullable=False, index=True)  # 차주가 선등록한 기사 휴대폰 번호
    is_approved = Column(Boolean, default=False, nullable=False)  # 차주 소속 기사 승인 여부 (본사/차주 승인 단계)
    reject_reason = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="drivers")
    assigned_car = relationship("Car", back_populates="drivers")


class UserUploadedDocument(Base):
    """
    유저가 업로드한 필수 서류 동적 보관 테이블
    """
    __tablename__ = "user_uploaded_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_code = Column(String, nullable=False, index=True)  # CommonCode의 code 연동 (예: 'LICENSE', 'BIZ_LICENSE')
    file_name = Column(String, nullable=False)  # 업로드된 파일명 또는 URL 경로
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User")


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


class SiteProfile(Base):
    """
    8. SiteProfile (현장 상세 프로필 테이블)
    - 현장관리자/현장담당자 가입 시 등록되는 회사 및 현장 실무 세부 정보입니다.
    """
    __tablename__ = "site_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String, nullable=False)  # 건설사/상호명
    site_name = Column(String, nullable=False)  # 현장명
    business_number = Column(String, nullable=False)  # 사업자등록번호

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="site_profile")


class DropOffProfile(Base):
    """
    9. DropOffProfile (하차지 상세 프로필 테이블)
    - 하차지 지주 가입 시 등록되는 허가 및 입지 세부 정보입니다.
    """
    __tablename__ = "drop_off_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    location_name = Column(String, nullable=False)  # 하차지/사토장 명칭
    address = Column(String, nullable=False)  # 하차지 상세 주소
    permit_number = Column(String, nullable=False)  # 개발행위/토사 반입 허가증 번호
    capacity = Column(Integer, default=80000, nullable=True)  # 허용 매립 용량 (㎥)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="drop_off_profile")


class SiteUserStatus(str, enum.Enum):
    PENDING = "PENDING"             # 승인 대기
    APPROVED = "APPROVED"           # 승인 완료
    REJECTED = "REJECTED"           # 거절됨


class SiteUserMapping(Base):
    """
    10. SiteUserMapping (현장과 유저 간의 다대다 연결 매핑 테이블)
    """
    __tablename__ = "site_user_mappings"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(SiteUserStatus), default=SiteUserStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    site = relationship("ConstructionSite", back_populates="site_mappings")
    user = relationship("User", back_populates="site_mappings")


class MaterialType(str, enum.Enum):
    GOOD_SOIL = "GOOD_SOIL"    # 양질토
    MUD_SOIL = "MUD_SOIL"      # 뻘흙
    ROCK = "ROCK"              # 암버럭
    MIXED = "MIXED"            # 혼합


class TruckType(str, enum.Enum):
    T_15 = "T_15"              # 15톤
    T_25 = "T_25"              # 25톤
    T_27 = "T_27"              # 27톤


class PayerType(str, enum.Enum):
    SITE_PAYS = "SITE_PAYS"          # 현장 지불
    DROP_OFF_PAYS = "DROP_OFF_PAYS"  # 하차지 지불
    FREE = "FREE"                    # 무상


class PaymentMethod(str, enum.Enum):
    MONTHLY = "MONTHLY"        # 월대
    DAILY = "DAILY"            # 당일지급


class CommonCode(Base):
    """
    12. CommonCode (공공 마스터 공통 코드 테이블)
    - 토사 종류, 차량 규격, 정산 방식 등 비즈니스 환경에 따라 자주 바뀌는 코드 정보를 동적으로 관리합니다.
    """
    __tablename__ = "common_codes"
    __table_args__ = (
        sa.UniqueConstraint('group_code', 'code', name='_group_code_code_uc'),
    )

    id = Column(Integer, primary_key=True, index=True)
    group_code = Column(String, nullable=False, index=True)  # 예: 'MATERIAL_TYPE', 'TRUCK_TYPE'
    code = Column(String, nullable=False, index=True)        # 예: 'GOOD_SOIL', 'T_25'
    code_name = Column(String, nullable=False)               # 한글/영어 표시 명칭 (예: '양질토', '25톤')
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class DropOff(Base):
    """
    13. DropOff (하차지 마스터 데이터 테이블)
    """
    __tablename__ = "drop_offs"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 하차지 개설자 (지주)
    name = Column(String, nullable=False)  # 하차지명
    address = Column(String, nullable=False)  # 주소
    latitude = Column(Float, nullable=False)  # 위도
    longitude = Column(Float, nullable=False)  # 경도
    radius_meter = Column(Float, default=200.0, nullable=False)  # 도착 감지 반경
    permit_number = Column(String, nullable=False)  # 인허가번호
    status = Column(String, default="ACTIVE", nullable=False)  # 상태 (기본 'ACTIVE')
    capacity = Column(Integer, default=80000, nullable=True)  # 허용 매립 용량 (㎥)
    soil_deal_type = Column(String, default="sell", nullable=False)  # 토사 거래 방식 구분 ('sell', 'buy', 'free')

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="drop_offs")
    requests = relationship("DropOffRequest", back_populates="drop_off", cascade="all, delete-orphan")


class DropOffRequest(Base):
    """
    14. DropOffRequest (하차지 매립 수용 공고 테이블)
    - 하이브리드 공통 코드 설계를 도입하여, material_type, truck_type 등의 필드를 
      동적인 마스터 코드 테이블과 실시간 검증(Validation) 연동시킵니다.
    """
    __tablename__ = "drop_off_requests"

    id = Column(Integer, primary_key=True, index=True)
    drop_off_id = Column(Integer, ForeignKey("drop_offs.id", ondelete="CASCADE"), nullable=False)
    
    # 화물 및 차량 (하이브리드 공통 코드 검증이 적용되는 문자열 필드)
    material_type = Column(String, nullable=False)
    truck_type = Column(String, nullable=False)
    
    # 수량 트래킹
    target_quantity = Column(Integer, nullable=False)  # 목표 대수
    current_quantity = Column(Integer, default=0, nullable=False)  # 현재 매칭 대수
    
    # 정산 및 비용
    payer_type = Column(String, nullable=False)
    payment_method = Column(String, nullable=False)
    unit_price = Column(Integer, nullable=False)  # 수용 단가 (원)
    
    # 환경 조건
    has_washing_facility = Column(Boolean, default=False, nullable=False)  # 세륜기 유무
    night_work_allowed = Column(Boolean, default=False, nullable=False)    # 야간 작업 가능
    rain_work_allowed = Column(Boolean, default=False, nullable=False)     # 우천 작업 가능
    
    # 유효 기간
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(String, default="OPEN", nullable=False)  # 'OPEN' 또는 'CLOSED'

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    drop_off = relationship("DropOff", back_populates="requests")
    job_posts = relationship("JobPost", back_populates="drop_off_request", cascade="all, delete-orphan")


class JobPost(Base):
    """
    13. JobPost (현장 덤프 모집 오더 테이블)
    - 상하차지 B2B 양방향 매칭 구조를 지원합니다.
    
    [흐름 A - 하차지 먼저 (기존)]
    현장관리자가 하차지의 특정 수용 공고(drop_off_request_id)를 지정하여 매칭 요청 → WAITING_APPROVAL → 하차지 승인 → OPEN
    
    [흐름 B - 상차지 먼저 (신규)]
    현장관리자가 하차지 없이 모집 공고를 먼저 등록 → WAITING_MATCH → 하차지가 매칭 요청 → 상차지 승인 → OPEN
    
    [오더 상태값]
    - WAITING_MATCH: 하차지 매칭 대기 (상차지 먼저 등록 시)
    - WAITING_APPROVAL: 하차지 승인 대기 (하차지 먼저 등록 시)  
    - OPEN: 기사 모집 중
    - COMPLETED: 완료
    - CANCELLED: 취소
    """
    __tablename__ = "job_posts"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)
    drop_off_request_id = Column(Integer, ForeignKey("drop_off_requests.id", ondelete="RESTRICT"), nullable=True)  # 흐름 B에서는 매칭 전까지 NULL
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # 상차지 먼저 올릴 때 사용하는 필드 (흐름 B 전용)
    material_type = Column(String, nullable=True)         # 토사 종류 (예: GOOD_SOIL, ROCK)
    truck_type = Column(String, nullable=True)            # 차량 규격 (예: T_15, T_25)
    offered_unit_price = Column(Integer, nullable=True)   # 상차지 제시 단가 (원)
    payer_type = Column(String, nullable=True)            # 비용 지급 주체 (예: SITE_PAYS, FREE)
    memo = Column(String, nullable=True)                  # 상차지 메모/특이사항
    
    # 매칭된 하차지 정보 (흐름 B에서 매칭 시 기록)
    matched_drop_off_id = Column(Integer, ForeignKey("drop_offs.id", ondelete="SET NULL"), nullable=True)
    
    work_date = Column(DateTime(timezone=True), nullable=False)  # 작업 희망 날짜
    required_trucks = Column(Integer, nullable=False)  # 필요한 덤프 대수
    status = Column(String, default="WAITING_APPROVAL", nullable=False)  # 상태값

    distance = Column(Float, nullable=True)               # 예상 거리 (km)
    estimated_time = Column(Integer, nullable=True)       # 예상 소요 시간 (분)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    site = relationship("ConstructionSite")
    drop_off_request = relationship("DropOffRequest", back_populates="job_posts")
    author = relationship("User")
    matched_drop_off = relationship("DropOff")


class DriverFavoriteRegion(Base):
    """
    기사별 즐겨찾는 배차 구역 설정 테이블
    """
    __tablename__ = "driver_favorite_regions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sido = Column(String, nullable=False, index=True)
    sigungu = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        sa.UniqueConstraint('user_id', 'sido', 'sigungu', name='_user_favorite_region_uc'),
    )


class DispatchTicket(Base):
    """
    기사 개별 운행 매칭 및 GPS 미터 정산 티켓
    """
    __tablename__ = "dispatch_tickets"

    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey("job_posts.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    car_id = Column(Integer, ForeignKey("cars.id", ondelete="RESTRICT"), nullable=False)

    # 상태값: 'ACCEPTED'(수락/상차지이동), 'ARRIVED_LOADING'(상차지도착/대기), 'LOADING_APPROVED'(상차승인완료), 'DRIVING'(운행중/미터기온), 'ARRIVED'(도착), 'APPROVED'(승인완료), 'REJECTED'(반려/회차), 'CANCELLED'(취소), 'WAITING_ABSENT_APPROVAL'(지주부재 승인대기)
    status = Column(String, default="ACCEPTED", nullable=False)
    loading_approval_type = Column(String, nullable=True)  # 상차 승인 방식 ('QR' 또는 'OFFICE')
    proof_photo = Column(String, nullable=True)  # 지주 부재 시 실시간 현장 증빙 사진 URL

    accumulated_fare = Column(Integer, default=0, nullable=False)
    drive_distance_km = Column(Float, default=0.0, nullable=False)
    drive_time_seconds = Column(Integer, default=0, nullable=False)

    accepted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    driving_started_at = Column(DateTime(timezone=True), nullable=True)
    arrived_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    job_post = relationship("JobPost")




class SduiTheme(Base):
    """
    앱 전체 테마 설정 테이블
    - 관리자가 앱의 색상/폰트 등 테마를 DB에서 관리
    - is_active=True인 테마가 앱에 실시간 적용
    """
    __tablename__ = "sdui_themes"

    id = Column(Integer, primary_key=True, index=True)
    theme_key = Column(String, unique=True, nullable=False, index=True)  # 'dark_gold', 'ocean_blue' 등
    name = Column(String, nullable=False)
    primary_color = Column(String, nullable=False)      # '0xFFFFD700'
    secondary_color = Column(String, nullable=False)
    background_color = Column(String, nullable=False)
    surface_color = Column(String, nullable=False)
    text_color = Column(String, nullable=False)
    accent_color = Column(String, nullable=True)
    font_family = Column(String, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

