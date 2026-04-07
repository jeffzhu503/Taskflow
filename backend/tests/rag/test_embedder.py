from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from rag import embedder


@pytest.fixture()
def mock_openai_response():
    embedding = [0.1] * 1536  # text-embedding-3-small dimension
    item = MagicMock()
    item.embedding = embedding
    response = MagicMock()
    response.data = [item, item]
    return response


@pytest.fixture(autouse=True)
def reset_client():
    """Reset the global client before each test."""
    embedder._client = None
    yield
    embedder._client = None


@pytest.mark.asyncio
async def test_embed_chunks_returns_list_of_embeddings(mock_openai_response):
    with patch("rag.embedder.AsyncOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.embeddings.create = AsyncMock(return_value=mock_openai_response)
        result = await embedder.embed_chunks(["chunk one", "chunk two"])
    assert len(result) == 2
    assert len(result[0]) == 1536


@pytest.mark.asyncio
async def test_embed_chunks_uses_correct_model(mock_openai_response):
    with patch("rag.embedder.AsyncOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.embeddings.create = AsyncMock(return_value=mock_openai_response)
        await embedder.embed_chunks(["hello"])
        call_kwargs = instance.embeddings.create.call_args.kwargs
    assert call_kwargs["model"] == "text-embedding-3-small"
    assert "hello" in call_kwargs["input"]
