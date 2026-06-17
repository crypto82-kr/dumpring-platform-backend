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
    current_user: User = Depends(get_current_user)
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
    
    # 저장 경로
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "uploads", category))
    os.makedirs(base_dir, exist_ok=True)
    
    file_path = os.path.join(base_dir, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"파일 저장 중 에러가 발생했습니다: {str(e)}"
        )
        
    static_url = f"/static/uploads/{category}/{filename}"
    return {"url": static_url}
