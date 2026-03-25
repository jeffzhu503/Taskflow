import { BACKEND_BASE_URL } from './config';
import type {
  RepoInfo,
  IssueItem,
  IssueDetail,
  IssuesResponse,
  PullItem,
  PullDetail,
  PullsResponse,
  LabelItem,
  LabelsResponse,
  CreateIssueRequest,
  CommentRequest,
  CommentItem,
  MergeRequest,
  MergeResult,
  CloseResult,
} from './types';

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${BACKEND_BASE_URL}${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const resp = await fetch(buildUrl(path, params));
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(String(err.detail ?? resp.statusText));
  }
  return resp.json() as Promise<T>;
}

async function apiPost<T>(path: string, params: Record<string, string>, body?: unknown): Promise<T> {
  const resp = await fetch(buildUrl(path, params), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(String(err.detail ?? resp.statusText));
  }
  return resp.json() as Promise<T>;
}

export const githubClient = {
  validateRepo: (owner: string, repo: string): Promise<RepoInfo> =>
    apiGet<RepoInfo>('/api/repo/validate', { owner, repo }),

  listIssues: (owner: string, repo: string, state: 'open' | 'closed' = 'open'): Promise<IssueItem[]> =>
    apiGet<IssuesResponse>('/api/issues', { owner, repo, state }).then(r => r.issues),

  getIssue: (owner: string, repo: string, number: number): Promise<IssueDetail> =>
    apiGet<IssueDetail>(`/api/issues/${number}`, { owner, repo }),

  createIssue: (owner: string, repo: string, body: CreateIssueRequest): Promise<IssueItem> =>
    apiPost<IssueItem>('/api/issues', { owner, repo }, body),

  closeIssue: (owner: string, repo: string, number: number): Promise<CloseResult> =>
    apiPost<CloseResult>(`/api/issues/${number}/close`, { owner, repo }),

  addIssueComment: (owner: string, repo: string, number: number, body: string): Promise<CommentItem> =>
    apiPost<CommentItem>(`/api/issues/${number}/comments`, { owner, repo }, { body } as CommentRequest),

  listPulls: (owner: string, repo: string, state: 'open' | 'closed' | 'merged' = 'open'): Promise<PullItem[]> =>
    apiGet<PullsResponse>('/api/pulls', { owner, repo, state }).then(r => r.pulls),

  getPull: (owner: string, repo: string, number: number): Promise<PullDetail> =>
    apiGet<PullDetail>(`/api/pulls/${number}`, { owner, repo }),

  mergePull: (owner: string, repo: string, number: number, req: MergeRequest = {}): Promise<MergeResult> =>
    apiPost<MergeResult>(`/api/pulls/${number}/merge`, { owner, repo }, req),

  closePull: (owner: string, repo: string, number: number): Promise<CloseResult> =>
    apiPost<CloseResult>(`/api/pulls/${number}/close`, { owner, repo }),

  addPullComment: (owner: string, repo: string, number: number, body: string): Promise<CommentItem> =>
    apiPost<CommentItem>(`/api/pulls/${number}/comments`, { owner, repo }, { body } as CommentRequest),

  listLabels: (owner: string, repo: string): Promise<LabelItem[]> =>
    apiGet<LabelsResponse>('/api/labels', { owner, repo }).then(r => r.labels),
};
