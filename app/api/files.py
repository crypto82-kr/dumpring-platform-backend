import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from app.api.auth import get_current_user
from app.models import User

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}

@router.post("/upload", summary="통합 파일 업로드 API")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form(...),  # e.g., 'documents', 'proofs'
    # current_user: User = Depends(get_current_user)  # 로컬 테스트를 위해 인증 임시 우회
):
    if category not in ["documents", "proofs"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="올바르지 않은 카테고리입니다. (documents 또는 proofs만 가능)"
        )
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 파일 형식입니다. {ALLOWED_EXTENSIONS} 형식만 업로드 가능합니다."
        )

    # 고유 파일명 생성
    filename = f"{uuid.uuid4().hex}{file_ext}"
    
    # 3. Supabase 업로드 진행
    try:
        contents = await file.read()
        from app.core.storage import upload_to_supabase
        await upload_to_supabase(
            content=contents,
            content_type=file.content_type or "application/octet-stream",
            category=category,
            filename=filename
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase 스토리지 파일 저장 중 에러가 발생했습니다: {str(e)}"
        )
        
    static_url = f"/static/uploads/{category}/{filename}"
    return {"url": static_url}
