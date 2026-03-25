from typing import Any
import httpx
from config import settings

REST_BASE = "https://api.github.com"


async def rest_request(method: str, path: str, json_body: dict[str, Any] | None = None) -> Any:
    headers = {
        "Authorization": f"Bearer {settings.github_pat}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            method,
            f"{REST_BASE}{path}",
            json=json_body,
            headers=headers,
        )
        resp.raise_for_status()
        # Some endpoints (e.g. merge) return 204 No Content
        if resp.status_code == 204 or not resp.content:
            return {}
        return resp.json()
