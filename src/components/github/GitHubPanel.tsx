import { useState } from 'react';
import { useGitHub } from '../../hooks/useGitHub';
import { RepoSetupForm } from './RepoSetupForm';
import { IssueList } from './IssueList';
import { IssueDetail } from './IssueDetail';
import { CreateIssueForm } from './CreateIssueForm';
import { PullList } from './PullList';
import { PullDetail } from './PullDetail';
import type { IssueItem } from '../../github/types';

type GHTab = 'issues' | 'prs';
type IssueStateFilter = 'open' | 'closed';
type PullStateFilter = 'open' | 'closed' | 'merged';

interface Props {
  onImportIssue: (issue: IssueItem) => void;
}

export function GitHubPanel({ onImportIssue }: Props) {
  const gh = useGitHub();
  const [activeTab, setActiveTab] = useState<GHTab>('issues');
  const [issueStateFilter, setIssueStateFilter] = useState<IssueStateFilter>('open');
  const [pullStateFilter, setPullStateFilter] = useState<PullStateFilter>('open');
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleIssueStateChange(s: IssueStateFilter) {
    setIssueStateFilter(s);
    void gh.fetchIssues(s);
  }

  function handlePullStateChange(s: PullStateFilter) {
    setPullStateFilter(s);
    void gh.fetchPulls(s);
  }

  if (!gh.config) {
    return (
      <section className="gh-panel-wrapper">
        <RepoSetupForm onSave={gh.saveConfig} loading={gh.loading} error={gh.error} />
      </section>
    );
  }

  return (
    <section className="gh-panel-wrapper">
      <div className="gh-panel-header">
        <div className="gh-repo-info">
          <span className="gh-repo-name">{gh.config.owner}/{gh.config.repo}</span>
          {gh.repoInfo && (
            <span className="gh-repo-meta">
              ★ {gh.repoInfo.stargazers_count} · {gh.repoInfo.open_issues_count} open issues
            </span>
          )}
        </div>
        <button className="gh-change-repo" onClick={gh.clearConfig}>Change repo</button>
      </div>

      {/* Tab switcher */}
      <div className="gh-tabs">
        <button
          className={`gh-tab${activeTab === 'issues' ? ' active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Issues
        </button>
        <button
          className={`gh-tab${activeTab === 'prs' ? ' active' : ''}`}
          onClick={() => setActiveTab('prs')}
        >
          Pull Requests
        </button>
      </div>

      {gh.error && <p className="gh-error gh-error-bar">{gh.error}</p>}

      {/* Issues tab */}
      {activeTab === 'issues' && (
        <div className="gh-tab-content">
          <div className="gh-tab-toolbar">
            <div className="gh-state-toggle">
              <button
                className={issueStateFilter === 'open' ? 'active' : ''}
                onClick={() => handleIssueStateChange('open')}
              >
                Open
              </button>
              <button
                className={issueStateFilter === 'closed' ? 'active' : ''}
                onClick={() => handleIssueStateChange('closed')}
              >
                Closed
              </button>
            </div>
            <button className="gh-new-btn" onClick={() => setShowCreateForm(v => !v)}>
              {showCreateForm ? 'Cancel' : '+ New Issue'}
            </button>
          </div>

          {showCreateForm && (
            <CreateIssueForm
              labels={gh.labels}
              onSubmit={gh.createIssue}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {gh.loading && <div className="gh-spinner">Loading…</div>}

          <div className="gh-split">
            <IssueList
              issues={gh.issues}
              selectedNumber={gh.selectedIssue?.number ?? null}
              onSelect={num => void gh.selectIssue(num)}
            />
            {gh.selectedIssue && (
              <IssueDetail
                issue={gh.selectedIssue}
                onClose={num => void gh.closeIssue(num)}
                onComment={(num, body) => gh.addIssueComment(num, body)}
                onImport={issue => {
                  onImportIssue(issue);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* PRs tab */}
      {activeTab === 'prs' && (
        <div className="gh-tab-content">
          <div className="gh-tab-toolbar">
            <div className="gh-state-toggle">
              <button
                className={pullStateFilter === 'open' ? 'active' : ''}
                onClick={() => handlePullStateChange('open')}
              >
                Open
              </button>
              <button
                className={pullStateFilter === 'closed' ? 'active' : ''}
                onClick={() => handlePullStateChange('closed')}
              >
                Closed
              </button>
              <button
                className={pullStateFilter === 'merged' ? 'active' : ''}
                onClick={() => handlePullStateChange('merged')}
              >
                Merged
              </button>
            </div>
          </div>

          {gh.loading && <div className="gh-spinner">Loading…</div>}

          <div className="gh-split">
            <PullList
              pulls={gh.pulls}
              selectedNumber={gh.selectedPull?.number ?? null}
              onSelect={num => void gh.selectPull(num)}
            />
            {gh.selectedPull && (
              <PullDetail
                pull={gh.selectedPull}
                onMerge={(num, method) => void gh.mergePull(num, method)}
                onClose={num => void gh.closePull(num)}
                onComment={(num, body) => gh.addPullComment(num, body)}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
