import re
import time
from typing import Any

import httpx
from config import settings
from github.metrics import errors_total, request_duration, requests_total

REST_BASE = "https://api.github.com"

_OWNER_REPO_RE = re.compile(r"/repos/[^/]+/[^/]+")
_NUMERIC_ID_RE = re.compile(r"/\d+")


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
    attrs = {"api.transport": "rest", "operation": operation}

    headers = {
        "Authorization": f"Bearer {settings.github_pat}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    start = time.perf_counter()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method,
                f"{REST_BASE}{path}",
                json=json_body,
                headers=headers,
            )
            resp.raise_for_status()

        elapsed = time.perf_counter() - start
        hit_attrs = {**attrs, "http.status_code": str(resp.status_code)}
        request_duration.record(elapsed, hit_attrs)
        requests_total.add(1, hit_attrs)

        # Some endpoints (e.g. merge) return 204 No Content
        if resp.status_code == 204 or not resp.content:
            return {}
        return resp.json()
    except Exception as exc:
        elapsed = time.perf_counter() - start
        err_attrs = {**attrs, "error.type": type(exc).__name__}
        request_duration.record(elapsed, err_attrs)
        errors_total.add(1, err_attrs)
        raise
