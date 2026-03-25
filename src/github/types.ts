// TypeScript mirrors of backend/models.py Pydantic models

export interface LabelItem {
  name: string;
  color: string;
  description?: string;
}

export interface CommentItem {
  id: string;
  body: string;
  created_at: string;
  author_login: string;
}

export interface RepoInfo {
  name: string;
  description: string | null;
  stargazers_count: number;
  open_issues_count: number;
  is_private: boolean;
}

export interface IssueItem {
  number: number;
  title: string;
  state: string;
  created_at: string;
  author_login: string;
  labels: LabelItem[];
  comment_count: number;
}

export interface IssueDetail extends IssueItem {
  body: string | null;
  comments: CommentItem[];
}

export interface IssuesResponse {
  issues: IssueItem[];
}

export interface PullItem {
  number: number;
  title: string;
  state: string;
  created_at: string;
  author_login: string;
  head_ref: string;
  base_ref: string;
  mergeable: string;
  comment_count: number;
}

export interface PullDetail extends PullItem {
  body: string | null;
  comments: CommentItem[];
}

export interface PullsResponse {
  pulls: PullItem[];
}

export interface CreateIssueRequest {
  title: string;
  body?: string;
  labels?: string[];
}

export interface CommentRequest {
  body: string;
}

export interface MergeRequest {
  merge_method?: 'merge' | 'squash' | 'rebase';
  commit_title?: string;
}

export interface MergeResult {
  merged: boolean;
  message: string;
}

export interface CloseResult {
  number: number;
  state: string;
}

export interface LabelsResponse {
  labels: LabelItem[];
}
