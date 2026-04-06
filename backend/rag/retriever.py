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
