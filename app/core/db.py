from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator
import logging

from app.core.config import settings

logger = logging.getLogger("dumpring.db")

# 데이터베이스 접속 URL이 정의되어 있지 않은 경우 처리
if not settings.DATABASE_URL:
    raise ValueError("데이터베이스 연결 설정(DATABASE_URL)이 누락되었습니다. .env 파일을 확인해 주세요.")

# 실무 레벨의 안전한 비동기 데이터베이스 엔진 구성 (커넥션 풀 세부 옵션 적용)
engine = create_async_engine(
    settings.DATABASE_URL,
    # 커넥션 풀 튜닝 설정
    pool_size=20,          # 풀에 유지할 영구적인 커넥션 수
    max_overflow=10,       # 풀 크기를 초과하여 생성할 수 있는 임시 커넥션 한도
    pool_recycle=3600,     # 1시간(3600초)이 지난 유휴 커넥션은 폐기 후 재연결 (Supabase 타임아웃 방지)
    pool_pre_ping=True,    # 커넥션 사용 전 'ping'을 날려 유효성을 자동 검사 (유휴/끊김 커넥션 에러 사전 예방)
    echo=False,            # SQL 로그 출력 여부 (상용 배포 시 False)
)

# 비동기 세션을 일관되게 만들어내는 팩토리 함수 생성
# expire_on_commit=False는 커밋 시점 이후 객체의 상태 데이터를 로컬 메모리상에 유지하도록 보장함
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI 의존성 주입(Depends)용 공통 비동기 DB 세션 제너레이터 함수입니다.
    요청(Request) 진입 시 세션을 개설하고, 요청 처리가 완수 또는 예외 발생 종료 시 자동으로 닫아 자원을 회수합니다.
    """
    async with SessionLocal() as session:
        try:
            yield session
            # 모든 작업 성공적으로 진행 시 세션 변경 사항을 flush하여 무결성 유지 (커밋은 개별 API 레벨에서 제어)
        except Exception as e:
            logger.error(f"데이터베이스 트랜잭션 오류 발생: {str(e)}")
            await session.rollback()
            raise e
        finally:
            await session.close()
