// src/components/DocumentPanel.tsx
import { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { Category } from '../types';
import { useDocuments } from '../hooks/useDocuments';

interface Props {
  onAddTodo: (text: string, cat: Category) => void;
}

export function DocumentPanel({ onAddTodo }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const {
    files, loading, tasks, selectedIds, error,
    setFiles, analyze, toggleTask, selectAll, addSelected,
  } = useDocuments(onAddTodo);

  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(e.target.files);
  }

  const byFile = tasks.reduce<Record<string, { task: typeof tasks[number]; index: number }[]>>(
    (acc, task, i) => {
      (acc[task.filename] ??= []).push({ task, index: i });
      return acc;
    },
    {},
  );

  return (
    <div className="document-panel">
      <input ref={fileInputRef} type="file" accept=".docx,.pdf,.txt" multiple
        style={{ display: 'none' }} onChange={handleChange} />
      <input ref={folderInputRef} type="file"
        style={{ display: 'none' }} onChange={handleChange} />

      {tasks.length === 0 && !loading && (
        <>
          <div className="doc-picker-buttons">
            <button onClick={() => fileInputRef.current?.click()}>Choose file</button>
            <button onClick={() => folderInputRef.current?.click()}>Choose folder</button>
          </div>
          <p className="doc-hint">Accepted: .docx, .pdf, .txt</p>

          {files.length > 0 ? (
            <>
              <ul className="doc-file-list">
                {files.map(f => <li key={f.name}>{f.name}</li>)}
              </ul>
              <button onClick={analyze}>
                Analyze {files.length} file{files.length !== 1 ? 's' : ''}
              </button>
            </>
          ) : (
            <p className="doc-empty">No document selected yet</p>
          )}

          {error && <p className="doc-error">{error}</p>}
        </>
      )}

      {loading && (
        <p>Analyzing {files.length} file{files.length !== 1 ? 's' : ''}…</p>
      )}

      {tasks.length > 0 && (
        <>
          <div className="doc-results-header">
            <span>{tasks.length} tasks from {Object.keys(byFile).length} file(s)</span>
            <button onClick={selectAll}>Select all</button>
          </div>

          {Object.entries(byFile).map(([filename, items]) => (
            <div key={filename} className="doc-file-group">
              <h4 className="doc-file-name">{filename}</h4>
              {items.map(({ task, index }) => (
                <label key={index} className="doc-task-row">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(index)}
                    onChange={() => toggleTask(index)}
                  />
                  <div>
                    <div>{task.title}</div>
                    <small>{task.category} · {task.source_hint}</small>
                  </div>
                </label>
              ))}
            </div>
          ))}

          <button
            onClick={addSelected}
            disabled={selectedIds.size === 0}
          >
            Add {selectedIds.size} selected task{selectedIds.size !== 1 ? 's' : ''} to Todos
          </button>
        </>
      )}
    </div>
  );
}
