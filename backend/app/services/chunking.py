import uuid
import re
from typing import List, Dict, Any, Optional
from app.services.document_parsers import ParsedSection
from app.config import settings

def estimate_tokens(text: str) -> int:
    """Rough heuristic token estimator (~4 chars per token)."""
    return max(1, len(text) // 4)

def chunk_text_by_paragraphs(
    text: str,
    target_chunk_size: int = 600,
    overlap_size: int = 100
) -> List[str]:
    """
    Splits text along paragraph and sentence boundaries, respecting structure.
    Target chunk size and overlap size are measured in characters.
    """
    if len(text) <= target_chunk_size:
        return [text]

    # Split primarily on double newlines (paragraphs)
    paragraphs = text.split("\n\n")
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for para in paragraphs:
        para_clean = para.strip()
        if not para_clean:
            continue

        # If a single paragraph is longer than target_chunk_size, split by sentences
        if len(para_clean) > target_chunk_size:
            sentences = re.split(r'(?<=[.!?])\s+', para_clean)
            for s in sentences:
                s_len = len(s)
                if current_len + s_len > target_chunk_size and current_chunk:
                    chunk_str = " ".join(current_chunk).strip()
                    chunks.append(chunk_str)
                    
                    # Compute overlap from trailing part
                    overlap_chars = chunk_str[-overlap_size:] if overlap_size > 0 else ""
                    current_chunk = [overlap_chars, s] if overlap_chars else [s]
                    current_len = len(overlap_chars) + s_len
                else:
                    current_chunk.append(s)
                    current_len += s_len + 1
        else:
            para_len = len(para_clean)
            if current_len + para_len > target_chunk_size and current_chunk:
                chunk_str = "\n\n".join(current_chunk).strip()
                chunks.append(chunk_str)
                
                overlap_chars = chunk_str[-overlap_size:] if overlap_size > 0 else ""
                current_chunk = [overlap_chars, para_clean] if overlap_chars else [para_clean]
                current_len = len(overlap_chars) + para_len
            else:
                current_chunk.append(para_clean)
                current_len += para_len + 2

    if current_chunk:
        final_str = "\n\n".join(current_chunk).strip()
        if final_str:
            chunks.append(final_str)

    # Filter out empty or tiny chunks
    return [c.strip() for c in chunks if len(c.strip()) > 20]

def chunk_document_sections(
    document_id: str,
    sections: List[ParsedSection],
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Processes all parsed sections of a document into chunk dictionaries with metadata.
    """
    c_size = chunk_size or settings.rag_chunk_size
    c_overlap = chunk_overlap or settings.rag_chunk_overlap
    
    chunks_output: List[Dict[str, Any]] = []
    chunk_index = 0

    for sec in sections:
        text_chunks = chunk_text_by_paragraphs(sec.content, target_chunk_size=c_size, overlap_size=c_overlap)
        for t in text_chunks:
            chunk_id = str(uuid.uuid4())
            chunks_output.append({
                "id": chunk_id,
                "document_id": document_id,
                "chunk_index": chunk_index,
                "content": t,
                "page_or_section": sec.page_or_section,
                "token_count": estimate_tokens(t)
            })
            chunk_index += 1

    return chunks_output
