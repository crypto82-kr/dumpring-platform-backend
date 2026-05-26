from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.owner import router as owner_router

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dumpring")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="덤프 트럭 중계 및 실시간 택시미터기 플랫폼 '덤프링' 백엔드 API",
)

# 라우터 등록
app.include_router(auth_router, prefix="/api/auth", tags=["인증/회원가입"])
app.include_router(owner_router, prefix="/api/owner", tags=["차주 전용 관리"])


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
