import type { PullItem } from '../../github/types';

interface Props {
  pulls: PullItem[];
  selectedNumber: number | null;
  onSelect: (number: number) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PullList({ pulls, selectedNumber, onSelect }: Props) {
  if (pulls.length === 0) {
    return <div className="gh-empty">No pull requests found.</div>;
  }

  return (
    <div className="gh-list">
      {pulls.map(pr => (
        <div
          key={pr.number}
          className={`gh-item${pr.number === selectedNumber ? ' selected' : ''}`}
          onClick={() => onSelect(pr.number)}
        >
          <div className="gh-item-top">
            <span className={`gh-state-badge gh-state-${pr.state}`}>{pr.state}</span>
            <span className="gh-item-number">#{pr.number}</span>
            <span className="gh-item-title">{pr.title}</span>
          </div>
          <div className="gh-item-meta">
            <span className="gh-item-author">{pr.author_login}</span>
            <span className="gh-item-date">{formatDate(pr.created_at)}</span>
            <span className="gh-item-branch">{pr.head_ref} → {pr.base_ref}</span>
            {pr.comment_count > 0 && (
              <span className="gh-item-comments">{pr.comment_count} comment{pr.comment_count !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
