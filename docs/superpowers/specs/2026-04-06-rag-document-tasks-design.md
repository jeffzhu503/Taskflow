# RAG Document-to-Tasks Feature — Design Spec

**Date:** 2026-04-06  
**Status:** Approved

---

## Overview

Add a Documents panel to Taskflow that lets users point at a Word or PDF file on their Windows PC, runs it through a RAG pipeline (extract → chunk → embed → retrieve → generate), and returns a list of AI-suggested tasks. The user selects which tasks to add to their existing Taskflow todo list.

---

## Scope

**In scope:**
- On-demand file analysis (`.docx`, `.pdf`, `.txt`) — single file or entire folder
- Browser native file picker: "Choose file" (`<input type="file">`) and "Choose folder" (`<input type="file" webkitdirectory>`)
- Multi-file pipeline: each file runs through RAG independently, task lists merged into one result
- Light RAG pipeline via ChromaDB + OpenAI embeddings + Claude/GPT-4o generation
- Suggested task list with checkboxes grouped by source file, one-click add to todos
- New "Documents" tab in the Taskflow nav

**Out of scope (Phase 2):**
- Background folder watching / continuous indexing
- Semantic search across indexed documents

---

## Architecture

### Data Flow

```
User clicks "Choose file" or "Choose folder" (Documents panel)
  → browser picker opens Windows dialog
  → user picks one .docx/.pdf/.txt  OR  a folder (all supported files collected recursively)
  → useDocuments hook holds File[] array
  → POST /api/rag/analyze  multipart/form-data  { files: <file[]> }
  → Backend — for each file:
      ① Extract text       (python-docx / pypdf / plain text)
      ② Chunk text         (500-token chunks, 50-token overlap)
      ③ Embed chunks       (OpenAI text-embedding-3-small)
      ④ Store in ChromaDB  (in-memory, keyed by SHA-256 of file bytes)
      ⑤ Retrieve top chunks (task-extraction similarity query)
      ⑥ Generate tasks     (Claude claude-sonnet-4-6 or GPT-4o)
  → Merge task lists across all files
  → Returns { files_processed: number, tasks: [{ title, category, source_hint, filename }] }
  → DocumentPanel renders checkboxes grouped by filename
  → User selects → useTodos.addTodo() for each
```

### Why Light RAG (not direct LLM)?

Chunking + retrieval handles real-world document sizes that exceed LLM context windows. ChromaDB in-memory per-session is zero-infrastructure. The cache (keyed by file hash) means re-analyzing the same file skips re-embedding.

---

## Backend

### New files

| File | Responsibility |
|------|---------------|
| `backend/rag/__init__.py` | Package marker |
| `backend/rag/extractor.py` | Read `.docx` (python-docx), `.pdf` (pypdf), `.txt` → raw text string |
| `backend/rag/chunker.py` | Split text into 500-token chunks with 50-token overlap using `tiktoken` |
| `backend/rag/embedder.py` | Batch embed chunks via `openai.embeddings.create(model="text-embedding-3-small")` |
| `backend/rag/retriever.py` | ChromaDB in-memory collection; `add_chunks()`, `query(text, top_k)` |
| `backend/rag/task_generator.py` | Build prompt from retrieved chunks; call Claude/GPT-4o; parse JSON task list |
| `backend/routers/rag.py` | `POST /api/rag/analyze` — orchestrates the pipeline |

### Modified files

| File | Change |
|------|--------|
| `backend/config.py` | Add `OPENAI_API_KEY: str` and `LLM_MODEL: str = "claude-sonnet-4-6"` |
| `backend/models.py` | Add `SuggestedTask` (includes `filename` field), `AnalyzeResponse` (request uses FastAPI `List[UploadFile]`, no Pydantic model needed) |
| `backend/main.py` | Register `rag` router under `/api` |
| `backend/requirements.txt` | Add `python-docx`, `pypdf`, `chromadb`, `tiktoken`, `openai` |

### API contract

```
POST /api/rag/analyze
Content-Type: multipart/form-data

Request:
  files: <one or more binary file uploads>   (.docx, .pdf, or .txt — max 50MB each)

Response 200:
{
  "files_processed": 2,
  "tasks": [
    { "title": "Review Q2 budget variance with finance team", "category": "work", "source_hint": "from page 3", "filename": "Q2-report.docx" },
    { "title": "Update headcount projections for H2", "category": "work", "source_hint": "from page 5", "filename": "Q2-report.docx" },
    { "title": "Follow up on action items from team sync", "category": "work", "source_hint": "from section 1", "filename": "meeting-notes.docx" }
  ]
}

Response 400: { "detail": "Unsupported file type. Accepted: .docx, .pdf, .txt" }
Response 413: { "detail": "File too large. Maximum size is 50MB per file" }
Response 500: { "detail": "Embedding or generation failed" }
```

### Task generation prompt (system)

```
You are a task extraction assistant. Given excerpts from a work document, identify concrete, actionable tasks implied by the content. Return a JSON array of objects with keys: title (string), category ("work"|"general"|"personal"|"urgent"), source_hint (brief location like "from page 3" or "from section 2"). Return only the JSON array, no other text.
```

---

## Frontend

### New files

| File | Responsibility |
|------|---------------|
| `src/rag/client.ts` | `analyzeDocuments(files: File[]): Promise<AnalyzeResponse>` — POST /api/rag/analyze as multipart |
| `src/hooks/useDocuments.ts` | State: `files`, `loading`, `tasks`, `error`, `selectedIds`; actions: `analyze()`, `toggleTask()`, `addSelected()` |
| `src/components/DocumentPanel.tsx` | Renders "Choose file" + "Choose folder" buttons; file list preview; Analyze button; loading spinner; task checklist grouped by filename; "Add N selected tasks" button |

### Modified files

| File | Change |
|------|--------|
| `src/App.tsx` | Add "Documents" tab; toggle `<DocumentPanel />` alongside existing todos/github views |
| `src/types.ts` | Add `RagTask`, `AnalyzeResponse` types (mirrors backend models) |

### File picker

Two buttons, both using standard browser file inputs — no Electron needed:

| Button | Input attribute | Behaviour |
|--------|----------------|-----------|
| "Choose file" | `<input type="file" accept=".docx,.pdf,.txt" multiple>` | Windows "Open" dialog; one or more files |
| "Choose folder" | `<input type="file" webkitdirectory>` | Windows folder picker; all supported files inside collected recursively |

Both yield a `FileList` of `File` objects. Unsupported file types inside a folder are silently skipped client-side before upload.

### Component states

1. **Empty** — "Choose file" + "Choose folder" buttons, accepted formats label, placeholder message
2. **Files selected** — list of selected filenames with count (e.g. "3 files selected"), Analyze button enabled
3. **Loading** — progress indicator ("Analyzing 3 files…"), buttons disabled
4. **Results** — task list with checkboxes grouped by filename, "Add N selected tasks" button, "Select all" toggle
5. **Error** — inline error message, file selection retained for retry

---

## Configuration

Add to `backend/.env.example`:
```
OPENAI_API_KEY=sk-...
LLM_MODEL=claude-sonnet-4-6
```

`LLM_MODEL` controls which model is used for task generation. The embeddings model is always `text-embedding-3-small` (OpenAI).

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Unsupported file type | 400 with list of supported types |
| File too large (>50MB) | 413 with size limit message |
| OpenAI API failure | 500, surface error in UI |
| LLM returns malformed JSON | Retry once, then 500 |
| Empty document | Return empty task list with a message |

---

## Testing

- `backend/tests/rag/test_extractor.py` — fixture .docx and .pdf files; assert text extraction
- `backend/tests/rag/test_chunker.py` — assert chunk count and overlap for known inputs
- `backend/tests/rag/test_task_generator.py` — mock OpenAI calls; assert JSON parsing and fallback
- `backend/tests/routers/test_rag.py` — integration test for `POST /api/rag/analyze` with a fixture file
- `src/hooks/useDocuments.test.ts` — mock `analyzeDocument`; assert state transitions (loading → results, error)
- `src/components/DocumentPanel.test.tsx` — assert checkbox selection and "Add selected" calls `addTodo`

---

## Phase 2 Notes (not in scope now)

When background indexing is added later:
- `retriever.py` already abstracts ChromaDB — swap in-memory for persistent storage by changing one line
- Add a `FileWatcher` service using `watchdog` (Python) to trigger re-indexing on file change
- Add `GET /api/rag/status` to show indexed file count and last-updated timestamps
