import { useRef } from 'react';
import type { FormEvent } from 'react';
import type { Category } from '../types';

interface Props {
  onAdd: (text: string, cat: Category) => void;
}

export function AddForm({ onAdd }: Props) {
  const textRef = useRef<HTMLInputElement>(null);
  const catRef  = useRef<HTMLSelectElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = textRef.current!.value.trim();
    if (!text) return;
    onAdd(text, (catRef.current!.value as Category));
    textRef.current!.value = '';
    textRef.current!.focus();
  }

  return (
    <form className="input-row" onSubmit={handleSubmit}>
      <input
        ref={textRef}
        className="task-input"
        type="text"
        placeholder="Add a new task…"
        autoComplete="off"
      />
      <select ref={catRef} className="category-select">
        <option value="general">General</option>
        <option value="work">Work</option>
        <option value="personal">Personal</option>
        <option value="urgent">Urgent</option>
      </select>
      <button type="submit" className="add-btn">+ Add</button>
    </form>
  );
}
