import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

interface Props {
  onSubmit: (body: string) => Promise<unknown>;
}

export function CommentForm({ onSubmit }: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = textRef.current?.value.trim() ?? '';
    if (!body) return;
    setSubmitting(true);
    await onSubmit(body);
    setSubmitting(false);
    if (textRef.current) textRef.current.value = '';
  }

  return (
    <form className="gh-comment-form" onSubmit={handleSubmit}>
      <textarea
        ref={textRef}
        className="gh-comment-input"
        placeholder="Leave a comment…"
        rows={3}
      />
      <button type="submit" className="gh-comment-submit" disabled={submitting}>
        {submitting ? 'Posting…' : 'Comment'}
      </button>
    </form>
  );
}
