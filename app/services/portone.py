import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("dumpring.portone")

class PortOneService:
    def __init__(self):
        self.api_secret = settings.PORTONE_API_SECRET
        self.base_url = settings.PORTONE_API_BASE_URL.rstrip("/")

    async def get_identity_verification(self, identity_verification_id: str) -> Dict[str, Any]:
        """
        포트원 V2 REST API를 호출하여 본인인증 결과를 단건 조회합니다.
        GET https://api.portone.io/identity-verifications/{identityVerificationId}
        Header: Authorization: PortOne {PORTONE_API_SECRET}
        """
        # 테스트/MOCK 모드 처리 (아이디가 mock_ 또는 test_ 로 시작하는 경우)
        if identity_verification_id.startswith("mock_") or identity_verification_id.startswith("test_"):
            logger.info(f"[PortOne Mock] 테스트 본인인증 식별자 감지: {identity_verification_id}")
            suffix = "".join([c for c in identity_verification_id if c.isdigit()])
            if len(suffix) < 8:
                suffix = (suffix + "12345678")[:8]
            else:
                suffix = suffix[-8:]
            return {
                "status": "VERIFIED",
                "ci": f"MOCK_CI_{identity_verification_id}",
                "name": "테스트사용자",
                "phone_number": f"010{suffix}",
                "raw": {"status": "VERIFIED", "mock": True}
            }

        if not self.api_secret:
            logger.error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.")
            raise ValueError("포트원 연동 설정(API Secret)이 누락되었습니다.")

        url = f"{self.base_url}/identity-verifications/{identity_verification_id}"
        headers = {
            "Authorization": f"PortOne {self.api_secret}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, headers=headers)
            except Exception as e:
                logger.error(f"포트원 API 통신 에러: {str(e)}")
                raise RuntimeError(f"포트원 서버와 통신할 수 없습니다: {str(e)}")

        if response.status_code != 200:
            logger.error(f"포트원 인증 조회 실패 (HTTP {response.status_code}): {response.text}")
            raise ValueError(f"본인인증 내역을 조회할 수 없습니다. (응답코드: {response.status_code})")

        data = response.json()
        logger.info(f"포트원 인증 결과 수신: status={data.get('status')}")

        status = data.get("status")
        if status != "VERIFIED":
            raise ValueError(f"본인인증이 완료되지 않았습니다. (현재 상태: {status})")

        # PortOne V2 응답 구조 파싱 (verifiedCustomer 또는 identity 또는 customer 지원)
        customer = data.get("verifiedCustomer") or data.get("identity") or data.get("customer") or {}
        
        ci = customer.get("ci") or data.get("ci")
        name = customer.get("name") or data.get("name")
        phone = customer.get("phoneNumber") or customer.get("phone") or data.get("phoneNumber") or data.get("phone")

        if not ci:
            logger.error(f"포트원 응답에 CI(연계정보)가 누락되었습니다: {data}")
            raise ValueError("본인인증 결과에서 CI(연계정보)를 확인할 수 없습니다.")

        return {
            "status": "VERIFIED",
            "ci": str(ci),
            "name": str(name) if name else "",
            "phone_number": str(phone) if phone else "",
            "raw": data
        }

portone_service = PortOneService()
