import os
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.core.config import settings
from app.core.security import ALGORITHM
from app.core.storage import upload_to_supabase, delete_from_supabase
from app.core.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("dumpring.files")
router = APIRouter()
security = HTTPBearer(auto_error=False)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


@router.post("/upload", summary="공통 통합 파일 업로드 API")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form("documents"),  # 'documents', 'proofs', 'photos', 'others'
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    모든 도메인(차량 등록 서류, 회원가입 서류, 현장 서류 등)에서 공통으로 호출하는 단일 파일 업로드 엔드포인트입니다.
    - 지원 확장자: JPG, JPEG, PNG, GIF, WEBP, PDF
    - 최대 크기: 15MB
    """
    if category not in ["documents", "proofs", "photos", "others"]:
        category = "documents"
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 파일 형식입니다. ({', '.join(ALLOWED_EXTENSIONS)}) 형식만 업로드 가능합니다."
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 용량이 15MB를 초과했습니다. 15MB 이하의 파일만 업로드 가능합니다."
        )

    # 고유 파일 식별 키 생성
    storage_file_key = f"{uuid.uuid4().hex}{file_ext}"

    try:
        await upload_to_supabase(
            content=contents,
            content_type=file.content_type or "application/octet-stream",
            category=category,
            filename=storage_file_key
        )
    except Exception as e:
        logger.error(f"스토리지 업로드 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"스토리지 파일 저장 중 에러가 발생했습니다: {str(e)}"
        )

    file_url = f"/api/files/stream/{storage_file_key}?category={category}"
    return {
        "message": "파일이 성공적으로 업로드되었습니다.",
        "file_name": storage_file_key,
        "original_name": file.filename,
        "file_url": file_url
    }


@router.delete("/{filename}", summary="공통 통합 물리 파일 삭제 API")
async def delete_file(
    filename: str,
    category: str = "documents",
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    스토리지(Supabase 및 로컬)에서 특정 물리 파일을 완전히 삭제합니다.
    """
    if not filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="삭제할 파일명이 필요합니다.")

    # 경로 조작(Directory Traversal) 방지
    clean_filename = os.path.basename(filename)

    try:
        await delete_from_supabase(category=category, filename=clean_filename)
        logger.info(f"물리 파일 삭제 성공: {category}/{clean_filename}")
        return {"message": "물리 파일이 성공적으로 삭제되었습니다.", "file_name": clean_filename}
    except Exception as e:
        logger.warning(f"물리 파일 삭제 실패 또는 파일 없음: {e}")
        return {"message": "파일 삭제 완료 (기존 파일 없음 또는 삭제됨)", "file_name": clean_filename}


@router.get("/stream/{filename}", summary="공통 보안 파일 실시간 스트리밍 / 미리보기")
async def stream_file(
    filename: str,
    category: str = "documents",
):
    """
    스토리지에 저장된 실물 파일을 브라우저 미리보기 / 다운로드할 수 있도록 스트리밍합니다.
    """
    clean_filename = os.path.basename(filename)
    file_ext = os.path.splitext(clean_filename)[1].lower()

    # Content-Type 결정
    content_type = "application/octet-stream"
    if file_ext in [".jpg", ".jpeg"]:
        content_type = "image/jpeg"
    elif file_ext == ".png":
        content_type = "image/png"
    elif file_ext == ".webp":
        content_type = "image/webp"
    elif file_ext == ".pdf":
        content_type = "application/pdf"

    # 1. Supabase Storage 스트리밍 시도
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            import httpx
            supabase_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET_NAME}/upload/{category}/{clean_filename}"
            headers = {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"}
            client = httpx.AsyncClient(timeout=30.0)
            req = client.build_request("GET", supabase_url, headers=headers)
            resp = await client.send(req, stream=True)

            if resp.status_code == 200:
                async def file_iterator():
                    try:
                        async for chunk in resp.aiter_bytes():
                            yield chunk
                    finally:
                        await resp.aclose()

                return StreamingResponse(
                    file_iterator(),
                    media_type=content_type,
                    headers={
                        "Content-Disposition": f"inline; filename={clean_filename}",
                        "Cache-Control": "public, max-age=3600"
                    }
                )
        except Exception as e:
            logger.warning(f"Supabase 스트리밍 실패, 로컬 폴백: {e}")

    # 2. 로컬 스토리지 폴백
    local_path = os.path.join(settings.UPLOAD_DIR, category, clean_filename)
    if os.path.exists(local_path):
        return FileResponse(
            local_path,
            media_type=content_type,
            filename=clean_filename,
            headers={"Content-Disposition": f"inline; filename={clean_filename}"}
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="요청한 서류 파일을 찾을 수 없습니다.")

