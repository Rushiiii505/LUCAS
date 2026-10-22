import pytest
from app.services.chunking import chunk_text_by_paragraphs, chunk_document_sections, estimate_tokens
from app.services.document_parsers import ParsedSection

def test_estimate_tokens():
    text = "Hello world this is a test string"
    tokens = estimate_tokens(text)
    assert tokens > 0
    assert tokens == len(text) // 4

def test_chunk_text_respects_paragraphs():
    p1 = "First paragraph discussing computer networks and topology."
    p2 = "Second paragraph discussing transport layer protocols like TCP and UDP."
    p3 = "Third paragraph detailing application layer concepts like HTTP and DNS."
    text = f"{p1}\n\n{p2}\n\n{p3}"

    chunks = chunk_text_by_paragraphs(text, target_chunk_size=100, overlap_size=20)
    assert len(chunks) >= 2
    for c in chunks:
        assert len(c) > 0

def test_chunk_document_sections():
    sections = [
        ParsedSection(content="System design overview for edge AI devices.", page_or_section="Introduction"),
        ParsedSection(content="Detailed benchmarks running on Raspberry Pi 5 hardware with 4GB RAM.", page_or_section="Hardware")
    ]
    chunks = chunk_document_sections("doc-123", sections, chunk_size=200, chunk_overlap=30)
    assert len(chunks) >= 2
    assert chunks[0]["document_id"] == "doc-123"
    assert chunks[0]["page_or_section"] == "Introduction"
    assert chunks[1]["page_or_section"] == "Hardware"
