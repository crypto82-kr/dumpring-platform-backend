import httpx
from app.core.config import settings

async def upload_to_supabase(content: bytes, content_type: str, category: str, filename: str) -> None:
    """
    Uploads raw file binary data to Supabase Storage bucket.
    Maps categories to: documents, photos, or others.
    """
    mapped_category = "others"
    if category in ["documents", "biz_license", "qualification", "license"]:
        mapped_category = "documents"
    elif category in ["proofs", "photos"]:
        mapped_category = "photos"
    elif category == "others":
        mapped_category = "others"

    path = f"upload/{mapped_category}/{filename}"
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET_NAME}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, content=content, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Supabase Storage 업로드 실패 ({response.status_code}): {response.text}")

async def delete_from_supabase(category: str, filename: str) -> bool:
    """
    Deletes a file from Supabase Storage bucket.
    """
    mapped_category = "others"
    if category in ["documents", "biz_license", "qualification", "license"]:
        mapped_category = "documents"
    elif category in ["proofs", "photos"]:
        mapped_category = "photos"
    elif category == "others":
        mapped_category = "others"

    path = f"upload/{mapped_category}/{filename}"
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET_NAME}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(url, headers=headers)
            return response.status_code == 200
    except Exception:
        return False
