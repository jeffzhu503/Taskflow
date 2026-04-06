# backend/tests/rag/test_extractor.py
import pytest
from rag.extractor import extract_text


def test_extract_txt(txt_bytes):
    text = extract_text("notes.txt", txt_bytes)
    assert "Review Q2 budget variance" in text


def test_extract_docx(docx_bytes):
    text = extract_text("report.docx", docx_bytes)
    assert "Review Q2 budget variance" in text
    assert "Schedule follow-up" in text


def test_extract_pdf(pdf_bytes):
    text = extract_text("report.pdf", pdf_bytes)
    assert "budget" in text.lower()


def test_extract_unsupported_type():
    with pytest.raises(ValueError, match="Unsupported"):
        extract_text("image.png", b"fake")


def test_extract_empty_docx():
    import io
    import docx
    doc = docx.Document()
    buf = io.BytesIO()
    doc.save(buf)
    text = extract_text("empty.docx", buf.getvalue())
    assert text == ""
