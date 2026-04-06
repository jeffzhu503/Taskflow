export type Category = 'general' | 'work' | 'personal' | 'urgent';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  cat: Category;
  time: string; // "HH:MM AM/PM"
}

export type FilterType = 'all' | 'pending' | 'done' | 'work' | 'personal' | 'urgent';

// ── RAG ──────────────────────────────────────────────────────────────────────

export interface RagTask {
  title: string;
  category: Category;
  source_hint: string;
  filename: string;
}

export interface AnalyzeResponse {
  files_processed: number;
  tasks: RagTask[];
}
