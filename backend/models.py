from typing import Optional
from pydantic import BaseModel


# ── Shared ─────────────────────────────────────────────────────────────────────

class LabelItem(BaseModel):
    name: str
    color: str
    description: Optional[str] = None


class CommentItem(BaseModel):
    id: str
    body: str
    created_at: str
    author_login: str


# ── Repo ───────────────────────────────────────────────────────────────────────

class RepoInfo(BaseModel):
    name: str
    description: Optional[str]
    stargazers_count: int
    open_issues_count: int
    is_private: bool


# ── Issues ─────────────────────────────────────────────────────────────────────

class IssueItem(BaseModel):
    number: int
    title: str
    state: str
    created_at: str
    author_login: str
    labels: list[LabelItem]
    comment_count: int


class IssueDetail(IssueItem):
    body: Optional[str]
    comments: list[CommentItem]


class IssuesResponse(BaseModel):
    issues: list[IssueItem]


class CreateIssueRequest(BaseModel):
    title: str
    body: Optional[str] = None
    labels: list[str] = []


class CommentRequest(BaseModel):
    body: str


class CloseResult(BaseModel):
    number: int
    state: str


# ── Pull Requests ──────────────────────────────────────────────────────────────

class PullItem(BaseModel):
    number: int
    title: str
    state: str
    created_at: str
    author_login: str
    head_ref: str
    base_ref: str
    mergeable: str   # "MERGEABLE" | "CONFLICTING" | "UNKNOWN"
    comment_count: int


class PullDetail(PullItem):
    body: Optional[str]
    comments: list[CommentItem]


class PullsResponse(BaseModel):
    pulls: list[PullItem]


class MergeRequest(BaseModel):
    merge_method: str = "merge"   # "merge" | "squash" | "rebase"
    commit_title: Optional[str] = None


class MergeResult(BaseModel):
    merged: bool
    message: str


# ── Labels ─────────────────────────────────────────────────────────────────────

class LabelsResponse(BaseModel):
    labels: list[LabelItem]
