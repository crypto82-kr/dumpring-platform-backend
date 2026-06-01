from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.owner import router as owner_router
from app.api.site_mgmt import router as site_router
from app.api.fleet import router as fleet_router
from app.api.locations import router as locations_router
from app.api.drop_offs import router as drop_offs_router
from app.api.jobs import router as jobs_router
from app.api.common_codes import router as common_codes_router
from app.api.dispatch import router as dispatch_router
from app.models import Base, CommonCode
from app.core.db import engine, SessionLocal
from sqlalchemy.future import select

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dumpring")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="덤프 트럭 중계 및 실시간 택시미터기 플랫폼 '덤프링' 백엔드 API",
)

@app.on_event("startup")
async def startup_event():
    logger.info("덤프링 플랫폼 백엔드 구동 시동 및 테이블 생성...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    logger.info("덤프 기사 및 차주 필수 서류 마스터 공통코드 시딩(Seeding)...")
    async with SessionLocal() as db:
        required_codes = [
            # 기사 필수서류
            {"group_code": "REQUIRED_DOC_DRIVER", "code": "LICENSE", "code_name": "운전면허증 (대형/1종)", "display_order": 1},
            {"group_code": "REQUIRED_DOC_DRIVER", "code": "QUALIFICATION", "code_name": "화물운송종사 자격증", "display_order": 2},
            {"group_code": "REQUIRED_DOC_DRIVER", "code": "BANKBOOK", "code_name": "은행 통장 사본 (기사 본인 명의)", "display_order": 3},
            # 차주 필수서류
            {"group_code": "REQUIRED_DOC_OWNER", "code": "BIZ_LICENSE", "code_name": "사업자등록증", "display_order": 1},
            {"group_code": "REQUIRED_DOC_OWNER", "code": "BANKBOOK", "code_name": "은행 통장 사본 (차주 본인 명의)", "display_order": 2},
        ]
        for rc in required_codes:
            query = select(CommonCode).where(
                CommonCode.group_code == rc["group_code"],
                CommonCode.code == rc["code"]
            )
            res = await db.execute(query)
            existing = res.scalars().first()
            if not existing:
                new_code = CommonCode(
                    group_code=rc["group_code"],
                    code=rc["code"],
                    code_name=rc["code_name"],
                    display_order=rc["display_order"],
                    is_active=True
                )
                db.add(new_code)
        await db.commit()
    logger.info("마스터 공통코드 동적 설정 시딩 완료.")

# 라우터 등록
app.include_router(auth_router, prefix="/api/auth", tags=["인증/회원가입"])
app.include_router(owner_router, prefix="/api/owner", tags=["차주 전용 관리"])
app.include_router(site_router, prefix="/api/sites", tags=["현장 관리 및 매핑"])
app.include_router(fleet_router, prefix="/api/fleet", tags=["차량 및 기사 관리"])
app.include_router(locations_router, prefix="/api", tags=["상하차지 마스터 관리"])
app.include_router(drop_offs_router, prefix="/api/drop-offs", tags=["하차지 마스터 관리"])
app.include_router(jobs_router, prefix="/api", tags=["상하차지 B2B 매칭"])
app.include_router(common_codes_router, prefix="/api/common-codes", tags=["공통 코드 마스터"])
app.include_router(dispatch_router, prefix="/api/dispatch", tags=["실시간 배차 및 운행 관제"])



# CORS 설정

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실무에서는 환경변수나 설정을 통해 제어 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
def read_root():
    """
    덤프링 백엔드 루트 엔드포인트 (모바일 시뮬레이터 웹 렌더링)
    """
    template_path = os.path.join(os.path.dirname(__file__), "templates", "simulator.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    return """
    <html>
        <body>
            <h1>덤프링 백엔드</h1>
            <p>시뮬레이터 템플릿 파일을 찾을 수 없습니다.</p>
        </body>
    </html>
    """

# 실시간 택시미터기 스트리밍 테스트를 위한 WebSocket 엔드포인트 예시
class MeterConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"새로운 미터기 클라이언트가 연결되었습니다. 현재 연결 수: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"미터기 클라이언트의 연결이 해제되었습니다. 현재 연결 수: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = MeterConnectionManager()

@app.websocket("/ws/meter/{taxi_id}")
async def websocket_endpoint(websocket: WebSocket, taxi_id: str):
    """
    실시간 택시미터기 위치 및 요금 데이터를 송수신하기 위한 WebSocket 엔드포인트
    """
    await manager.connect(websocket)
    try:
        # 연결 직후 초기화 메시지 전송
        await websocket.send_json({
            "event": "connected",
            "taxi_id": taxi_id,
            "message": f"택시 {taxi_id}번 실시간 미터기 스트리밍 세션이 시작되었습니다."
        })
        
        while True:
            # 클라이언트로부터 실시간 데이터 수신 (위도, 경도, 속도, 현재요금 등)
            data = await websocket.receive_json()
            logger.info(f"택시[{taxi_id}] 수신 데이터: {data}")
            
            # 실시간 가공 후 에코 또는 관제 클라이언트 브로드캐스트용 샘플 응답
            response_data = {
                "event": "meter_update",
                "taxi_id": taxi_id,
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
                "speed": data.get("speed", 0),
                "fare": data.get("fare", 0),
                "status": "driving"
            }
            # 현재 연결된 세션에 수신 확인 에코 전송
            await websocket.send_json(response_data)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # 끊김 알림 브로드캐스트 등 추가 비즈니스 로직 작성 가능
    except Exception as e:
        logger.error(f"WebSocket 에러 발생 ({taxi_id}): {str(e)}")
        manager.disconnect(websocket)
