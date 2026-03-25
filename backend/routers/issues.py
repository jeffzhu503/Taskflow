from fastapi import APIRouter, HTTPException
from github.graphql_client import run_query
from github.rest_client import rest_request
from github.queries import LIST_ISSUES, GET_ISSUE
from models import (
    IssueItem,
    IssueDetail,
    IssuesResponse,
    LabelItem,
    CommentItem,
    CreateIssueRequest,
    CommentRequest,
    CloseResult,
)

router = APIRouter()


def _label(n: dict) -> LabelItem:
    return LabelItem(name=n["name"], color=n["color"], description=n.get("description"))


def _comment(n: dict) -> CommentItem:
    return CommentItem(
        id=str(n["id"]),
        body=n["body"] or "",
        created_at=n["createdAt"],
        author_login=n["author"]["login"] if n.get("author") else "ghost",
    )


@router.get("/issues", response_model=IssuesResponse)
async def list_issues(owner: str, repo: str, state: str = "open") -> IssuesResponse:
    gql_states = ["OPEN"] if state == "open" else ["CLOSED"]
    try:
        data = await run_query(LIST_ISSUES, {"owner": owner, "name": repo, "states": gql_states})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    nodes = data["repository"]["issues"]["nodes"]
    return IssuesResponse(
        issues=[
            IssueItem(
                number=n["number"],
                title=n["title"],
                state=n["state"].lower(),
                created_at=n["createdAt"],
                author_login=n["author"]["login"] if n.get("author") else "ghost",
                labels=[_label(lb) for lb in n["labels"]["nodes"]],
                comment_count=n["comments"]["totalCount"],
            )
            for n in nodes
        ]
    )


@router.get("/issues/{number}", response_model=IssueDetail)
async def get_issue(owner: str, repo: str, number: int) -> IssueDetail:
    try:
        data = await run_query(GET_ISSUE, {"owner": owner, "name": repo, "number": number})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    iss = data["repository"].get("issue")
    if iss is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    return IssueDetail(
        number=iss["number"],
        title=iss["title"],
        body=iss.get("body"),
        state=iss["state"].lower(),
        created_at=iss["createdAt"],
        author_login=iss["author"]["login"] if iss.get("author") else "ghost",
        labels=[_label(lb) for lb in iss["labels"]["nodes"]],
        comment_count=len(iss["comments"]["nodes"]),
        comments=[_comment(c) for c in iss["comments"]["nodes"]],
    )


@router.post("/issues", response_model=IssueItem)
async def create_issue(owner: str, repo: str, body: CreateIssueRequest) -> IssueItem:
    payload: dict = {"title": body.title}
    if body.body:
        payload["body"] = body.body
    if body.labels:
        payload["labels"] = body.labels
    try:
        data = await rest_request("POST", f"/repos/{owner}/{repo}/issues", payload)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return IssueItem(
        number=data["number"],
        title=data["title"],
        state=data["state"],
        created_at=data["created_at"],
        author_login=data["user"]["login"],
        labels=[LabelItem(name=lb["name"], color=lb["color"]) for lb in data.get("labels", [])],
        comment_count=data.get("comments", 0),
    )


@router.post("/issues/{number}/close", response_model=CloseResult)
async def close_issue(owner: str, repo: str, number: int) -> CloseResult:
    try:
        data = await rest_request("PATCH", f"/repos/{owner}/{repo}/issues/{number}", {"state": "closed"})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return CloseResult(number=data["number"], state=data["state"])


@router.post("/issues/{number}/comments", response_model=CommentItem)
async def add_issue_comment(owner: str, repo: str, number: int, body: CommentRequest) -> CommentItem:
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
