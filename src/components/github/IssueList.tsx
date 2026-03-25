import type { IssueItem } from '../../github/types';

interface Props {
  issues: IssueItem[];
  selectedNumber: number | null;
  onSelect: (number: number) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function IssueList({ issues, selectedNumber, onSelect }: Props) {
  if (issues.length === 0) {
    return <div className="gh-empty">No issues found.</div>;
  }

  return (
    <div className="gh-list">
      {issues.map(issue => (
        <div
          key={issue.number}
          className={`gh-item${issue.number === selectedNumber ? ' selected' : ''}`}
          onClick={() => onSelect(issue.number)}
        >
          <div className="gh-item-top">
            <span className={`gh-state-badge gh-state-${issue.state}`}>{issue.state}</span>
            <span className="gh-item-number">#{issue.number}</span>
            <span className="gh-item-title">{issue.title}</span>
          </div>
          <div className="gh-item-meta">
            <span className="gh-item-author">{issue.author_login}</span>
            <span className="gh-item-date">{formatDate(issue.created_at)}</span>
            {issue.comment_count > 0 && (
              <span className="gh-item-comments">{issue.comment_count} comment{issue.comment_count !== 1 ? 's' : ''}</span>
            )}
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
        </div>
      ))}
    </div>
  );
}
