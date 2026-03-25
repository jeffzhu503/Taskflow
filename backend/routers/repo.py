from fastapi import APIRouter, HTTPException
from github.graphql_client import run_query
from github.queries import VALIDATE_REPO
from models import RepoInfo

router = APIRouter()


@router.get("/repo/validate", response_model=RepoInfo)
async def validate_repo(owner: str, repo: str) -> RepoInfo:
    try:
        data = await run_query(VALIDATE_REPO, {"owner": owner, "name": repo})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    r = data.get("repository")
    if r is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    return RepoInfo(
        name=r["name"],
        description=r.get("description"),
        stargazers_count=r["stargazerCount"],
        open_issues_count=r["openIssues"]["totalCount"],
        is_private=r["isPrivate"],
    )
