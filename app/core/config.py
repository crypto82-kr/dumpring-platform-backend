from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "덤프링 (dumpring)"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "SUPER_SECRET_KEY_REPLACE_THIS_IN_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days

    # Database
    DATABASE_URL: Optional[str] = "postgresql+asyncpg://postgres.vvdydhxmwdrrazwyjvvu:crypto.co.kr@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

    # Supabase Storage Configuration
    SUPABASE_URL: str = "https://vvdydhxmwdrrazwyjvvu.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZHlkaHhtd2RycmF6d3lqdnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4NjY0MzIwMCwiZXhwIjoyMDAyMjE5MjAwfQ.example"
    SUPABASE_BUCKET_NAME: str = "dumpring-documents"




    # Settings Config
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
