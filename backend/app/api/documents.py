import asyncio
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, status
from app.config import settings
from app.database import repository
from app.database.models import Document, DocumentChunk, KnowledgeSearchRequest, KnowledgeSearchResult, Citation
from app.services.rag_service import rag_service
from app.services.vector_store import vector_store
from app.utils.security import generate_safe_storage_name, validate_file_extension
from app.utils.logger import logger

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("", response_model=List[Document])
async def list_all_documents():
    """List all indexed or uploaded documents."""
    return repository.list_documents()

@router.post("/upload", response_model=Document, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload and queue a document for asynchronous parsing, chunking, and vector indexing.
    Validates file extensions and size limits safely.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    ext = validate_file_extension(file.filename)
    
    # Read file content safely with size limit checking
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()
    
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {settings.max_upload_size_mb} MB."
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    doc_id, stored_filename, display_name = generate_safe_storage_name(file.filename)
    target_path = settings.uploads_path / stored_filename

    try:
        target_path.write_bytes(content)
    except Exception as e:
        logger.error(f"Failed to write uploaded file to disk: {e}")
        raise HTTPException(status_code=500, detail="Could not store document on disk.")

    # Record in DB as 'uploaded'
    doc = repository.create_document(
        doc_id=doc_id,
        filename=display_name,
        stored_filename=stored_filename,
        file_type=ext.lstrip("."),
        file_size=len(content),
        status="uploaded"
    )

    # Trigger asynchronous indexing in background
    background_tasks.add_task(rag_service.ingest_document, doc_id)
    return doc

@router.get("/{document_id}", response_model=Document)
async def get_document_by_id(document_id: str):
    """Get metadata and indexing status for a document."""
    doc = repository.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str):
    """
    Permanently delete a document, its stored file on disk, its chunks, and its vector embeddings.
    """
    doc = repository.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Delete stored file
    file_path = settings.uploads_path / doc.stored_filename
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete stored file {file_path}: {e}")

    # 2. Delete vectors from vector store
    vector_store.delete_document_vectors(document_id)

    # 3. Delete chunks and document from database
    repository.delete_chunks_for_document(document_id)
    repository.delete_document(document_id)
    return None

@router.post("/{document_id}/reindex", response_model=Document)
async def reindex_document(document_id: str, background_tasks: BackgroundTasks):
    """Retry indexing or re-index an existing document."""
    doc = repository.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    repository.update_document_status(document_id, status="processing", error_message=None)
    background_tasks.add_task(rag_service.ingest_document, document_id)
    return repository.get_document(document_id) # type: ignore

@router.get("/{document_id}/preview")
async def preview_document(document_id: str):
    """Preview parsed text excerpts and chunks of the document."""
    doc = repository.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = repository.get_chunks_for_document(document_id)
    return {
        "document": doc,
        "chunk_count": len(chunks),
        "chunks_preview": [
            {
                "id": c.id,
                "chunk_index": c.chunk_index,
                "section": c.page_or_section,
                "token_count": c.token_count,
                "content": c.content
            }
            for c in chunks[:10]  # First 10 chunks for preview
        ]
    }

# Also attach /api/knowledge/search router
knowledge_router = APIRouter(prefix="/knowledge", tags=["Knowledge"])

@knowledge_router.post("/search", response_model=KnowledgeSearchResult)
async def search_knowledge_base(req: KnowledgeSearchRequest):
    """Perform direct semantic search across indexed documents."""
    _, citations = await rag_service.retrieve_context(
        query=req.query,
        top_k=req.top_k or settings.rag_top_k,
        document_ids=req.document_ids
    )
    return KnowledgeSearchResult(
        chunks=citations,
        query=req.query,
        total_found=len(citations)
    )
