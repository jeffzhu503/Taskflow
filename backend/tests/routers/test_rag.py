# backend/tests/routers/test_rag.py
import io
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
