import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LabelItem } from '../../github/types';

interface Props {
  labels: LabelItem[];
  onSubmit: (title: string, body?: string, labels?: string[]) => Promise<boolean>;
  onCancel: () => void;
}

export function CreateIssueForm({ labels, onSubmit, onCancel }: Props) {
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleLabel(name: string) {
    setSelectedLabels(prev =>
      prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const title = titleRef.current?.value.trim() ?? '';
    if (!title) { setError('Title is required.'); return; }
    setError('');
    setSubmitting(true);
    const body = bodyRef.current?.value.trim() || undefined;
    const ok = await onSubmit(title, body, selectedLabels.length ? selectedLabels : undefined);
    setSubmitting(false);
    if (ok) onCancel();
  }

  return (
    <form className="gh-create-form" onSubmit={handleSubmit}>
      <h4 className="gh-create-title">New Issue</h4>
      <div className="gh-field">
        <label htmlFor="gh-issue-title">Title</label>
        <input id="gh-issue-title" ref={titleRef} type="text" placeholder="Issue title" />
      </div>
      <div className="gh-field">
        <label htmlFor="gh-issue-body">Description (optional)</label>
        <textarea id="gh-issue-body" ref={bodyRef} rows={4} placeholder="Describe the issue…" />
      </div>
      {labels.length > 0 && (
        <div className="gh-field">
          <label>Labels</label>
          <div className="gh-label-picker">
            {labels.map(lb => (
              <span
                key={lb.name}
                className={`gh-label-chip gh-label-selectable${selectedLabels.includes(lb.name) ? ' selected' : ''}`}
                style={{ '--label-color': `#${lb.color}` } as React.CSSProperties}
                onClick={() => toggleLabel(lb.name)}
              >
                {lb.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {error && <p className="gh-error">{error}</p>}
      <div className="gh-action-row">
        <button type="submit" className="gh-import-btn" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Issue'}
        </button>
        <button type="button" className="gh-close-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
