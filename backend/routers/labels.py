from fastapi import APIRouter, HTTPException
from github.graphql_client import run_query
from github.queries import LIST_LABELS
from models import LabelItem, LabelsResponse

router = APIRouter()


@router.get("/labels", response_model=LabelsResponse)
async def list_labels(owner: str, repo: str) -> LabelsResponse:
    try:
        data = await run_query(LIST_LABELS, {"owner": owner, "name": repo})
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    nodes = data["repository"]["labels"]["nodes"]
    return LabelsResponse(
        labels=[
            LabelItem(
                name=n["name"],
                color=n["color"],
                description=n.get("description"),
            )
            for n in nodes
        ]
    )
