import type { IssueDetail as IssueDetailType, IssueItem } from '../../github/types';
import { CommentForm } from './CommentForm';

interface Props {
  issue: IssueDetailType;
  onClose: (number: number) => void;
  onComment: (number: number, body: string) => Promise<unknown>;
  onImport: (issue: IssueItem) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function IssueDetail({ issue, onClose, onComment, onImport }: Props) {
  return (
    <div className="gh-detail">
      <div className="gh-detail-header">
        <span className={`gh-state-badge gh-state-${issue.state}`}>{issue.state}</span>
        <span className="gh-detail-number">#{issue.number}</span>
        <h3 className="gh-detail-title">{issue.title}</h3>
      </div>

      <div className="gh-detail-byline">
        <span>{issue.author_login}</span>
        <span>·</span>
        <span>{formatDate(issue.created_at)}</span>
        {issue.labels.map(lb => (
          <span
            key={lb.name}
            className="gh-label-chip"
            style={{ '--label-color': `#${lb.color}` } as React.CSSProperties}
          >
            {lb.name}
          </span>
        ))}
      </div>

      {issue.body && (
        <pre className="gh-detail-body">{issue.body}</pre>
      )}

      <div className="gh-action-row">
        <button className="gh-import-btn" onClick={() => onImport(issue)}>
          + Import as Todo
        </button>
        {issue.state === 'open' && (
          <button className="gh-close-btn" onClick={() => onClose(issue.number)}>
            Close Issue
          </button>
        )}
      </div>

      {issue.comments.length > 0 && (
        <div className="gh-comment-list">
          <p className="gh-comment-heading">{issue.comments.length} comment{issue.comments.length !== 1 ? 's' : ''}</p>
          {issue.comments.map(c => (
            <div key={c.id} className="gh-comment">
              <div className="gh-comment-meta">
                <strong>{c.author_login}</strong>
                <span>{formatDate(c.created_at)}</span>
              </div>
              <pre className="gh-comment-body">{c.body}</pre>
            </div>
          ))}
        </div>
      )}

      <CommentForm onSubmit={body => onComment(issue.number, body)} />
    </div>
  );
}
