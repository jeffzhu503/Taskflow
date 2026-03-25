import type { PullDetail as PullDetailType } from '../../github/types';
import { CommentForm } from './CommentForm';

interface Props {
  pull: PullDetailType;
  onMerge: (number: number, method: 'merge' | 'squash' | 'rebase') => void;
  onClose: (number: number) => void;
  onComment: (number: number, body: string) => Promise<unknown>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function PullDetail({ pull, onMerge, onClose, onComment }: Props) {
  const canMerge = pull.state === 'open' && pull.mergeable === 'MERGEABLE';

  return (
    <div className="gh-detail">
      <div className="gh-detail-header">
        <span className={`gh-state-badge gh-state-${pull.state}`}>{pull.state}</span>
        <span className="gh-detail-number">#{pull.number}</span>
        <h3 className="gh-detail-title">{pull.title}</h3>
      </div>

      <div className="gh-detail-byline">
        <span>{pull.author_login}</span>
        <span>·</span>
        <span>{formatDate(pull.created_at)}</span>
        <span className="gh-item-branch">{pull.head_ref} → {pull.base_ref}</span>
      </div>

      {pull.body && (
        <pre className="gh-detail-body">{pull.body}</pre>
      )}

      {pull.state === 'open' && (
        <div className="gh-action-row">
          {canMerge && (
            <>
              <button className="gh-import-btn" onClick={() => onMerge(pull.number, 'merge')}>
                Merge
              </button>
              <button className="gh-merge-squash-btn" onClick={() => onMerge(pull.number, 'squash')}>
                Squash
              </button>
              <button className="gh-merge-squash-btn" onClick={() => onMerge(pull.number, 'rebase')}>
                Rebase
              </button>
            </>
          )}
          {pull.mergeable === 'CONFLICTING' && (
            <span className="gh-conflict-badge">Has conflicts</span>
          )}
          <button className="gh-close-btn" onClick={() => onClose(pull.number)}>
            Close PR
          </button>
        </div>
      )}

      {pull.comments.length > 0 && (
        <div className="gh-comment-list">
          <p className="gh-comment-heading">{pull.comments.length} comment{pull.comments.length !== 1 ? 's' : ''}</p>
          {pull.comments.map(c => (
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

      <CommentForm onSubmit={body => onComment(pull.number, body)} />
    </div>
  );
}
