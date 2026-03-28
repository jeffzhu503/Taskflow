import logging
import re
import time

import httpx
from config import settings
from github.metrics import record_error, record_success

GQL_URL = "https://api.github.com/graphql"

_OPERATION_RE = re.compile(r"query\s+(\w+)")
logger = logging.getLogger(__name__)
_client = httpx.AsyncClient()


async def close() -> None:
    await _client.aclose()


def _operation_name(query: str) -> str:
    m = _OPERATION_RE.search(query)
    return m.group(1) if m else "unknown"


async def run_query(query: str, variables: dict) -> dict:
    operation = _operation_name(query)
    headers = {
        "Authorization": f"Bearer {settings.github_pat}",
        "Content-Type": "application/json",
    }

    logger.debug("GitHub GraphQL request started", extra={"operation": operation})

    start = time.perf_counter()
    try:
        resp = await _client.post(
            GQL_URL,
            json={"query": query, "variables": variables},
            headers=headers,
        )
        resp.raise_for_status()
        payload = resp.json()
        if "errors" in payload:
            raise ValueError(payload["errors"][0]["message"])
        record_success(logger, "graphql", operation, time.perf_counter() - start, resp.status_code)
        return payload["data"]
    except Exception as exc:
        record_error(logger, "graphql", operation, time.perf_counter() - start, exc)
        raise
