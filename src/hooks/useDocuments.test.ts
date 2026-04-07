// src/hooks/useDocuments.test.ts
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDocuments } from './useDocuments';
import * as client from '../rag/client';
import type { Category } from '../types';

vi.mock('../rag/client');

const mockAddTodo = vi.fn();

function makeFile(name: string): File {
  return new File(['content'], name, { type: 'application/octet-stream' });
}

function makeFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  return dt.files;
}

describe('useDocuments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters unsupported files from setFiles', () => {
    const { result } = renderHook(() => useDocuments(mockAddTodo));
    act(() => result.current.setFiles(makeFileList([makeFile('report.docx'), makeFile('image.png')])));
    expect(result.current.files.map(f => f.name)).toEqual(['report.docx']);
  });

  it('transitions to results after analyze', async () => {
    vi.mocked(client.analyzeDocuments).mockResolvedValue({
      files_processed: 1,
      tasks: [{ title: 'Review budget', category: 'work', source_hint: 'page 1', filename: 'report.docx' }],
    });
    const { result } = renderHook(() => useDocuments(mockAddTodo));
    act(() => result.current.setFiles(makeFileList([makeFile('report.docx')])));
    await act(() => result.current.analyze());
    expect(result.current.loading).toBe(false);
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.selectedIds.has(0)).toBe(true);
  });

  it('sets error on analyze failure', async () => {
    vi.mocked(client.analyzeDocuments).mockRejectedValue(new Error('API down'));
    const { result } = renderHook(() => useDocuments(mockAddTodo));
    act(() => result.current.setFiles(makeFileList([makeFile('report.docx')])));
    await act(() => result.current.analyze());
    expect(result.current.error).toBe('API down');
    expect(result.current.loading).toBe(false);
  });

  it('toggleTask deselects a selected task', async () => {
    vi.mocked(client.analyzeDocuments).mockResolvedValue({
      files_processed: 1,
      tasks: [{ title: 'Task 1', category: 'work', source_hint: 'p1', filename: 'f.docx' }],
    });
    const { result } = renderHook(() => useDocuments(mockAddTodo));
    act(() => result.current.setFiles(makeFileList([makeFile('f.docx')])));
    await act(() => result.current.analyze());
    act(() => result.current.toggleTask(0));
    expect(result.current.selectedIds.has(0)).toBe(false);
  });

  it('selectAll selects all tasks', async () => {
    vi.mocked(client.analyzeDocuments).mockResolvedValue({
      files_processed: 1,
      tasks: [
        { title: 'A', category: 'work', source_hint: 'p1', filename: 'f.docx' },
        { title: 'B', category: 'work', source_hint: 'p2', filename: 'f.docx' },
      ],
    });
    const { result } = renderHook(() => useDocuments(mockAddTodo));
    act(() => result.current.setFiles(makeFileList([makeFile('f.docx')])));
    await act(() => result.current.analyze());
    act(() => result.current.toggleTask(0)); // deselect
    act(() => result.current.selectAll());
    expect(result.current.selectedIds.has(0)).toBe(true);
    expect(result.current.selectedIds.has(1)).toBe(true);
  });

  it('addSelected calls onAddTodo for selected tasks then clears state', async () => {
    vi.mocked(client.analyzeDocuments).mockResolvedValue({
      files_processed: 1,
      tasks: [
        { title: 'Task A', category: 'work', source_hint: 'p1', filename: 'f.docx' },
        { title: 'Task B', category: 'general', source_hint: 'p2', filename: 'f.docx' },
      ],
    });
    const { result } = renderHook(() => useDocuments(mockAddTodo));
    act(() => result.current.setFiles(makeFileList([makeFile('f.docx')])));
    await act(() => result.current.analyze());
    act(() => result.current.toggleTask(1)); // deselect index 1
    act(() => result.current.addSelected());
    expect(mockAddTodo).toHaveBeenCalledTimes(1);
    expect(mockAddTodo).toHaveBeenCalledWith('Task A', 'work');
    expect(result.current.tasks).toHaveLength(0);
  });

  it('clearFiles resets state', async () => {
    vi.mocked(client.analyzeDocuments).mockResolvedValue({
      files_processed: 1,
      tasks: [{ title: 'T', category: 'work', source_hint: 'p1', filename: 'f.docx' }],
    });
    const { result } = renderHook(() => useDocuments(mockAddTodo));
    act(() => result.current.setFiles(makeFileList([makeFile('f.docx')])));
    await act(() => result.current.analyze());
    act(() => result.current.clearFiles());
    expect(result.current.files).toHaveLength(0);
    expect(result.current.tasks).toHaveLength(0);
  });
});
