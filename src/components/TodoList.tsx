import type { Todo, FilterType } from '../types';
import { TodoItem } from './TodoItem';

interface Props {
  todos: Todo[];
  filter: FilterType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const LABELS: Record<FilterType, string> = {
  all:      'All tasks',
  pending:  'Pending tasks',
  done:     'Completed tasks',
  work:     'Work tasks',
  personal: 'Personal tasks',
  urgent:   'Urgent tasks',
};

export function TodoList({ todos, filter, onToggle, onDelete }: Props) {
  const visible = todos.filter(t => {
    if (filter === 'pending')  return !t.done;
    if (filter === 'done')     return t.done;
    if (filter === 'work' || filter === 'personal' || filter === 'urgent')
      return t.cat === filter;
    return true;
  });

  return (
    <>
      <div className="section-label">{LABELS[filter]}</div>
      <div className="task-list">
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <div>No tasks here yet</div>
          </div>
        ) : (
          visible.map(t => (
            <TodoItem key={t.id} todo={t} onToggle={onToggle} onDelete={onDelete} />
          ))
        )}
      </div>
    </>
  );
}
