import httpx
from app.core.config import settings

async def upload_to_supabase(content: bytes, content_type: str, category: str, filename: str) -> None:
    """
    Uploads raw file binary data to Supabase Storage bucket.
    """
    path = f"upload/{category}/{filename}"
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET_NAME}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, content=content, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Supabase Storage 업로드 실패 ({response.status_code}): {response.text}")
