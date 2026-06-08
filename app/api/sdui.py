"""
SDUI (Server-Driven UI) REST API 라우터
- 테마: 앱 전역 색상/폰트 설정 CRUD
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update

from app.core.db import get_db
from app.models import SduiTheme

logger = logging.getLogger("dumpring.sdui")
router = APIRouter()


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────

class ThemeCreateRequest(BaseModel):
    theme_key: str = Field(..., description="고유 테마 키 (예: dark_gold)")
    name: str = Field(..., description="테마 표시명")
    primary_color: str = Field(..., description="기본 색상 (예: 0xFFFFD700)")
    secondary_color: str
    background_color: str
    surface_color: str
    text_color: str
    accent_color: Optional[str] = None
    font_family: Optional[str] = None


class ThemeUpdateRequest(BaseModel):
    name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    background_color: Optional[str] = None
    surface_color: Optional[str] = None
    text_color: Optional[str] = None
    accent_color: Optional[str] = None
    font_family: Optional[str] = None


# ──────────────────────────────────────────────
# 테마 API (앱 호출용 + 관리자 CRUD)
# ──────────────────────────────────────────────

@router.get("/theme/active")
async def get_active_theme(db: AsyncSession = Depends(get_db)):
    """앱에서 호출: 현재 활성화된 테마 조회"""
    result = await db.execute(
        select(SduiTheme).where(SduiTheme.is_active == True)
    )
    theme = result.scalars().first()
    if not theme:
        # 기본 다크 골드 테마 반환
        return {
            "theme_key": "dark_gold",
            "name": "다크 골드 (기본)",
            "primary_color": "0xFFFFD700",
            "secondary_color": "0xFFFFD700",
            "background_color": "0xFF0A0F1D",
            "surface_color": "0xFF1E2638",
            "text_color": "0xFFFFFFFF",
            "accent_color": "0xFFFF7A00",
            "font_family": None,
        }

    return {
        "id": theme.id,
        "theme_key": theme.theme_key,
        "name": theme.name,
        "primary_color": theme.primary_color,
        "secondary_color": theme.secondary_color,
        "background_color": theme.background_color,
        "surface_color": theme.surface_color,
        "text_color": theme.text_color,
        "accent_color": theme.accent_color,
        "font_family": theme.font_family,
    }


@router.get("/themes")
async def list_themes(db: AsyncSession = Depends(get_db)):
    """관리자용: 전체 테마 목록 조회"""
    result = await db.execute(select(SduiTheme).order_by(SduiTheme.id))
    themes = result.scalars().all()
    return [
        {
            "id": t.id,
            "theme_key": t.theme_key,
            "name": t.name,
            "primary_color": t.primary_color,
            "secondary_color": t.secondary_color,
            "background_color": t.background_color,
            "surface_color": t.surface_color,
            "text_color": t.text_color,
            "accent_color": t.accent_color,
            "font_family": t.font_family,
            "is_active": t.is_active,
            "created_at": str(t.created_at),
        }
        for t in themes
    ]


@router.post("/themes")
async def create_theme(req: ThemeCreateRequest, db: AsyncSession = Depends(get_db)):
    """관리자용: 새 테마 등록"""
    existing = await db.execute(
        select(SduiTheme).where(SduiTheme.theme_key == req.theme_key)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail=f"테마 키 '{req.theme_key}'가 이미 존재합니다.")

    theme = SduiTheme(
        theme_key=req.theme_key,
        name=req.name,
        primary_color=req.primary_color,
        secondary_color=req.secondary_color,
        background_color=req.background_color,
        surface_color=req.surface_color,
        text_color=req.text_color,
        accent_color=req.accent_color,
        font_family=req.font_family,
        is_active=False,
    )
    db.add(theme)
    await db.commit()
    await db.refresh(theme)

    logger.info(f"SDUI 테마 생성: {req.theme_key}")
    return {"id": theme.id, "theme_key": theme.theme_key, "message": "테마가 성공적으로 생성되었습니다."}


@router.put("/themes/{theme_id}")
async def update_theme(theme_id: int, req: ThemeUpdateRequest, db: AsyncSession = Depends(get_db)):
    """관리자용: 테마 수정"""
    result = await db.execute(select(SduiTheme).where(SduiTheme.id == theme_id))
    theme = result.scalars().first()
    if not theme:
        raise HTTPException(status_code=404, detail="테마를 찾을 수 없습니다.")

    for field_name in ["name", "primary_color", "secondary_color", "background_color",
                       "surface_color", "text_color", "accent_color", "font_family"]:
        new_val = getattr(req, field_name, None)
        if new_val is not None:
            setattr(theme, field_name, new_val)

    await db.commit()
    logger.info(f"SDUI 테마 수정: ID={theme_id}")
    return {"message": "테마가 수정되었습니다."}


@router.put("/themes/{theme_id}/activate")
async def activate_theme(theme_id: int, db: AsyncSession = Depends(get_db)):
    """관리자용: 특정 테마를 활성화 (다른 테마는 모두 비활성화)"""
    result = await db.execute(select(SduiTheme).where(SduiTheme.id == theme_id))
    theme = result.scalars().first()
    if not theme:
        raise HTTPException(status_code=404, detail="테마를 찾을 수 없습니다.")

    # 모든 테마 비활성화
    await db.execute(update(SduiTheme).values(is_active=False))
    # 선택된 테마 활성화
    theme.is_active = True
    await db.commit()

    logger.info(f"SDUI 테마 활성화: {theme.theme_key}")
    return {
        "message": f"'{theme.name}' 테마가 활성화되었습니다.",
        "theme_key": theme.theme_key,
    }
