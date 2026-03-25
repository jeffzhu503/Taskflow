from fastapi import APIRouter, HTTPException
from github.graphql_client import run_query
from github.rest_client import rest_request
from github.queries import LIST_PULLS, GET_PULL
from models import (
    PullItem,
    PullDetail,
    PullsResponse,
    CommentItem,
    CommentRequest,
    CloseResult,
    MergeRequest,
    MergeResult,
)

router = APIRouter()


def _comment(n: dict) -> CommentItem:
    return CommentItem(
        id=str(n["id"]),
        body=n["body"] or "",
        created_at=n["createdAt"],
        author_login=n["author"]["login"] if n.get("author") else "ghost",
    )


def _gql_states(state: str) -> list[str]:
    if state == "open":
        return ["OPEN"]
    if state == "merged":
        return ["MERGED"]
    return ["CLOSED"]


@router.get("/pulls", response_model=PullsResponse)
async def list_pulls(owner: str, repo: str, state: str = "open") -> PullsResponse:
    try:
        data = await run_query(LIST_PULLS, {"owner": owner, "name": repo, "states": _gql_states(state)})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    nodes = data["repository"]["pullRequests"]["nodes"]
    return PullsResponse(
        pulls=[
            PullItem(
                number=n["number"],
                title=n["title"],
                state=n["state"].lower(),
                created_at=n["createdAt"],
                author_login=n["author"]["login"] if n.get("author") else "ghost",
                head_ref=n["headRefName"],
                base_ref=n["baseRefName"],
                mergeable=n.get("mergeable") or "UNKNOWN",
                comment_count=n["comments"]["totalCount"],
            )
            for n in nodes
        ]
    )


@router.get("/pulls/{number}", response_model=PullDetail)
async def get_pull(owner: str, repo: str, number: int) -> PullDetail:
    try:
        data = await run_query(GET_PULL, {"owner": owner, "name": repo, "number": number})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    pr = data["repository"].get("pullRequest")
    if pr is None:
        raise HTTPException(status_code=404, detail="Pull request not found")

    return PullDetail(
        number=pr["number"],
        title=pr["title"],
        body=pr.get("body"),
        state=pr["state"].lower(),
        created_at=pr["createdAt"],
        author_login=pr["author"]["login"] if pr.get("author") else "ghost",
        head_ref=pr["headRefName"],
        base_ref=pr["baseRefName"],
        mergeable=pr.get("mergeable") or "UNKNOWN",
        comment_count=len(pr["comments"]["nodes"]),
        comments=[_comment(c) for c in pr["comments"]["nodes"]],
    )


@router.post("/pulls/{number}/merge", response_model=MergeResult)
async def merge_pull(owner: str, repo: str, number: int, body: MergeRequest) -> MergeResult:
    payload: dict = {"merge_method": body.merge_method}
    if body.commit_title:
        payload["commit_title"] = body.commit_title
    try:
        data = await rest_request("PUT", f"/repos/{owner}/{repo}/pulls/{number}/merge", payload)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return MergeResult(merged=data.get("merged", True), message=data.get("message", "Pull request merged"))


@router.post("/pulls/{number}/close", response_model=CloseResult)
async def close_pull(owner: str, repo: str, number: int) -> CloseResult:
    try:
        data = await rest_request("PATCH", f"/repos/{owner}/{repo}/pulls/{number}", {"state": "closed"})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return CloseResult(number=data["number"], state=data["state"])


@router.post("/pulls/{number}/comments", response_model=CommentItem)
async def add_pull_comment(owner: str, repo: str, number: int, body: CommentRequest) -> CommentItem:
    # PRs share the issues comment endpoint
    try:
        data = await rest_request("POST", f"/repos/{owner}/{repo}/issues/{number}/comments", {"body": body.body})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return CommentItem(
        id=str(data["id"]),
        body=data["body"],
        created_at=data["created_at"],
        author_login=data["user"]["login"],
    )
