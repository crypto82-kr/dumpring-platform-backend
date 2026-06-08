import asyncio
import os
import dotenv
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models import Driver, User, UserUploadedDocument, SiteEmployee

dotenv.load_dotenv()
d_url = os.getenv("DATABASE_URL")
if d_url.startswith("postgresql://"):
    d_url = d_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(d_url, connect_args={"statement_cache_size": 0})

from app.models import SduiTheme
from sqlalchemy import update

async def check():
    async with AsyncSession(engine) as session:
        # 1. 모든 테마 비활성화
        await session.execute(update(SduiTheme).values(is_active=False))
        
        # 2. light_mustard 테마 확인 및 삽입/활성화
        res = await session.execute(select(SduiTheme).where(SduiTheme.theme_key == 'light_mustard'))
        theme = res.scalars().first()
        if not theme:
            theme = SduiTheme(
                theme_key="light_mustard",
                name="머스터드 옐로우 (공식)",
                primary_color="0xFFF59E0B",
                secondary_color="0xFFD97706",
                background_color="0xFFF9F8F6",
                surface_color="0xFFFFFFFF",
                text_color="0xFF1F2937",
                accent_color="0xFFD97706",
                is_active=True
            )
            session.add(theme)
            print("light_mustard theme created and set to ACTIVE!")
        else:
            theme.is_active = True
            theme.name = "머스터드 옐로우 (공식)"
            theme.primary_color = "0xFFF59E0B"
            theme.secondary_color = "0xFFD97706"
            theme.background_color = "0xFFF9F8F6"
            theme.surface_color = "0xFFFFFFFF"
            theme.text_color = "0xFF1F2937"
            theme.accent_color = "0xFFD97706"
            print("light_mustard theme updated and set to ACTIVE!")
            
        await session.commit()
            
if __name__ == "__main__":
    asyncio.run(check())
