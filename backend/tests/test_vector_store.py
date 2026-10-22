import pytest
import tempfile
from pathlib import Path
from app.services.vector_store import SqliteVectorStore

def test_sqlite_vector_store():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_vectors.db"
        store = SqliteVectorStore(db_path=db_path)

        # Vector 1: oriented toward [1, 0, 0]
        # Vector 2: oriented toward [0, 1, 0]
        chunks = [
            {"id": "chunk-1", "document_id": "doc-a", "content": "alpha"},
            {"id": "chunk-2", "document_id": "doc-b", "content": "beta"},
        ]
        embeddings = [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
        ]

        store.add_vectors(chunks, embeddings)

        stats = store.get_stats()
        assert stats["total_chunks_indexed"] == 2
        assert stats["total_documents_indexed"] == 2

        # Search for vector close to vector 1
        results = store.search(query_embedding=[0.9, 0.1, 0.0], top_k=2, similarity_threshold=0.5)
        assert len(results) >= 1
        assert results[0]["chunk_id"] == "chunk-1"
        assert results[0]["score"] > 0.8

        # Delete document doc-a
        store.delete_document_vectors("doc-a")
        stats_after = store.get_stats()
        assert stats_after["total_chunks_indexed"] == 1
        assert stats_after["total_documents_indexed"] == 1
