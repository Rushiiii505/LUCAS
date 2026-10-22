import pytest
import tempfile
from pathlib import Path
from app.services.document_parsers import parse_markdown, parse_text, parse_csv, parse_json, parse_document

def test_parse_markdown():
    with tempfile.NamedTemporaryFile("w+", suffix=".md", delete=False) as f:
        f.write("# Introduction\nLucas is a private AI system.\n\n# Features\n- RAG\n- Local inference")
        path = Path(f.name)

    try:
        sections = parse_markdown(path)
        assert len(sections) == 2
        assert sections[0].page_or_section == "Introduction"
        assert "Lucas is a private AI system." in sections[0].content
        assert sections[1].page_or_section == "Features"
    finally:
        path.unlink()

def test_parse_text():
    with tempfile.NamedTemporaryFile("w+", suffix=".txt", delete=False) as f:
        f.write("A plain text document with some notes.\nLine 2.\nLine 3.")
        path = Path(f.name)

    try:
        sections = parse_text(path)
        assert len(sections) == 1
        assert "A plain text document" in sections[0].content
    finally:
        path.unlink()

def test_parse_csv():
    with tempfile.NamedTemporaryFile("w+", suffix=".csv", delete=False) as f:
        f.write("device,ram,cpu\nRaspberry Pi 5,4GB,ARM Cortex-A76\nMacBook Pro,16GB,Apple M-series\n")
        path = Path(f.name)

    try:
        sections = parse_csv(path)
        assert len(sections) == 1
        assert "Raspberry Pi 5" in sections[0].content
    finally:
        path.unlink()

def test_parse_json():
    with tempfile.NamedTemporaryFile("w+", suffix=".json", delete=False) as f:
        f.write('{"name": "Lucas", "version": "1.0.0", "target": "Raspberry Pi 5"}')
        path = Path(f.name)

    try:
        sections = parse_json(path)
        assert len(sections) == 3
    finally:
        path.unlink()
