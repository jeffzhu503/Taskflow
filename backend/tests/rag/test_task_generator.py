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
