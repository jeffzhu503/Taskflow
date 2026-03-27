import logging
import re
import time

import httpx
from config import settings
from github.metrics import errors_total, request_duration, requests_total

GQL_URL = "https://api.github.com/graphql"

_OPERATION_RE = re.compile(r"query\s+(\w+)")
logger = logging.getLogger(__name__)


def _operation_name(query: str) -> str:
    m = _OPERATION_RE.search(query)
    return m.group(1) if m else "unknown"


async def run_query(query: str, variables: dict) -> dict:
    operation = _operation_name(query)
    attrs = {"api.transport": "graphql", "operation": operation}

    headers = {
        "Authorization": f"Bearer {settings.github_pat}",
        "Content-Type": "application/json",
    }

    logger.debug("GitHub GraphQL request started", extra={"operation": operation})

    start = time.perf_counter()
    try:
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

        elapsed = time.perf_counter() - start
        hit_attrs = {**attrs, "http.status_code": str(resp.status_code)}
        request_duration.record(elapsed, hit_attrs)
        requests_total.add(1, hit_attrs)
        logger.info(
            "GitHub GraphQL request completed",
            extra={"operation": operation, "status_code": resp.status_code, "duration_ms": round(elapsed * 1000, 2)},
        )
        return payload["data"]
    except Exception as exc:
        elapsed = time.perf_counter() - start
        err_attrs = {**attrs, "error.type": type(exc).__name__}
        request_duration.record(elapsed, err_attrs)
        errors_total.add(1, err_attrs)
        logger.error(
            "GitHub GraphQL request failed",
            extra={"operation": operation, "error.type": type(exc).__name__, "duration_ms": round(elapsed * 1000, 2)},
            exc_info=True,
        )
        raise
