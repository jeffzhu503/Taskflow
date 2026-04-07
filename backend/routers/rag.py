# backend/routers/rag.py
import hashlib
import logging
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from models import AnalyzeResponse, SuggestedTask
from rag.chunker import chunk_text
from rag.embedder import embed_chunks
from rag.extractor import extract_text
from rag.retriever import store
from rag.task_generator import generate_tasks

logger = logging.getLogger(__name__)

SUPPORTED = {".docx", ".pdf", ".txt"}
MAX_BYTES = 50 * 1024 * 1024  # 50 MB
TASK_QUERY = (
    "What are the action items, tasks, deadlines, and responsibilities "
    "mentioned in this document?"
)
VALID_CATEGORIES = {"work", "general", "personal", "urgent"}

_task_query_embedding: list[float] | None = None


async def _get_task_query_embedding() -> list[float]:
    global _task_query_embedding
    if _task_query_embedding is None:
        _task_query_embedding = (await embed_chunks([TASK_QUERY]))[0]
    return _task_query_embedding

router = APIRouter()


@router.post("/rag/analyze", response_model=AnalyzeResponse)
async def analyze_documents(
    files: Annotated[list[UploadFile], File()],
) -> AnalyzeResponse:
    all_tasks: list[SuggestedTask] = []
    processed_count = 0

    for upload in files:
        filename = upload.filename or "unknown"
        suffix = Path(filename).suffix.lower()
        if suffix not in SUPPORTED:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {suffix}. Accepted: .docx, .pdf, .txt",
            )

        content = await upload.read()
        logger.info("Received file: %s (%d bytes)", filename, len(content))
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

        processed_count += 1
        file_hash = hashlib.sha256(content).hexdigest()
        chunks = chunk_text(text)

        if not store.has(file_hash):
            logger.info("Embedding new file: %s (hash=%s)", filename, file_hash[:8])
            embeddings = await embed_chunks(chunks)
            store.add_chunks(file_hash, chunks, embeddings)
            logger.info("Cached embeddings for %s", filename)

        query_emb = await _get_task_query_embedding()
        relevant = store.query(file_hash, query_emb, top_k=10)

        try:
            raw_tasks = await generate_tasks(relevant, filename)
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Task generation failed: {exc}"
            ) from exc

        logger.info("Generated %d tasks from %s", len(raw_tasks), filename)

        for t in raw_tasks:
            cat = t.get("category", "work")
            if cat not in VALID_CATEGORIES:
                cat = "general"
            all_tasks.append(
                SuggestedTask(
                    title=t.get("title", ""),
                    category=cat,
                    source_hint=t.get("source_hint", ""),
                    filename=filename,
                )
            )

    return AnalyzeResponse(files_processed=processed_count, tasks=all_tasks)
