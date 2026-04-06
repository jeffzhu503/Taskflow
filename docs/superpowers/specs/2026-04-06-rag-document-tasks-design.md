# RAG Document-to-Tasks Feature — Design Spec

**Date:** 2026-04-06  
**Status:** Approved

---

## Overview

Add a Documents panel to Taskflow that lets users point at a Word or PDF file on their Windows PC, runs it through a RAG pipeline (extract → chunk → embed → retrieve → generate), and returns a list of AI-suggested tasks. The user selects which tasks to add to their existing Taskflow todo list.

---

## Scope

**In scope:**
- On-demand single-file analysis (`.docx`, `.pdf`, `.txt`)
- Browser native file picker (`<input type="file">`) — opens standard Windows "Open" dialog
- Light RAG pipeline via ChromaDB + OpenAI embeddings + Claude/GPT-4o generation
- Suggested task list with checkboxes, one-click add to todos
- New "Documents" tab in the Taskflow nav

**Out of scope (Phase 2):**
- Background folder watching / continuous indexing
- Multi-file batch analysis
- Semantic search across indexed documents

---

## Architecture

### Data Flow

```
User clicks "Choose file" (Documents panel)
  → browser <input type="file"> opens Windows "Open" dialog
  → user picks .docx / .pdf / .txt
  → useDocuments hook reads File object (name + bytes)
  → POST /api/rag/analyze  multipart/form-data  { file: <bytes> }
  → Backend pipeline:
      ① Extract text       (python-docx / pypdf / plain text)
      ② Chunk text         (500-token chunks, 50-token overlap)
      ③ Embed chunks       (OpenAI text-embedding-3-small)
      ④ Store in ChromaDB  (in-memory, keyed by SHA-256 of file bytes)
      ⑤ Retrieve top chunks (task-extraction similarity query)
      ⑥ Generate tasks     (Claude claude-sonnet-4-6 or GPT-4o)
  → Returns { filename, tasks: [{ title, category, source_hint }] }
  → DocumentPanel renders checkboxes
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
| `backend/models.py` | Add `SuggestedTask`, `AnalyzeResponse` (request uses FastAPI `UploadFile`, no Pydantic model needed) |
| `backend/main.py` | Register `rag` router under `/api` |
| `backend/requirements.txt` | Add `python-docx`, `pypdf`, `chromadb`, `tiktoken`, `openai` |

### API contract

```
POST /api/rag/analyze
Content-Type: multipart/form-data

Request:
  file: <binary file upload>   (.docx, .pdf, or .txt — max 50MB)

Response 200:
{
  "filename": "Q2-report.docx",
  "tasks": [
    { "title": "Review Q2 budget variance with finance team", "category": "work", "source_hint": "from page 3" },
    { "title": "Update headcount projections for H2", "category": "work", "source_hint": "from page 5" }
  ]
}

Response 400: { "detail": "Unsupported file type. Accepted: .docx, .pdf, .txt" }
Response 413: { "detail": "File too large. Maximum size is 50MB" }
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
| `src/rag/client.ts` | `analyzeDocument(file: File): Promise<AnalyzeResponse>` — POST /api/rag/analyze as multipart |
| `src/hooks/useDocuments.ts` | State: `file`, `loading`, `tasks`, `error`, `selectedIds`; actions: `analyze()`, `toggleTask()`, `addSelected()` |
| `src/components/DocumentPanel.tsx` | Renders `<input type="file">` picker + Analyze button; loading spinner; task checklist; "Add N selected tasks" button |

### Modified files

| File | Change |
|------|--------|
| `src/App.tsx` | Add "Documents" tab; toggle `<DocumentPanel />` alongside existing todos/github views |
| `src/types.ts` | Add `RagTask`, `AnalyzeResponse` types (mirrors backend models) |

### File picker

Uses the browser's built-in `<input type="file" accept=".docx,.pdf,.txt">`. On Windows this opens the standard Windows "Open" dialog — no Electron or native integration needed. The selected file is held as a browser `File` object and uploaded as multipart to the backend; the full file path is never needed.

### Component states

1. **Empty** — "Choose file" button, accepted formats label, placeholder message
2. **Loading** — spinner, path shown, button disabled
3. **Results** — task list with checkboxes, source hints, "Add N selected tasks" button, "Select all" toggle
4. **Error** — inline error message, path retained for retry

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
