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
