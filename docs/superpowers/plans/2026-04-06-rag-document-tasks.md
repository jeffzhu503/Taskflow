# RAG Document-to-Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Documents panel to Taskflow where users pick Word/PDF/text files, run them through a RAG pipeline, and add the AI-suggested tasks to their todo list.

**Architecture:** Browser file picker sends files as multipart to `POST /api/rag/analyze`. FastAPI backend runs each file through extract → chunk → embed (OpenAI) → ChromaDB → retrieve → generate (Claude). Frontend `useDocuments` hook manages state; `DocumentPanel` renders the two-step UI.

**Tech Stack:** Python: `python-docx`, `pypdf`, `tiktoken`, `chromadb`, `openai`, `anthropic`. Frontend: React + TypeScript, Vitest, @testing-library/react.

---

## File Map

**Create (backend):**
- `backend/rag/__init__.py`
- `backend/rag/extractor.py` — text extraction from .docx/.pdf/.txt
- `backend/rag/chunker.py` — 500-token chunks with 50-token overlap
- `backend/rag/embedder.py` — OpenAI text-embedding-3-small
- `backend/rag/retriever.py` — ChromaDB in-memory DocumentStore
- `backend/rag/task_generator.py` — Claude prompt + JSON parsing
- `backend/routers/rag.py` — `POST /api/rag/analyze`
- `backend/tests/__init__.py`
- `backend/tests/rag/__init__.py`
- `backend/tests/routers/__init__.py`
- `backend/tests/conftest.py` — file fixtures
- `backend/tests/rag/test_extractor.py`
- `backend/tests/rag/test_chunker.py`
- `backend/tests/rag/test_embedder.py`
- `backend/tests/rag/test_retriever.py`
- `backend/tests/rag/test_task_generator.py`
- `backend/tests/routers/test_rag.py`
- `backend/pytest.ini`
- `backend/requirements-test.txt`

**Modify (backend):**
- `backend/requirements.txt` — add python-docx, pypdf, chromadb, tiktoken, openai, anthropic
- `backend/config.py` — add openai_api_key, anthropic_api_key, llm_model
- `backend/models.py` — add SuggestedTask, AnalyzeResponse
- `backend/main.py` — register rag router
- `backend/.env.example` — add new keys

**Create (frontend):**
- `src/rag/client.ts` — `analyzeDocuments(files: File[])`
- `src/hooks/useDocuments.ts`
- `src/hooks/useDocuments.test.ts`
- `src/components/DocumentPanel.tsx`
- `src/components/DocumentPanel.test.tsx`
- `src/test/setup.ts` — Vitest + jest-dom setup

**Modify (frontend):**
- `src/types.ts` — add RagTask, AnalyzeResponse
- `src/App.tsx` — add Documents tab
- `vite.config.ts` — add test block
- `package.json` — add test deps + script

---

## Task 1: Python test infrastructure

**Files:**
- Create: `backend/pytest.ini`
- Create: `backend/requirements-test.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/rag/__init__.py`
- Create: `backend/tests/routers/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create pytest.ini**

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

- [ ] **Step 2: Create requirements-test.txt**

```
pytest>=8.0.0
pytest-asyncio>=0.23.0
fpdf2>=2.7.0
```

- [ ] **Step 3: Create package init files**

Create `backend/tests/__init__.py`, `backend/tests/rag/__init__.py`, and `backend/tests/routers/__init__.py` — all empty files.

- [ ] **Step 4: Create conftest.py with file fixtures**

```python
# backend/tests/conftest.py
import io
import pytest
import docx
from fpdf import FPDF


@pytest.fixture()
def docx_bytes() -> bytes:
    doc = docx.Document()
    doc.add_paragraph("Review Q2 budget variance with the finance team.")
    doc.add_paragraph("Schedule follow-up meeting with marketing.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@pytest.fixture()
def pdf_bytes() -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.cell(200, 10, "Review Q2 budget variance with the finance team.")
    pdf.ln()
    pdf.cell(200, 10, "Update headcount projections for H2.")
    return bytes(pdf.output())


@pytest.fixture()
def txt_bytes() -> bytes:
    return b"Review Q2 budget variance.\nUpdate headcount projections."
```

- [ ] **Step 5: Install test dependencies**

```bash
cd backend
pip install -r requirements-test.txt
```

Expected: installs pytest, pytest-asyncio, fpdf2 without errors.

- [ ] **Step 6: Verify pytest is runnable**

```bash
cd backend
pytest --collect-only
```

Expected: `no tests ran` (0 items) with no import errors.

---

## Task 2: Install runtime dependencies + update config and models

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/config.py`
- Modify: `backend/models.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add runtime dependencies to requirements.txt**

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
httpx>=0.27.0
python-dotenv>=1.0.0
pydantic-settings>=2.2.0

# RAG pipeline
python-docx>=1.1.0
pypdf>=4.0.0
chromadb>=0.5.0
tiktoken>=0.7.0
openai>=1.30.0
anthropic>=0.28.0

# OpenTelemetry — traces, metrics, logs → OTLP HTTP
opentelemetry-sdk>=1.25.0
opentelemetry-exporter-otlp-proto-http>=1.25.0
opentelemetry-instrumentation-fastapi>=0.46b0
opentelemetry-instrumentation-httpx>=0.46b0
```

- [ ] **Step 2: Install new packages**

```bash
cd backend
pip install -r requirements.txt
```

Expected: installs without errors.

- [ ] **Step 3: Update config.py**

```python
# backend/config.py
from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    github_pat: str
    openai_api_key: str
    anthropic_api_key: str
    llm_model: str = "claude-sonnet-4-6"
    rag_db_path: str = str(Path.home() / ".taskflow" / "rag-db")

    # OpenTelemetry
    otel_enabled: bool = True
    otel_endpoint: str = "http://localhost:4318"
    otel_service_name: str = "taskflow-backend"

    model_config = {"env_file": str(ENV_FILE)}


settings = Settings()
```

- [ ] **Step 4: Add RAG models to models.py**

Append to the end of `backend/models.py`:

```python
# ── RAG ────────────────────────────────────────────────────────────────────────

class SuggestedTask(BaseModel):
    title: str
    category: Literal["work", "general", "personal", "urgent"]
    source_hint: str
    filename: str


class AnalyzeResponse(BaseModel):
    files_processed: int
    tasks: list[SuggestedTask]
```

- [ ] **Step 5: Update .env.example**

Append to `backend/.env.example`:

```
# RAG pipeline
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-6
# RAG_DB_PATH defaults to C:\Users\<you>\.taskflow\rag-db — override if needed
# RAG_DB_PATH=C:\Users\SDSA\.taskflow\rag-db
```

- [ ] **Step 6: Add OPENAI_API_KEY and ANTHROPIC_API_KEY to your .env**

```
OPENAI_API_KEY=<your key>
ANTHROPIC_API_KEY=<your key>
```

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/requirements-test.txt backend/pytest.ini \
        backend/config.py backend/models.py backend/.env.example \
        backend/tests/__init__.py backend/tests/rag/__init__.py \
        backend/tests/routers/__init__.py backend/tests/conftest.py
git commit -m "feat: add RAG dependencies, config, models, and test infra"
```

---

## Task 3: Text extractor (TDD)

**Files:**
- Create: `backend/rag/__init__.py`
- Create: `backend/rag/extractor.py`
- Test: `backend/tests/rag/test_extractor.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/rag/test_extractor.py
import pytest
from rag.extractor import extract_text


def test_extract_txt(txt_bytes):
    text = extract_text("notes.txt", txt_bytes)
    assert "Review Q2 budget variance" in text


def test_extract_docx(docx_bytes):
    text = extract_text("report.docx", docx_bytes)
    assert "Review Q2 budget variance" in text
    assert "Schedule follow-up" in text


def test_extract_pdf(pdf_bytes):
    text = extract_text("report.pdf", pdf_bytes)
    assert "budget" in text.lower()


def test_extract_unsupported_type():
    with pytest.raises(ValueError, match="Unsupported"):
        extract_text("image.png", b"fake")


def test_extract_empty_docx():
    import io
    import docx
    doc = docx.Document()
    buf = io.BytesIO()
    doc.save(buf)
    text = extract_text("empty.docx", buf.getvalue())
    assert text == ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/rag/test_extractor.py -v
```

Expected: `ModuleNotFoundError: No module named 'rag'`

- [ ] **Step 3: Create rag/__init__.py**

Create `backend/rag/__init__.py` as an empty file.

- [ ] **Step 4: Implement extractor.py**

```python
# backend/rag/extractor.py
import io
from pathlib import Path

import docx
import pypdf

SUPPORTED = {".docx", ".pdf", ".txt"}


def extract_text(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED:
        raise ValueError(f"Unsupported file type: {suffix}. Accepted: .docx, .pdf, .txt")
    if suffix == ".docx":
        return _extract_docx(content)
    if suffix == ".pdf":
        return _extract_pdf(content)
    return content.decode("utf-8", errors="replace")


def _extract_docx(content: bytes) -> str:
    doc = docx.Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _extract_pdf(content: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(content))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append(f"[page {i + 1}]\n{text}")
    return "\n".join(pages)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
pytest tests/rag/test_extractor.py -v
```

Expected: 5 tests PASSED.

- [ ] **Step 6: Commit**

```bash
git add backend/rag/__init__.py backend/rag/extractor.py backend/tests/rag/test_extractor.py
git commit -m "feat: add RAG text extractor for .docx, .pdf, .txt"
```

---

## Task 4: Text chunker (TDD)

**Files:**
- Create: `backend/rag/chunker.py`
- Test: `backend/tests/rag/test_chunker.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/rag/test_chunker.py
from rag.chunker import chunk_text


def test_short_text_is_single_chunk():
    text = "This is a short sentence."
    chunks = chunk_text(text, max_tokens=500, overlap=50)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_long_text_produces_multiple_chunks():
    # ~600 tokens: repeat a sentence enough times
    sentence = "Review the quarterly budget report and prepare a summary for the team. "
    text = sentence * 60  # well over 500 tokens
    chunks = chunk_text(text, max_tokens=500, overlap=50)
    assert len(chunks) >= 2


def test_chunks_have_overlap():
    sentence = "Review the quarterly budget report and prepare a summary for the team. "
    text = sentence * 60
    chunks = chunk_text(text, max_tokens=500, overlap=50)
    # The end of chunk[0] should appear at the start of chunk[1]
    end_of_first = chunks[0][-100:]
    assert end_of_first in chunks[1]


def test_empty_text_returns_empty_list():
    chunks = chunk_text("", max_tokens=500, overlap=50)
    assert chunks == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/rag/test_chunker.py -v
```

Expected: `ModuleNotFoundError: No module named 'rag.chunker'`

- [ ] **Step 3: Implement chunker.py**

```python
# backend/rag/chunker.py
import tiktoken


def chunk_text(text: str, max_tokens: int = 500, overlap: int = 50) -> list[str]:
    if not text.strip():
        return []
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    chunks: list[str] = []
    start = 0
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunks.append(enc.decode(tokens[start:end]))
        if end == len(tokens):
            break
        start += max_tokens - overlap
    return chunks
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
pytest tests/rag/test_chunker.py -v
```

Expected: 4 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/rag/chunker.py backend/tests/rag/test_chunker.py
git commit -m "feat: add RAG text chunker with tiktoken"
```

---

## Task 5: Embedder (TDD)

**Files:**
- Create: `backend/rag/embedder.py`
- Test: `backend/tests/rag/test_embedder.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/rag/test_embedder.py
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from rag.embedder import embed_chunks


@pytest.fixture()
def mock_openai_response():
    embedding = [0.1] * 1536  # text-embedding-3-small dimension
    item = MagicMock()
    item.embedding = embedding
    response = MagicMock()
    response.data = [item, item]
    return response


@pytest.mark.asyncio
async def test_embed_chunks_returns_list_of_embeddings(mock_openai_response):
    with patch("rag.embedder.AsyncOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.embeddings.create = AsyncMock(return_value=mock_openai_response)
        result = await embed_chunks(["chunk one", "chunk two"])
    assert len(result) == 2
    assert len(result[0]) == 1536


@pytest.mark.asyncio
async def test_embed_chunks_uses_correct_model(mock_openai_response):
    with patch("rag.embedder.AsyncOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.embeddings.create = AsyncMock(return_value=mock_openai_response)
        await embed_chunks(["hello"])
        call_kwargs = instance.embeddings.create.call_args.kwargs
    assert call_kwargs["model"] == "text-embedding-3-small"
    assert "hello" in call_kwargs["input"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/rag/test_embedder.py -v
```

Expected: `ModuleNotFoundError: No module named 'rag.embedder'`

- [ ] **Step 3: Implement embedder.py**

```python
# backend/rag/embedder.py
from openai import AsyncOpenAI
from config import settings

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def embed_chunks(chunks: list[str]) -> list[list[float]]:
    response = await _get_client().embeddings.create(
        model="text-embedding-3-small",
        input=chunks,
    )
    return [item.embedding for item in response.data]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
pytest tests/rag/test_embedder.py -v
```

Expected: 2 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/rag/embedder.py backend/tests/rag/test_embedder.py
git commit -m "feat: add RAG embedder with OpenAI text-embedding-3-small"
```

---

## Task 6: Retriever (TDD)

**Files:**
- Create: `backend/rag/retriever.py`
- Test: `backend/tests/rag/test_retriever.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/rag/test_retriever.py
import tempfile
import chromadb
from rag.retriever import DocumentStore


def make_store() -> DocumentStore:
    """Each test gets its own isolated in-memory store."""
    store = DocumentStore.__new__(DocumentStore)
    store._client = chromadb.Client()  # in-memory for tests
    store._seen = set()
    return store


def make_embedding(seed: float, dim: int = 8) -> list[float]:
    """Tiny deterministic embedding for tests."""
    return [seed + i * 0.01 for i in range(dim)]


def test_has_returns_false_before_add():
    store = make_store()
    assert store.has("abc123") is False


def test_has_returns_true_after_add():
    store = make_store()
    store.add_chunks("abc123", ["hello world"], [make_embedding(0.1)])
    assert store.has("abc123") is True


def test_query_returns_relevant_chunks():
    store = make_store()
    chunks = ["Review the Q2 budget.", "Schedule team standup."]
    embeddings = [make_embedding(0.1), make_embedding(0.9)]
    store.add_chunks("file1", chunks, embeddings)
    results = store.query("file1", make_embedding(0.1), top_k=1)
    assert results[0] == "Review the Q2 budget."


def test_query_on_unknown_hash_returns_empty():
    store = make_store()
    results = store.query("nonexistent", make_embedding(0.5), top_k=5)
    assert results == []


def test_add_same_hash_twice_does_not_duplicate():
    store = make_store()
    store.add_chunks("dup", ["only once"], [make_embedding(0.5)])
    store.add_chunks("dup", ["only once"], [make_embedding(0.5)])
    results = store.query("dup", make_embedding(0.5), top_k=10)
    assert len(results) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/rag/test_retriever.py -v
```

Expected: `ModuleNotFoundError: No module named 'rag.retriever'`

- [ ] **Step 3: Implement retriever.py**

```python
# backend/rag/retriever.py
import chromadb
from dataclasses import dataclass, field
from pathlib import Path
from config import settings


@dataclass
class DocumentStore:
    _client: chromadb.PersistentClient = field(
        default_factory=lambda: chromadb.PersistentClient(
            path=str(Path(settings.rag_db_path))
        )
    )
    _seen: set[str] = field(default_factory=set)

    def _collection(self, file_hash: str) -> chromadb.Collection:
        # ChromaDB collection names: alphanumeric + hyphens, 3-63 chars
        name = f"d{file_hash[:31]}"
        return self._client.get_or_create_collection(name=name)

    def add_chunks(
        self,
        file_hash: str,
        chunks: list[str],
        embeddings: list[list[float]],
    ) -> None:
        if file_hash in self._seen:
            return
        col = self._collection(file_hash)
        col.add(
            documents=chunks,
            embeddings=embeddings,
            ids=[f"{file_hash[:8]}-{i}" for i in range(len(chunks))],
        )
        self._seen.add(file_hash)

    def query(
        self,
        file_hash: str,
        query_embedding: list[float],
        top_k: int = 10,
    ) -> list[str]:
        if not self.has(file_hash):
            return []
        col = self._collection(file_hash)
        count = col.count()
        if count == 0:
            return []
        results = col.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, count),
        )
        return results["documents"][0] if results["documents"] else []

    def has(self, file_hash: str) -> bool:
        return file_hash in self._seen


# Module-level singleton used by the router.
# On first import, creates ~/.taskflow/rag-db/ if it doesn't exist.
store = DocumentStore()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
pytest tests/rag/test_retriever.py -v
```

Expected: 5 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/rag/retriever.py backend/tests/rag/test_retriever.py
git commit -m "feat: add RAG ChromaDB retriever with in-memory DocumentStore"
```

---

## Task 7: Task generator (TDD)

**Files:**
- Create: `backend/rag/task_generator.py`
- Test: `backend/tests/rag/test_task_generator.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/rag/test_task_generator.py
import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from rag.task_generator import generate_tasks


def make_response(text: str) -> MagicMock:
    content_block = MagicMock()
    content_block.text = text
    msg = MagicMock()
    msg.content = [content_block]
    return msg


VALID_JSON = json.dumps([
    {"title": "Review budget", "category": "work", "source_hint": "from page 1"},
])


@pytest.mark.asyncio
async def test_generate_tasks_returns_task_list():
    with patch("rag.task_generator.anthropic.AsyncAnthropic") as MockClient:
        instance = MockClient.return_value
        instance.messages.create = AsyncMock(return_value=make_response(VALID_JSON))
        tasks = await generate_tasks(["Budget review needed."], "report.docx")
    assert len(tasks) == 1
    assert tasks[0]["title"] == "Review budget"
    assert tasks[0]["category"] == "work"


@pytest.mark.asyncio
async def test_generate_tasks_retries_on_malformed_json():
    bad = "not json at all"
    with patch("rag.task_generator.anthropic.AsyncAnthropic") as MockClient:
        instance = MockClient.return_value
        instance.messages.create = AsyncMock(return_value=make_response(bad))
        with pytest.raises(ValueError, match="malformed JSON"):
            await generate_tasks(["Some content."], "report.docx")
    assert instance.messages.create.call_count == 2


@pytest.mark.asyncio
async def test_generate_tasks_uses_configured_model():
    with patch("rag.task_generator.anthropic.AsyncAnthropic") as MockClient, \
         patch("rag.task_generator.settings") as mock_settings:
        mock_settings.anthropic_api_key = "test-key"
        mock_settings.llm_model = "claude-haiku-4-5-20251001"
        instance = MockClient.return_value
        instance.messages.create = AsyncMock(return_value=make_response(VALID_JSON))
        await generate_tasks(["content"], "doc.docx")
        call_kwargs = instance.messages.create.call_args.kwargs
    assert call_kwargs["model"] == "claude-haiku-4-5-20251001"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/rag/test_task_generator.py -v
```

Expected: `ModuleNotFoundError: No module named 'rag.task_generator'`

- [ ] **Step 3: Implement task_generator.py**

```python
# backend/rag/task_generator.py
import json
import anthropic
from config import settings

SYSTEM_PROMPT = (
    "You are a task extraction assistant. Given excerpts from a work document, "
    "identify concrete, actionable tasks implied by the content. "
    'Return a JSON array of objects with keys: title (string), '
    'category ("work"|"general"|"personal"|"urgent"), '
    'source_hint (brief location like "from page 3" or "from section 2"). '
    "Return only the JSON array, no other text."
)


async def generate_tasks(chunks: list[str], filename: str) -> list[dict]:
    context = "\n\n---\n\n".join(chunks)
    user_msg = f"Document: {filename}\n\n{context}"
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    for attempt in range(2):
        message = await client.messages.create(
            model=settings.llm_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = message.content[0].text
        try:
            tasks = json.loads(raw)
            if isinstance(tasks, list):
                return tasks
        except (json.JSONDecodeError, IndexError):
            if attempt == 1:
                raise ValueError(f"LLM returned malformed JSON after 2 attempts: {raw[:200]}")

    return []
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
pytest tests/rag/test_task_generator.py -v
```

Expected: 3 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/rag/task_generator.py backend/tests/rag/test_task_generator.py
git commit -m "feat: add RAG task generator with Claude + retry on malformed JSON"
```

---

## Task 8: RAG router + wire into main.py (TDD)

**Files:**
- Create: `backend/routers/rag.py`
- Modify: `backend/main.py`
- Test: `backend/tests/routers/test_rag.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/routers/test_rag.py
import io
import json
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from main import app
    return TestClient(app)


MOCK_EMBEDDINGS = [[0.1] * 10]
MOCK_TASKS = [{"title": "Review budget", "category": "work", "source_hint": "from page 1"}]


def test_analyze_txt_file(client, txt_bytes):
    with patch("routers.rag.embed_chunks", new=AsyncMock(return_value=MOCK_EMBEDDINGS)), \
         patch("routers.rag.generate_tasks", new=AsyncMock(return_value=MOCK_TASKS)):
        response = client.post(
            "/api/rag/analyze",
            files=[("files", ("notes.txt", io.BytesIO(txt_bytes), "text/plain"))],
        )
    assert response.status_code == 200
    data = response.json()
    assert data["files_processed"] == 1
    assert data["tasks"][0]["title"] == "Review budget"
    assert data["tasks"][0]["filename"] == "notes.txt"


def test_analyze_docx_file(client, docx_bytes):
    with patch("routers.rag.embed_chunks", new=AsyncMock(return_value=MOCK_EMBEDDINGS)), \
         patch("routers.rag.generate_tasks", new=AsyncMock(return_value=MOCK_TASKS)):
        response = client.post(
            "/api/rag/analyze",
            files=[("files", ("report.docx", io.BytesIO(docx_bytes),
                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))],
        )
    assert response.status_code == 200
    assert response.json()["files_processed"] == 1


def test_analyze_rejects_unsupported_type(client):
    response = client.post(
        "/api/rag/analyze",
        files=[("files", ("image.png", io.BytesIO(b"fake"), "image/png"))],
    )
    assert response.status_code == 400
    assert ".png" in response.json()["detail"]


def test_analyze_rejects_oversized_file(client):
    big = b"x" * (51 * 1024 * 1024)  # 51 MB
    response = client.post(
        "/api/rag/analyze",
        files=[("files", ("big.txt", io.BytesIO(big), "text/plain"))],
    )
    assert response.status_code == 413


def test_analyze_multi_file(client, txt_bytes, docx_bytes):
    with patch("routers.rag.embed_chunks", new=AsyncMock(return_value=MOCK_EMBEDDINGS)), \
         patch("routers.rag.generate_tasks", new=AsyncMock(return_value=MOCK_TASKS)):
        response = client.post(
            "/api/rag/analyze",
            files=[
                ("files", ("a.txt", io.BytesIO(txt_bytes), "text/plain")),
                ("files", ("b.docx", io.BytesIO(docx_bytes),
                           "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
            ],
        )
    assert response.status_code == 200
    assert response.json()["files_processed"] == 2
    filenames = [t["filename"] for t in response.json()["tasks"]]
    assert "a.txt" in filenames
    assert "b.docx" in filenames
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/routers/test_rag.py -v
```

Expected: import errors or 404 responses.

- [ ] **Step 3: Implement routers/rag.py**

```python
# backend/routers/rag.py
import hashlib
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from models import AnalyzeResponse, SuggestedTask
from rag.chunker import chunk_text
from rag.embedder import embed_chunks
from rag.extractor import extract_text
from rag.retriever import store
from rag.task_generator import generate_tasks

SUPPORTED = {".docx", ".pdf", ".txt"}
MAX_BYTES = 50 * 1024 * 1024  # 50 MB
TASK_QUERY = (
    "What are the action items, tasks, deadlines, and responsibilities "
    "mentioned in this document?"
)

router = APIRouter()


@router.post("/rag/analyze", response_model=AnalyzeResponse)
async def analyze_documents(
    files: Annotated[list[UploadFile], File()],
) -> AnalyzeResponse:
    all_tasks: list[SuggestedTask] = []

    for upload in files:
        filename = upload.filename or "unknown"
        suffix = Path(filename).suffix.lower()
        if suffix not in SUPPORTED:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {suffix}. Accepted: .docx, .pdf, .txt",
            )

        content = await upload.read()
        if len(content) > MAX_BYTES:
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB per file",
            )

        try:
            text = extract_text(filename, content)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        if not text.strip():
            continue

        file_hash = hashlib.sha256(content).hexdigest()
        chunks = chunk_text(text)

        if not store.has(file_hash):
            embeddings = await embed_chunks(chunks)
            store.add_chunks(file_hash, chunks, embeddings)

        query_emb = (await embed_chunks([TASK_QUERY]))[0]
        relevant = store.query(file_hash, query_emb, top_k=10)

        try:
            raw_tasks = await generate_tasks(relevant, filename)
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Task generation failed: {exc}"
            ) from exc

        for t in raw_tasks:
            all_tasks.append(
                SuggestedTask(
                    title=t.get("title", ""),
                    category=t.get("category", "work"),
                    source_hint=t.get("source_hint", ""),
                    filename=filename,
                )
            )

    return AnalyzeResponse(files_processed=len(files), tasks=all_tasks)
```

- [ ] **Step 4: Register the router in main.py**

Add to `backend/main.py` — insert after the existing router imports:

```python
from routers import repo, issues, pulls, labels, rag   # add rag here
```

And add after the existing `app.include_router` calls:

```python
app.include_router(rag.router, prefix="/api")
```

- [ ] **Step 5: Run all backend tests**

```bash
cd backend
pytest -v
```

Expected: all tests PASSED (no failures).

- [ ] **Step 6: Commit**

```bash
git add backend/routers/rag.py backend/main.py backend/tests/routers/test_rag.py
git commit -m "feat: add POST /api/rag/analyze router with multi-file pipeline"
```

---

## Task 9: Frontend test setup (Vitest)

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install Vitest and Testing Library**

```bash
npm install --save-dev vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Add test script to package.json**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Taskflow/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Create src/test/setup.ts**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Verify the test runner works**

```bash
npm test
```

Expected: `No test files found` — exits 0 (or prints a warning but no error).

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.ts src/test/setup.ts
git commit -m "chore: add Vitest + React Testing Library test setup"
```

---

## Task 10: Frontend types and RAG client

**Files:**
- Modify: `src/types.ts`
- Create: `src/rag/client.ts`

- [ ] **Step 1: Add RAG types to src/types.ts**

Append to the end of `src/types.ts`:

```typescript
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
```

- [ ] **Step 2: Create src/rag/client.ts**

```typescript
import { BACKEND_BASE_URL } from '../github/config';
import type { AnalyzeResponse } from '../types';

export async function analyzeDocuments(files: File[]): Promise<AnalyzeResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }
  const resp = await fetch(`${BACKEND_BASE_URL}/api/rag/analyze`, {
    method: 'POST',
    body: form,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(String(err.detail ?? resp.statusText));
  }
  return resp.json() as Promise<AnalyzeResponse>;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/rag/client.ts
git commit -m "feat: add RAG types and analyzeDocuments API client"
```

---

## Task 11: useDocuments hook (TDD)

**Files:**
- Create: `src/hooks/useDocuments.ts`
- Test: `src/hooks/useDocuments.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/hooks/useDocuments.test.ts
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDocuments } from './useDocuments';
import * as client from '../rag/client';

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: `Cannot find module './useDocuments'`

- [ ] **Step 3: Implement useDocuments.ts**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 7 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDocuments.ts src/hooks/useDocuments.test.ts src/rag/client.ts src/types.ts
git commit -m "feat: add useDocuments hook with file selection, analysis, and task management"
```

---

## Task 12: DocumentPanel component (TDD)

**Files:**
- Create: `src/components/DocumentPanel.tsx`
- Test: `src/components/DocumentPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: `Cannot find module './DocumentPanel'`

- [ ] **Step 3: Implement DocumentPanel.tsx**

```tsx
// src/components/DocumentPanel.tsx
import { useEffect, useRef } from 'react';
import type { Category } from '../types';
import { useDocuments } from '../hooks/useDocuments';

interface Props {
  onAddTodo: (text: string, cat: Category) => void;
}

export function DocumentPanel({ onAddTodo }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const {
    files, loading, tasks, selectedIds, error,
    setFiles, analyze, toggleTask, selectAll, addSelected,
  } = useDocuments(onAddTodo);

  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(e.target.files);
  }

  const byFile = tasks.reduce<Record<string, { task: typeof tasks[number]; index: number }[]>>(
    (acc, task, i) => {
      (acc[task.filename] ??= []).push({ task, index: i });
      return acc;
    },
    {},
  );

  return (
    <div className="document-panel">
      <input ref={fileInputRef} type="file" accept=".docx,.pdf,.txt" multiple
        style={{ display: 'none' }} onChange={handleChange} />
      <input ref={folderInputRef} type="file"
        style={{ display: 'none' }} onChange={handleChange} />

      {tasks.length === 0 && !loading && (
        <>
          <div className="doc-picker-buttons">
            <button onClick={() => fileInputRef.current?.click()}>Choose file</button>
            <button onClick={() => folderInputRef.current?.click()}>Choose folder</button>
          </div>
          <p className="doc-hint">Accepted: .docx, .pdf, .txt</p>

          {files.length > 0 ? (
            <>
              <ul className="doc-file-list">
                {files.map(f => <li key={f.name}>{f.name}</li>)}
              </ul>
              <button onClick={analyze}>
                Analyze {files.length} file{files.length !== 1 ? 's' : ''}
              </button>
            </>
          ) : (
            <p className="doc-empty">No document selected yet</p>
          )}

          {error && <p className="doc-error">{error}</p>}
        </>
      )}

      {loading && (
        <p>Analyzing {files.length} file{files.length !== 1 ? 's' : ''}…</p>
      )}

      {tasks.length > 0 && (
        <>
          <div className="doc-results-header">
            <span>{tasks.length} tasks from {Object.keys(byFile).length} file(s)</span>
            <button onClick={selectAll}>Select all</button>
          </div>

          {Object.entries(byFile).map(([filename, items]) => (
            <div key={filename} className="doc-file-group">
              <h4 className="doc-file-name">{filename}</h4>
              {items.map(({ task, index }) => (
                <label key={index} className="doc-task-row">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(index)}
                    onChange={() => toggleTask(index)}
                  />
                  <div>
                    <div>{task.title}</div>
                    <small>{task.category} · {task.source_hint}</small>
                  </div>
                </label>
              ))}
            </div>
          ))}

          <button
            onClick={addSelected}
            disabled={selectedIds.size === 0}
          >
            Add {selectedIds.size} selected task{selectedIds.size !== 1 ? 's' : ''} to Todos
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add src/components/DocumentPanel.tsx src/components/DocumentPanel.test.tsx
git commit -m "feat: add DocumentPanel component with file picker and task checklist"
```

---

## Task 13: Wire Documents tab into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update AppView type and import DocumentPanel**

In `src/App.tsx`, change:

```typescript
// Change this line:
type AppView = 'todos' | 'github';

// To:
type AppView = 'todos' | 'github' | 'documents';
```

Add the import after the existing GitHubPanel import:

```typescript
import { DocumentPanel } from './components/DocumentPanel';
```

- [ ] **Step 2: Add Documents tab button**

In the `<div className="view-tabs">` block, add a third button after the GitHub button:

```tsx
<button
  className={`view-tab${view === 'documents' ? ' active' : ''}`}
  onClick={() => setView('documents')}
>
  Documents
</button>
```

- [ ] **Step 3: Add Documents view render**

After the `{view === 'github' && ...}` block, add:

```tsx
{view === 'documents' && (
  <DocumentPanel onAddTodo={(text, cat) => { addTodo(text, cat); setView('todos'); }} />
)}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npm run build
```

Expected: no TypeScript errors, bundle produced in `dist/`.

- [ ] **Step 5: Run all frontend tests**

```bash
npm test
```

Expected: all tests PASSED.

- [ ] **Step 6: Manual smoke test**

```bash
# Terminal 1
cd backend && uvicorn main:app --reload

# Terminal 2
npm run dev
```

Open http://localhost:5173/Taskflow/ → click "Documents" tab → pick a .docx or .pdf file → click "Analyze" → verify tasks appear → select a few → click "Add selected tasks" → verify they appear in the Todos view.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Documents tab into App — completes RAG document-to-tasks feature"
```

---

## Self-Review Notes

- All 13 tasks in the spec's backend checklist are covered (extractor, chunker, embedder, retriever, task_generator, router, config, models, main, requirements, .env.example).
- All 4 tasks in the frontend checklist are covered (client, hook, panel, App.tsx types).
- All 6 test files from the spec are created (test_extractor, test_chunker, test_task_generator, test_rag router, useDocuments.test, DocumentPanel.test).
- File picker: both `<input type="file" multiple>` and `webkitdirectory` are implemented in DocumentPanel.
- Error scenarios: 400 (bad type), 413 (too large), 500 (API failure) all handled in router and tested.
- `SuggestedTask.category` uses `Literal` in Python and `Category` in TypeScript — both align to `"work"|"general"|"personal"|"urgent"`.
- `useDocuments.addSelected` navigates to todos view via callback in App.tsx.
