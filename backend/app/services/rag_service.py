import asyncio
import hashlib
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings
from app.database import repository
from app.database.models import Citation
from app.services.document_parsers import parse_document
from app.services.chunking import chunk_document_sections
from app.services.vector_store import vector_store
from app.services.ollama_service import ollama_service
from app.utils.logger import logger
from app.utils.security import sanitize_rag_chunk

class RAGService:
    def __init__(self):
        # Bounded concurrency for Pi 5 4GB RAM
        self._ingestion_semaphore = asyncio.Semaphore(settings.max_simultaneous_ingestions)

    def _fallback_pseudo_embedding(self, text: str, dimension: int = 384) -> List[float]:
        """
        Deterministic lightweight pseudo-embedding fallback when Ollama embedding model is offline.
        Ensures ingestion and retrieval tests and basic lexical matching work even without a heavy model.
        """
        words = text.lower().split()
        vec = np.zeros(dimension, dtype=np.float32)
        for w in words:
            h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
            idx = h % dimension
            vec[idx] += 1.0
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    async def get_embedding_with_fallback(self, text: str) -> List[float]:
        """Fetch embedding from Ollama; fallback gracefully if embedding model unavailable."""
        try:
            return await ollama_service.get_embedding(text)
        except Exception as e:
            logger.warning(f"Ollama embedding unavailable ({e}), using lightweight lexical vector fallback.")
            return self._fallback_pseudo_embedding(text)

    async def ingest_document(self, document_id: str) -> None:
        """
        Ingest a document asynchronously: parse -> chunk -> embed -> store vectors -> index.
        Protected with Semaphore so Pi 5 memory is never exhausted.
        """
        async with self._ingestion_semaphore:
            doc = repository.get_document(document_id)
            if not doc:
                logger.error(f"Ingestion failed: Document {document_id} not found in database.")
                return

            try:
                repository.update_document_status(document_id, status="processing")
                file_path = settings.uploads_path / doc.stored_filename

                if not file_path.exists():
                    raise FileNotFoundError(f"Stored file not found on disk: {file_path}")

                logger.info(f"Parsing document '{doc.filename}' ({doc.file_type})...")
                sections = parse_document(file_path, doc.file_type)

                logger.info(f"Chunking document '{doc.filename}' into structural units...")
                chunks = chunk_document_sections(document_id, sections)

                if not chunks:
                    raise ValueError("Document yielded 0 usable text chunks.")

                logger.info(f"Generating embeddings for {len(chunks)} chunks...")
                embeddings: List[List[float]] = []

                # Embed in bounded micro-batches for Pi 5 RAM safety
                batch_size = 4 if settings.low_memory_mode else 8
                for i in range(0, len(chunks), batch_size):
                    batch = chunks[i:i + batch_size]
                    batch_embeddings = await asyncio.gather(*[
                        self.get_embedding_with_fallback(c["content"]) for c in batch
                    ])
                    embeddings.extend(batch_embeddings)
                    # Yield event loop briefly
                    await asyncio.sleep(0.01)

                # Store chunks in SQLite
                repository.delete_chunks_for_document(document_id)
                repository.insert_chunks(chunks)

                # Store vectors in Vector Store
                vector_store.delete_document_vectors(document_id)
                vector_store.add_vectors(chunks, embeddings)

                # Mark document as indexed
                repository.update_document_status(
                    document_id,
                    status="indexed",
                    chunk_count=len(chunks),
                    error_message=None
                )
                logger.info(f"Document '{doc.filename}' indexed successfully with {len(chunks)} chunks.")

            except Exception as e:
                err_msg = str(e)
                logger.error(f"Document ingestion failed for {document_id}: {err_msg}")
                repository.update_document_status(
                    document_id,
                    status="failed",
                    chunk_count=0,
                    error_message=err_msg
                )

    async def retrieve_context(
        self,
        query: str,
        top_k: Optional[int] = None,
        document_ids: Optional[List[str]] = None,
        similarity_threshold: Optional[float] = None
    ) -> Tuple[str, List[Citation]]:
        """
        Retrieves relevant document chunks and builds a context block with citations.
        """
        k = top_k or settings.rag_top_k
        sim_threshold = similarity_threshold if similarity_threshold is not None else settings.rag_similarity_threshold

        query_embedding = await self.get_embedding_with_fallback(query)
        matches = vector_store.search(
            query_embedding=query_embedding,
            top_k=k,
            filter_document_ids=document_ids,
            similarity_threshold=sim_threshold
        )

        if not matches:
            return "", []

        citations: List[Citation] = []
        context_blocks: List[str] = []
        current_context_len = 0
        budget = settings.rag_context_budget

        # Map document_id to Document metadata
        doc_cache: Dict[str, Any] = {}

        for m in matches:
            cid = m["chunk_id"]
            did = m["document_id"]
            score = m["score"]

            if did not in doc_cache:
                doc = repository.get_document(did)
                doc_cache[did] = doc

            doc = doc_cache[did]
            doc_name = doc.filename if doc else "Document"

            # Fetch chunk content from DB
            chunks = repository.get_chunks_for_document(did)
            matched_chunk = next((c for c in chunks if c.id == cid), None)
            if not matched_chunk:
                continue

            clean_content = sanitize_rag_chunk(matched_chunk.content)
            
            # Check context budget
            if current_context_len + len(clean_content) > budget and context_blocks:
                break

            citation = Citation(
                document_id=did,
                document_name=doc_name,
                page_or_section=matched_chunk.page_or_section,
                chunk_id=cid,
                score=score,
                snippet=clean_content[:180] + ("..." if len(clean_content) > 180 else "")
            )
            citations.append(citation)

            sec_label = f" | {matched_chunk.page_or_section}" if matched_chunk.page_or_section else ""
            block = f"[Source: {doc_name}{sec_label} (Relevance: {score:.2f})]\n{clean_content}"
            context_blocks.append(block)
            current_context_len += len(block)

        if not context_blocks:
            return "", []

        full_context = "\n\n---\n\n".join(context_blocks)
        rag_prompt = (
            "\n\n<retrieved_knowledge>\n"
            "The following excerpts are retrieved from the user's verified local documents. "
            "Prioritize this factual knowledge in your response. "
            "Cite the document name and page/section where applicable. "
            "If the retrieved knowledge does not contain sufficient information to answer the question, clearly state this rather than speculating.\n\n"
            f"{full_context}\n"
            "</retrieved_knowledge>\n"
        )

        return rag_prompt, citations

rag_service = RAGService()
