# backend/rag/task_generator.py
import json
import logging
import anthropic
from config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a task extraction assistant. Given excerpts from a work document, "
    "identify concrete, actionable tasks implied by the content. "
    'Return a JSON array of objects with keys: title (string), '
    'category ("work"|"general"|"personal"|"urgent"), '
    'source_hint (brief location like "from page 3" or "from section 2"). '
    "Return only the JSON array, no other text."
)


_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def generate_tasks(chunks: list[str], filename: str) -> list[dict]:
    context = "\n\n---\n\n".join(chunks)
    user_msg = f"Document: {filename}\n\n{context}"
    client = _get_client()

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
            logger.warning("LLM returned malformed JSON on attempt %d for %s", attempt + 1, filename)
            if attempt == 1:
                raise ValueError(f"LLM returned malformed JSON after 2 attempts: {raw[:200]}")

    return []
