import { useState, useEffect } from 'react';
import type { Todo, Category } from '../types';

const STORAGE_KEY = 'tf_tasks';

const SEED: Todo[] = [
  { id: '1', text: 'Review quarterly report and prepare summary', cat: 'work',     done: false, time: '09:00 AM' },
  { id: '2', text: 'Buy groceries for the week',                   cat: 'personal', done: false, time: '10:30 AM' },
  { id: '3', text: 'Fix critical bug in production — ASAP',        cat: 'urgent',   done: false, time: '11:00 AM' },
  { id: '4', text: 'Schedule team standup for next week',          cat: 'work',     done: true,  time: '12:00 PM' },
  { id: '5', text: 'Read two chapters of current book',            cat: 'personal', done: true,  time: '01:00 PM' },
];

function loadTodos(): Todo[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(stored) && stored.length > 0 ? stored : SEED;
  } catch {
    return SEED;
  }
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  function addTodo(text: string, cat: Category) {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setTodos(prev => [
      { id: crypto.randomUUID(), text: text.trim(), done: false, cat, time },
      ...prev,
    ]);
  }

  function toggleTodo(id: string) {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  function clearCompleted() {
    setTodos(prev => prev.filter(t => !t.done));
  }

  return { todos, addTodo, toggleTodo, deleteTodo, clearCompleted };
}
