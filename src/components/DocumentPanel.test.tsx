// src/components/DocumentPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentPanel } from './DocumentPanel';
import * as useDocumentsModule from '../hooks/useDocuments';
import type { RagTask } from '../types';

vi.mock('../hooks/useDocuments');

const mockAddTodo = vi.fn();

type HookReturn = ReturnType<typeof useDocumentsModule.useDocuments>;

function mockHook(overrides: Partial<HookReturn> = {}) {
  vi.mocked(useDocumentsModule.useDocuments).mockReturnValue({
    files: [],
    loading: false,
    tasks: [],
    selectedIds: new Set(),
    error: null,
    setFiles: vi.fn(),
    analyze: vi.fn(),
    toggleTask: vi.fn(),
    selectAll: vi.fn(),
    addSelected: vi.fn(),
    clearFiles: vi.fn(),
    ...overrides,
  } as HookReturn);
}

describe('DocumentPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Choose file and Choose folder buttons when empty', () => {
    mockHook();
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    expect(screen.getByText('Choose file')).toBeInTheDocument();
    expect(screen.getByText('Choose folder')).toBeInTheDocument();
  });

  it('shows file list and Analyze button when files are selected', () => {
    mockHook({ files: [new File(['x'], 'report.docx')] });
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    expect(screen.getByText('report.docx')).toBeInTheDocument();
    expect(screen.getByText(/Analyze 1 file/)).toBeInTheDocument();
  });

  it('calls analyze when Analyze button is clicked', () => {
    const analyze = vi.fn();
    mockHook({ files: [new File(['x'], 'report.docx')], analyze });
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    fireEvent.click(screen.getByText(/Analyze 1 file/));
    expect(analyze).toHaveBeenCalled();
  });

  it('shows loading text while analyzing', () => {
    mockHook({ loading: true, files: [new File(['x'], 'report.docx')] });
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    expect(screen.getByText(/Analyzing 1 file/)).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    mockHook({ error: 'API down' });
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    expect(screen.getByText('API down')).toBeInTheDocument();
  });

  it('renders task list grouped by filename', () => {
    const tasks: RagTask[] = [
      { title: 'Review budget', category: 'work', source_hint: 'page 1', filename: 'Q2.docx' },
      { title: 'Update forecast', category: 'work', source_hint: 'page 2', filename: 'Q2.docx' },
    ];
    mockHook({ tasks, selectedIds: new Set([0, 1]) });
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    expect(screen.getByText('Q2.docx')).toBeInTheDocument();
    expect(screen.getByText('Review budget')).toBeInTheDocument();
    expect(screen.getByText('Update forecast')).toBeInTheDocument();
  });

  it('calls addSelected when Add button is clicked', () => {
    const addSelected = vi.fn();
    const tasks: RagTask[] = [
      { title: 'Review budget', category: 'work', source_hint: 'p1', filename: 'f.docx' },
    ];
    mockHook({ tasks, selectedIds: new Set([0]), addSelected });
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    fireEvent.click(screen.getByText(/Add 1 selected task/));
    expect(addSelected).toHaveBeenCalled();
  });

  it('calls selectAll when Select all is clicked', () => {
    const selectAll = vi.fn();
    const tasks: RagTask[] = [
      { title: 'T1', category: 'work', source_hint: 'p1', filename: 'f.docx' },
    ];
    mockHook({ tasks, selectedIds: new Set(), selectAll });
    render(<DocumentPanel onAddTodo={mockAddTodo} />);
    fireEvent.click(screen.getByText('Select all'));
    expect(selectAll).toHaveBeenCalled();
  });
});
