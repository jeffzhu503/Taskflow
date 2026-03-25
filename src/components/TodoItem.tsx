import type { Todo } from '../types';

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: Props) {
  return (
    <div className={`task-item${todo.done ? ' done' : ''}`}>
      <button className="check-btn" onClick={() => onToggle(todo.id)}>
        {todo.done ? '✓' : ''}
      </button>
      <div className="task-body">
        <div className="task-text">{todo.text}</div>
        <div className="task-meta">
          <span className={`cat-badge ${todo.cat}`}>{todo.cat}</span>
          <span className="task-time">{todo.time}</span>
        </div>
      </div>
      <button className="del-btn" onClick={() => onDelete(todo.id)}>✕</button>
    </div>
  );
}
