import logging
import re
import time
from typing import Any

import httpx
from config import settings
from github.metrics import record_error, record_success

REST_BASE = "https://api.github.com"
logger = logging.getLogger(__name__)
_client = httpx.AsyncClient(timeout=30.0)

_OWNER_REPO_RE = re.compile(r"/repos/[^/]+/[^/]+")
_NUMERIC_ID_RE = re.compile(r"/\d+")


async def close() -> None:
    await _client.aclose()


def _normalize_path(path: str) -> str:
    """Replace variable path segments to keep metric cardinality low.

    /repos/jeff/myrepo/issues/42/comments
    → /repos/:owner/:repo/issues/{id}/comments
    """
    path = _OWNER_REPO_RE.sub("/repos/:owner/:repo", path)
    path = _NUMERIC_ID_RE.sub("/{id}", path)
    return path


async def rest_request(method: str, path: str, json_body: dict[str, Any] | None = None) -> Any:
    operation = f"{method.upper()} {_normalize_path(path)}"
    headers = {
        "Authorization": f"Bearer {settings.github_pat}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    logger.debug("GitHub REST request started", extra={"operation": operation})

    start = time.perf_counter()
    try:
        resp = await _client.request(
            method,
            f"{REST_BASE}{path}",
            json=json_body,
            headers=headers,
        )
        resp.raise_for_status()
        record_success(logger, "rest", operation, time.perf_counter() - start, resp.status_code)

        # Some endpoints (e.g. merge) return 204 No Content
        if resp.status_code == 204 or not resp.content:
            return {}
        return resp.json()
    except Exception as exc:
        record_error(logger, "rest", operation, time.perf_counter() - start, exc)
        raise
