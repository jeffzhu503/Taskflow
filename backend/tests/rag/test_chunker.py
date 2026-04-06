from rag.chunker import chunk_text


def test_short_text_is_single_chunk():
    text = "This is a short sentence."
    chunks = chunk_text(text, max_tokens=500, overlap=50)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_long_text_produces_multiple_chunks():
    # ~600 tokens: repeat a sentence enough times
    sentence = "Review the quarterly budget report and prepare a summary for the team. "
    text = sentence * 60  # well over 500 tokens
    chunks = chunk_text(text, max_tokens=500, overlap=50)
    assert len(chunks) >= 2


def test_chunks_have_overlap():
    sentence = "Review the quarterly budget report and prepare a summary for the team. "
    text = sentence * 60
    chunks = chunk_text(text, max_tokens=500, overlap=50)
    # The end of chunk[0] should appear at the start of chunk[1]
    end_of_first = chunks[0][-100:]
    assert end_of_first in chunks[1]


def test_empty_text_returns_empty_list():
    chunks = chunk_text("", max_tokens=500, overlap=50)
    assert chunks == []
