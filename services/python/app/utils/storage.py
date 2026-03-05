import httpx
from app.config import get_settings


async def upload_to_supabase_storage(
    bucket: str,
    path: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a file to Supabase Storage and return the public URL."""
    settings = get_settings()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}",
            content=data,
            headers={
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
        )
        response.raise_for_status()

    return f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{path}"


async def delete_from_supabase_storage(bucket: str, paths: list[str]) -> None:
    """Delete files from Supabase Storage."""
    settings = get_settings()

    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{settings.supabase_url}/storage/v1/object/{bucket}",
            json={"prefixes": paths},
            headers={
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
        )
        response.raise_for_status()
