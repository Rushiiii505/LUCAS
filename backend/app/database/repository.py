import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.database.db import get_db_connection
from app.database.models import (
    Conversation, ConversationDetail, ConversationCreate, ConversationUpdate,
    Message, MessageCreate, Document, DocumentChunk, Citation
)
from app.utils.logger import logger

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ==================== Conversations ====================

def create_conversation(data: ConversationCreate) -> Conversation:
    conv_id = str(uuid.uuid4())
    now = utc_now_iso()
    title = data.title.strip() if (data.title and data.title.strip()) else "New Conversation"
    
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO conversations (id, title, model, rag_enabled, system_prompt, temperature, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                conv_id,
                title,
                data.model,
                1 if data.rag_enabled else 0,
                data.system_prompt,
                data.temperature,
                now,
                now,
            )
        )
    return get_conversation(conv_id) # type: ignore

def get_conversation(conv_id: str) -> Optional[Conversation]:
    with get_db_connection() as conn:
        row = conn.execute(
            """
            SELECT c.*, 
                   COUNT(m.id) as message_count,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
            """,
            (conv_id,)
        ).fetchone()

        if not row:
            return None

        return Conversation(
            id=row["id"],
            title=row["title"],
            model=row["model"],
            rag_enabled=bool(row["rag_enabled"]),
            system_prompt=row["system_prompt"],
            temperature=float(row["temperature"]) if row["temperature"] is not None else 0.7,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            message_count=row["message_count"],
            last_message=row["last_message"],
        )

def get_conversation_detail(conv_id: str) -> Optional[ConversationDetail]:
    conv = get_conversation(conv_id)
    if not conv:
        return None
    
    messages = get_conversation_messages(conv_id)
    return ConversationDetail(
        **conv.model_dump(),
        messages=messages
    )

def list_conversations() -> List[Conversation]:
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.*, 
                   COUNT(m.id) as message_count,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            """
        ).fetchall()

        return [
            Conversation(
                id=row["id"],
                title=row["title"],
                model=row["model"],
                rag_enabled=bool(row["rag_enabled"]),
                system_prompt=row["system_prompt"],
                temperature=float(row["temperature"]) if row["temperature"] is not None else 0.7,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                message_count=row["message_count"],
                last_message=row["last_message"],
            )
            for row in rows
        ]

def update_conversation(conv_id: str, data: ConversationUpdate) -> Optional[Conversation]:
    conv = get_conversation(conv_id)
    if not conv:
        return None

    now = utc_now_iso()
    updates = []
    params = []

    if data.title is not None:
        updates.append("title = ?")
        params.append(data.title.strip() or "Untitled Conversation")
    if data.model is not None:
        updates.append("model = ?")
        params.append(data.model)
    if data.rag_enabled is not None:
        updates.append("rag_enabled = ?")
        params.append(1 if data.rag_enabled else 0)
    if data.system_prompt is not None:
        updates.append("system_prompt = ?")
        params.append(data.system_prompt)
    if data.temperature is not None:
        updates.append("temperature = ?")
        params.append(data.temperature)

    if not updates:
        return conv

    updates.append("updated_at = ?")
    params.append(now)
    params.append(conv_id)

    query = f"UPDATE conversations SET {', '.join(updates)} WHERE id = ?"
    with get_db_connection() as conn:
        conn.execute(query, tuple(params))

    return get_conversation(conv_id)

def touch_conversation(conv_id: str) -> None:
    now = utc_now_iso()
    with get_db_connection() as conn:
        conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id))

def delete_conversation(conv_id: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        return cursor.rowcount > 0

def search_conversations(query: str) -> List[Conversation]:
    term = f"%{query.strip()}%"
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT c.*, 
                   COUNT(m.id) as message_count,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.title LIKE ? OR m.content LIKE ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            """,
            (term, term)
        ).fetchall()

        return [
            Conversation(
                id=row["id"],
                title=row["title"],
                model=row["model"],
                rag_enabled=bool(row["rag_enabled"]),
                system_prompt=row["system_prompt"],
                temperature=float(row["temperature"]) if row["temperature"] is not None else 0.7,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                message_count=row["message_count"],
                last_message=row["last_message"],
            )
            for row in rows
        ]

# ==================== Messages ====================

def create_message(
    conversation_id: str,
    role: str,
    content: str,
    sources: Optional[List[Citation]] = None,
    status: str = "completed",
    custom_id: Optional[str] = None
) -> Message:
    msg_id = custom_id or str(uuid.uuid4())
    now = utc_now_iso()
    sources_json = json.dumps([s.model_dump() for s in sources]) if sources else None

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO messages (id, conversation_id, role, content, sources, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (msg_id, conversation_id, role, content, sources_json, status, now)
        )
    touch_conversation(conversation_id)

    return Message(
        id=msg_id,
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources=sources,
        status=status,
        created_at=now
    )

def get_conversation_messages(conversation_id: str) -> List[Message]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conversation_id,)
        ).fetchall()

        messages = []
        for r in rows:
            sources = None
            if r["sources"]:
                try:
                    sources_raw = json.loads(r["sources"])
                    sources = [Citation(**item) for item in sources_raw]
                except Exception:
                    sources = None

            messages.append(Message(
                id=r["id"],
                conversation_id=r["conversation_id"],
                role=r["role"],
                content=r["content"],
                sources=sources,
                status=r["status"],
                created_at=r["created_at"]
            ))
        return messages

def update_message(msg_id: str, content: str, status: str = "completed", sources: Optional[List[Citation]] = None) -> None:
    sources_json = json.dumps([s.model_dump() for s in sources]) if sources is not None else None
    with get_db_connection() as conn:
        if sources is not None:
            conn.execute(
                "UPDATE messages SET content = ?, status = ?, sources = ? WHERE id = ?",
                (content, status, sources_json, msg_id)
            )
        else:
            conn.execute(
                "UPDATE messages SET content = ?, status = ? WHERE id = ?",
                (content, status, msg_id)
            )

# ==================== Documents ====================

def create_document(
    doc_id: str,
    filename: str,
    stored_filename: str,
    file_type: str,
    file_size: int,
    status: str = "uploaded"
) -> Document:
    now = utc_now_iso()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO documents (id, filename, stored_filename, file_type, file_size, status, chunk_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (doc_id, filename, stored_filename, file_type, file_size, status, now, now)
        )
    return get_document(doc_id) # type: ignore

def get_document(doc_id: str) -> Optional[Document]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if not row:
            return None
        return Document(
            id=row["id"],
            filename=row["filename"],
            stored_filename=row["stored_filename"],
            file_type=row["file_type"],
            file_size=row["file_size"],
            status=row["status"],
            error_message=row["error_message"],
            chunk_count=row["chunk_count"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

def list_documents() -> List[Document]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM documents ORDER BY created_at DESC").fetchall()
        return [
            Document(
                id=r["id"],
                filename=r["filename"],
                stored_filename=r["stored_filename"],
                file_type=r["file_type"],
                file_size=r["file_size"],
                status=r["status"],
                error_message=r["error_message"],
                chunk_count=r["chunk_count"],
                created_at=r["created_at"],
                updated_at=r["updated_at"]
            )
            for r in rows
        ]

def update_document_status(doc_id: str, status: str, chunk_count: Optional[int] = None, error_message: Optional[str] = None) -> None:
    now = utc_now_iso()
    with get_db_connection() as conn:
        if chunk_count is not None:
            conn.execute(
                "UPDATE documents SET status = ?, chunk_count = ?, error_message = ?, updated_at = ? WHERE id = ?",
                (status, chunk_count, error_message, now, doc_id)
            )
        else:
            conn.execute(
                "UPDATE documents SET status = ?, error_message = ?, updated_at = ? WHERE id = ?",
                (status, error_message, now, doc_id)
            )

def delete_document(doc_id: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        return cursor.rowcount > 0

# ==================== Document Chunks ====================

def insert_chunks(chunks: List[Dict[str, Any]]) -> None:
    now = utc_now_iso()
    with get_db_connection() as conn:
        data = [
            (
                c["id"],
                c["document_id"],
                c["chunk_index"],
                c["content"],
                c.get("page_or_section"),
                c.get("token_count", 0),
                now
            )
            for c in chunks
        ]
        conn.executemany(
            """
            INSERT INTO document_chunks (id, document_id, chunk_index, content, page_or_section, token_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            data
        )

def get_chunks_for_document(doc_id: str) -> List[DocumentChunk]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC",
            (doc_id,)
        ).fetchall()
        return [
            DocumentChunk(
                id=r["id"],
                document_id=r["document_id"],
                chunk_index=r["chunk_index"],
                content=r["content"],
                page_or_section=r["page_or_section"],
                token_count=r["token_count"],
                created_at=r["created_at"]
            )
            for r in rows
        ]

def delete_chunks_for_document(doc_id: str) -> None:
    with get_db_connection() as conn:
        conn.execute("DELETE FROM document_chunks WHERE document_id = ?", (doc_id,))

# ==================== Settings Persistence ====================

def get_app_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default

def set_app_setting(key: str, value: str) -> None:
    now = utc_now_iso()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """,
            (key, value, now)
        )

def get_all_app_settings() -> Dict[str, str]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT key, value FROM app_settings").fetchall()
        return {r["key"]: r["value"] for r in rows}
