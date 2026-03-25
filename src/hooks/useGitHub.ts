import { useState, useEffect, useCallback } from 'react';
import { githubClient } from '../github/client';
import { REPO_STORAGE_KEY } from '../github/config';
import type { RepoInfo, IssueItem, IssueDetail, PullItem, PullDetail, LabelItem, CommentItem } from '../github/types';

interface RepoConfig {
  owner: string;
  repo: string;
}

interface GitHubState {
  config: RepoConfig | null;
  repoInfo: RepoInfo | null;
  issues: IssueItem[];
  selectedIssue: IssueDetail | null;
  pulls: PullItem[];
  selectedPull: PullDetail | null;
  labels: LabelItem[];
  loading: boolean;
  error: string | null;
}

function loadConfig(): RepoConfig | null {
  try {
    const raw = localStorage.getItem(REPO_STORAGE_KEY);
    if (!raw) return null;
    const [owner, repo] = raw.split('/');
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

export function useGitHub() {
  const [state, setState] = useState<GitHubState>({
    config: loadConfig(),
    repoInfo: null,
    issues: [],
    selectedIssue: null,
    pulls: [],
    selectedPull: null,
    labels: [],
    loading: false,
    error: null,
  });

  const setError = (error: string | null) => setState(s => ({ ...s, error, loading: false }));
  const setLoading = (loading: boolean) => setState(s => ({ ...s, loading }));

  // ── Config ──────────────────────────────────────────────────────────────────

  const saveConfig = useCallback(async (owner: string, repo: string): Promise<boolean> => {
    setLoading(true);
    setState(s => ({ ...s, error: null }));
    try {
      const info = await githubClient.validateRepo(owner, repo);
      localStorage.setItem(REPO_STORAGE_KEY, `${owner}/${repo}`);
      setState(s => ({ ...s, config: { owner, repo }, repoInfo: info, loading: false }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to repo');
      return false;
    }
  }, []);

  const clearConfig = useCallback(() => {
    localStorage.removeItem(REPO_STORAGE_KEY);
    setState({
      config: null,
      repoInfo: null,
      issues: [],
      selectedIssue: null,
      pulls: [],
      selectedPull: null,
      labels: [],
      loading: false,
      error: null,
    });
  }, []);

  // ── Issues ──────────────────────────────────────────────────────────────────

  const fetchIssues = useCallback(async (issueState: 'open' | 'closed' = 'open') => {
    const cfg = state.config;
    if (!cfg) return;
    setLoading(true);
    setState(s => ({ ...s, selectedIssue: null, error: null }));
    try {
      const issues = await githubClient.listIssues(cfg.owner, cfg.repo, issueState);
      setState(s => ({ ...s, issues, loading: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load issues');
    }
  }, [state.config]);

  const selectIssue = useCallback(async (number: number) => {
    const cfg = state.config;
    if (!cfg) return;
    setLoading(true);
    try {
      const issue = await githubClient.getIssue(cfg.owner, cfg.repo, number);
      setState(s => ({ ...s, selectedIssue: issue, loading: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load issue');
    }
  }, [state.config]);

  const createIssue = useCallback(async (title: string, body?: string, labels?: string[]): Promise<boolean> => {
    const cfg = state.config;
    if (!cfg) return false;
    setLoading(true);
    try {
      const issue = await githubClient.createIssue(cfg.owner, cfg.repo, { title, body, labels });
      setState(s => ({ ...s, issues: [issue, ...s.issues], loading: false }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create issue');
      return false;
    }
  }, [state.config]);

  const closeIssue = useCallback(async (number: number) => {
    const cfg = state.config;
    if (!cfg) return;
    setLoading(true);
    try {
      await githubClient.closeIssue(cfg.owner, cfg.repo, number);
      setState(s => ({
        ...s,
        issues: s.issues.map(i => i.number === number ? { ...i, state: 'closed' } : i),
        selectedIssue: s.selectedIssue?.number === number
          ? { ...s.selectedIssue, state: 'closed' }
          : s.selectedIssue,
        loading: false,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close issue');
    }
  }, [state.config]);

  const addIssueComment = useCallback(async (number: number, body: string): Promise<CommentItem | null> => {
    const cfg = state.config;
    if (!cfg) return null;
    try {
      const comment = await githubClient.addIssueComment(cfg.owner, cfg.repo, number, body);
      setState(s => ({
        ...s,
        selectedIssue: s.selectedIssue?.number === number
          ? { ...s.selectedIssue, comments: [...s.selectedIssue.comments, comment] }
          : s.selectedIssue,
      }));
      return comment;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add comment');
      return null;
    }
  }, [state.config]);

  // ── Pull Requests ────────────────────────────────────────────────────────────

  const fetchPulls = useCallback(async (pullState: 'open' | 'closed' | 'merged' = 'open') => {
    const cfg = state.config;
    if (!cfg) return;
    setLoading(true);
    setState(s => ({ ...s, selectedPull: null, error: null }));
    try {
      const pulls = await githubClient.listPulls(cfg.owner, cfg.repo, pullState);
      setState(s => ({ ...s, pulls, loading: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pull requests');
    }
  }, [state.config]);

  const selectPull = useCallback(async (number: number) => {
    const cfg = state.config;
    if (!cfg) return;
    setLoading(true);
    try {
      const pull = await githubClient.getPull(cfg.owner, cfg.repo, number);
      setState(s => ({ ...s, selectedPull: pull, loading: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pull request');
    }
  }, [state.config]);

  const mergePull = useCallback(async (number: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge') => {
    const cfg = state.config;
    if (!cfg) return;
    setLoading(true);
    try {
      await githubClient.mergePull(cfg.owner, cfg.repo, number, { merge_method: mergeMethod });
      setState(s => ({
        ...s,
        pulls: s.pulls.map(p => p.number === number ? { ...p, state: 'merged' } : p),
        selectedPull: s.selectedPull?.number === number
          ? { ...s.selectedPull, state: 'merged' }
          : s.selectedPull,
        loading: false,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to merge pull request');
    }
  }, [state.config]);

  const closePull = useCallback(async (number: number) => {
    const cfg = state.config;
    if (!cfg) return;
    setLoading(true);
    try {
      await githubClient.closePull(cfg.owner, cfg.repo, number);
      setState(s => ({
        ...s,
        pulls: s.pulls.map(p => p.number === number ? { ...p, state: 'closed' } : p),
        selectedPull: s.selectedPull?.number === number
          ? { ...s.selectedPull, state: 'closed' }
          : s.selectedPull,
        loading: false,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close pull request');
    }
  }, [state.config]);

  const addPullComment = useCallback(async (number: number, body: string): Promise<CommentItem | null> => {
    const cfg = state.config;
    if (!cfg) return null;
    try {
      const comment = await githubClient.addPullComment(cfg.owner, cfg.repo, number, body);
      setState(s => ({
        ...s,
        selectedPull: s.selectedPull?.number === number
          ? { ...s.selectedPull, comments: [...s.selectedPull.comments, comment] }
          : s.selectedPull,
      }));
      return comment;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add comment');
      return null;
    }
  }, [state.config]);

  const fetchLabels = useCallback(async () => {
    const cfg = state.config;
    if (!cfg) return;
    try {
      const labels = await githubClient.listLabels(cfg.owner, cfg.repo);
      setState(s => ({ ...s, labels }));
    } catch {
      // labels are non-critical; fail silently
    }
  }, [state.config]);

  // Initial load when config is present
  useEffect(() => {
    if (state.config) {
      void fetchIssues('open');
      void fetchPulls('open');
      void fetchLabels();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.config?.owner, state.config?.repo]);

  return {
    ...state,
    saveConfig,
    clearConfig,
    fetchIssues,
    selectIssue,
    createIssue,
    closeIssue,
    addIssueComment,
    fetchPulls,
    selectPull,
    mergePull,
    closePull,
    addPullComment,
    fetchLabels,
  };
}
