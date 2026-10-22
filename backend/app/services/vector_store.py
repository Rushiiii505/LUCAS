import sqlite3
import numpy as np
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pathlib import Path
from app.config import settings
from app.utils.logger import logger

class BaseVectorStore(ABC):
    """Abstract interface for local vector storage."""
    
    @abstractmethod
    def add_vectors(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        pass

    @abstractmethod
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        filter_document_ids: Optional[List[str]] = None,
        similarity_threshold: float = 0.30
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def delete_document_vectors(self, document_id: str) -> None:
        pass

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def clear_all(self) -> None:
        pass

class SqliteVectorStore(BaseVectorStore):
    """
    Lightweight, persistent vector store using SQLite and NumPy.
    Optimized for low-RAM environments like Raspberry Pi 5.
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (settings.vectors_path / "vectors.db")
        self._init_db()

    def _init_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS vector_embeddings (
                    chunk_id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    embedding BLOB NOT NULL,
                    dimension INTEGER NOT NULL
                );
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_vec_doc ON vector_embeddings(document_id);")
            conn.commit()

    def add_vectors(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        if not chunks or not embeddings or len(chunks) != len(embeddings):
            return

        records = []
        for chunk, emb in zip(chunks, embeddings):
            arr = np.array(emb, dtype=np.float32)
            # Normalize vector for faster dot-product cosine similarity
            norm = np.linalg.norm(arr)
            if norm > 0:
                arr = arr / norm
            blob = arr.tobytes()
            records.append((chunk["id"], chunk["document_id"], blob, len(arr)))

        with sqlite3.connect(self.db_path) as conn:
            conn.executemany(
                """
                INSERT OR REPLACE INTO vector_embeddings (chunk_id, document_id, embedding, dimension)
                VALUES (?, ?, ?, ?)
                """,
                records
            )
            conn.commit()
        logger.info(f"Stored {len(records)} vector embeddings in vector database.")

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        filter_document_ids: Optional[List[str]] = None,
        similarity_threshold: float = 0.30
    ) -> List[Dict[str, Any]]:
        """
        Calculates cosine similarity with stored embeddings and returns top matching chunks.
        """
        q_arr = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_arr)
        if q_norm == 0:
            return []
        q_normalized = q_arr / q_norm

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            if filter_document_ids:
                placeholders = ",".join("?" for _ in filter_document_ids)
                query = f"SELECT chunk_id, document_id, embedding, dimension FROM vector_embeddings WHERE document_id IN ({placeholders})"
                rows = conn.execute(query, tuple(filter_document_ids)).fetchall()
            else:
                rows = conn.execute("SELECT chunk_id, document_id, embedding, dimension FROM vector_embeddings").fetchall()

        if not rows:
            return []

        chunk_ids = []
        doc_ids = []
        matrices = []

        for r in rows:
            dim = r["dimension"]
            arr = np.frombuffer(r["embedding"], dtype=np.float32)
            if len(arr) == len(q_normalized):
                chunk_ids.append(r["chunk_id"])
                doc_ids.append(r["document_id"])
                matrices.append(arr)

        if not matrices:
            return []

        matrix = np.vstack(matrices)  # Shape: (N, D)
        # Cosine similarity is simply dot product because vectors were pre-normalized
        scores = np.dot(matrix, q_normalized)

        # Pair up and filter
        scored_results = []
        for cid, did, score in zip(chunk_ids, doc_ids, scores):
            score_float = float(score)
            if score_float >= similarity_threshold:
                scored_results.append({
                    "chunk_id": cid,
                    "document_id": did,
                    "score": round(score_float, 4)
                })

        # Sort descending by similarity score
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]

    def delete_document_vectors(self, document_id: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM vector_embeddings WHERE document_id = ?", (document_id,))
            conn.commit()
        logger.info(f"Deleted vector embeddings for document {document_id}")

    def get_stats(self) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT COUNT(*) as cnt, COUNT(DISTINCT document_id) as docs FROM vector_embeddings").fetchone()
            count = row[0] if row else 0
            docs = row[1] if row else 0
            
            db_size = self.db_path.stat().st_size if self.db_path.exists() else 0
            return {
                "total_chunks_indexed": count,
                "total_documents_indexed": docs,
                "db_size_bytes": db_size,
                "db_path": str(self.db_path)
            }

    def clear_all(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM vector_embeddings")
            conn.commit()

# Default singleton vector store instance
vector_store: BaseVectorStore = SqliteVectorStore()
