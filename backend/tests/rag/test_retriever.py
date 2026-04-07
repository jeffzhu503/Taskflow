# backend/tests/rag/test_retriever.py
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
