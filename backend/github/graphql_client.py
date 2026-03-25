import httpx
from config import settings

GQL_URL = "https://api.github.com/graphql"


async def run_query(query: str, variables: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {settings.github_pat}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GQL_URL,
            json={"query": query, "variables": variables},
            headers=headers,
        )
        resp.raise_for_status()
        payload = resp.json()
        if "errors" in payload:
            raise ValueError(payload["errors"][0]["message"])
        return payload["data"]
