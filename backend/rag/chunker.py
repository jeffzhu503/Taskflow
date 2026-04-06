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
