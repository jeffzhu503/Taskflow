// src/hooks/useDocuments.ts
import { useState } from 'react';
import type { Category, RagTask } from '../types';
import { analyzeDocuments } from '../rag/client';

const SUPPORTED_EXTENSIONS = ['.docx', '.pdf', '.txt'];

function filterSupported(fileList: FileList): File[] {
  return Array.from(fileList).filter(f =>
    SUPPORTED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
  );
}

interface DocumentsState {
  files: File[];
  loading: boolean;
  tasks: RagTask[];
  selectedIds: Set<number>;
  error: string | null;
}

export function useDocuments(onAddTodo: (text: string, cat: Category) => void) {
  const [state, setState] = useState<DocumentsState>({
    files: [],
    loading: false,
    tasks: [],
    selectedIds: new Set(),
    error: null,
  });

  function setFiles(fileList: FileList) {
    const files = filterSupported(fileList);
    setState(s => ({ ...s, files, tasks: [], selectedIds: new Set(), error: null }));
  }

  function clearFiles() {
    setState({ files: [], loading: false, tasks: [], selectedIds: new Set(), error: null });
  }

  async function analyze() {
    if (state.files.length === 0) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await analyzeDocuments(state.files);
      setState(s => ({
        ...s,
        loading: false,
        tasks: result.tasks,
        selectedIds: new Set(result.tasks.map((_, i) => i)),
      }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }

  function toggleTask(index: number) {
    setState(s => {
      const selectedIds = new Set(s.selectedIds);
      if (selectedIds.has(index)) selectedIds.delete(index);
      else selectedIds.add(index);
      return { ...s, selectedIds };
    });
  }

  function selectAll() {
    setState(s => ({
      ...s,
      selectedIds: new Set(s.tasks.map((_, i) => i)),
    }));
  }

  function addSelected() {
    state.tasks.forEach((task, i) => {
      if (state.selectedIds.has(i)) {
        onAddTodo(task.title, task.category as Category);
      }
    });
    clearFiles();
  }

  return { ...state, setFiles, clearFiles, analyze, toggleTask, selectAll, addSelected };
}
