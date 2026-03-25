import { useState } from 'react';
import type { FilterType } from './types';
import { useTodos } from './hooks/useTodos';
import { AddForm } from './components/AddForm';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { GitHubPanel } from './components/github/GitHubPanel';
import type { IssueItem } from './github/types';

type AppView = 'todos' | 'github';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'done',     label: 'Done' },
  { key: 'work',     label: 'Work' },
  { key: 'personal', label: 'Personal' },
  { key: 'urgent',   label: 'Urgent' },
];

const DATE_LABEL = new Date().toLocaleDateString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric',
});

export default function App() {
  const { todos, addTodo, toggleTodo, deleteTodo, clearCompleted } = useTodos();
  const [filter, setFilter] = useState<FilterType>('all');
  const [view, setView] = useState<AppView>('todos');

  function handleImportIssue(issue: IssueItem) {
    addTodo(issue.title, 'work');
    setView('todos');
  }

  const total   = todos.length;
  const done    = todos.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="shell">
      <header>
        <div className="logo-block">
          <div className="logo">Task<span>Flow</span></div>
          <div className="tagline">Your daily command center</div>
        </div>
        <div className="view-tabs">
          <button
            className={`view-tab${view === 'todos' ? ' active' : ''}`}
            onClick={() => setView('todos')}
          >
            Todos
          </button>
          <button
            className={`view-tab${view === 'github' ? ' active' : ''}`}
            onClick={() => setView('github')}
          >
            GitHub
          </button>
        </div>
        <div className="date-chip">{DATE_LABEL}</div>
      </header>

      {view === 'todos' && (
        <>
          <div className="stats">
            <div className="stat-card c-total">
              <div className="stat-label">Total</div>
              <div className="stat-num">{total}</div>
            </div>
            <div className="stat-card c-done">
              <div className="stat-label">Done</div>
              <div className="stat-num">{done}</div>
            </div>
            <div className="stat-card c-pending">
              <div className="stat-label">Pending</div>
              <div className="stat-num">{pending}</div>
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-row">
              <span>Overall progress</span>
              <span className="progress-pct">{pct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <AddForm onAdd={addTodo} />

          <div className="filter-row">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`filter-btn${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <TodoList
            todos={todos}
            filter={filter}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />

          <Footer total={total} onClearCompleted={clearCompleted} />
        </>
      )}

      {view === 'github' && (
        <GitHubPanel onImportIssue={handleImportIssue} />
      )}
    </div>
  );
}
