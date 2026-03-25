import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

interface Props {
  onSave: (owner: string, repo: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function RepoSetupForm({ onSave, loading, error }: Props) {
  const ownerRef = useRef<HTMLInputElement>(null);
  const repoRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const owner = ownerRef.current?.value.trim() ?? '';
    const repo = repoRef.current?.value.trim() ?? '';
    if (!owner || !repo) {
      setLocalError('Both owner and repo name are required.');
      return;
    }
    setLocalError('');
    await onSave(owner, repo);
  }

  const displayError = localError || error;

  return (
    <div className="gh-config-form">
      <div className="gh-config-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
      </div>
      <h2 className="gh-config-title">Connect to GitHub</h2>
      <p className="gh-config-subtitle">Enter the repository you want to manage. Your PAT is stored securely in the backend <code>.env</code> file.</p>
      <form onSubmit={handleSubmit} className="gh-config-fields">
        <div className="gh-field">
          <label htmlFor="gh-owner">Owner</label>
          <input
            id="gh-owner"
            ref={ownerRef}
            type="text"
            placeholder="e.g. octocat"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="gh-field">
          <label htmlFor="gh-repo">Repository</label>
          <input
            id="gh-repo"
            ref={repoRef}
            type="text"
            placeholder="e.g. Hello-World"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {displayError && <p className="gh-error">{displayError}</p>}
        <button type="submit" className="gh-connect-btn" disabled={loading}>
          {loading ? 'Connecting…' : 'Connect'}
        </button>
      </form>
    </div>
  );
}
