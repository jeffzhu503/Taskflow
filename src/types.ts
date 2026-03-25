export type Category = 'general' | 'work' | 'personal' | 'urgent';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  cat: Category;
  time: string; // "HH:MM AM/PM"
}

export type FilterType = 'all' | 'pending' | 'done' | 'work' | 'personal' | 'urgent';
