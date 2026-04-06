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
