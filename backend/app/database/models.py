from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class Citation(BaseModel):
    document_id: str
    document_name: str
    page_or_section: Optional[str] = None
    chunk_id: str
    score: float
    snippet: Optional[str] = None

class Message(BaseModel):
    id: str
    conversation_id: str
    role: str  # user, assistant, system
    content: str
    sources: Optional[List[Citation]] = None
    status: str = "completed"  # completed, streaming, stopped, failed
    created_at: str

class MessageCreate(BaseModel):
    role: str
    content: str
    sources: Optional[List[Citation]] = None
    status: str = "completed"

class Conversation(BaseModel):
    id: str
    title: str
    model: Optional[str] = None
    rag_enabled: bool = True
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message: Optional[str] = None

class ConversationDetail(Conversation):
    messages: List[Message] = Field(default_factory=list)

class ConversationCreate(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None
    rag_enabled: bool = True
    system_prompt: Optional[str] = None
    temperature: float = 0.7

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None
    rag_enabled: Optional[bool] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None

class Document(BaseModel):
    id: str
    filename: str
    stored_filename: str
    file_type: str
    file_size: int
    status: str  # uploaded, processing, indexed, failed
    error_message: Optional[str] = None
    chunk_count: int = 0
    created_at: str
    updated_at: str

class DocumentChunk(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    page_or_section: Optional[str] = None
    token_count: int = 0
    created_at: str

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    model: Optional[str] = None
    rag_enabled: Optional[bool] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    stream: bool = True

class ChatStopRequest(BaseModel):
    conversation_id: str

class RegenerateRequest(BaseModel):
    message_id: Optional[str] = None
    model: Optional[str] = None
    rag_enabled: Optional[bool] = None

class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None
    document_ids: Optional[List[str]] = None

class KnowledgeSearchResult(BaseModel):
    chunks: List[Citation]
    query: str
    total_found: int

class SettingsUpdate(BaseModel):
    ollama_base_url: Optional[str] = None
    default_model: Optional[str] = None
    default_embedding_model: Optional[str] = None
    default_temperature: Optional[float] = None
    default_system_prompt: Optional[str] = None
    rag_chunk_size: Optional[int] = None
    rag_chunk_overlap: Optional[int] = None
    rag_top_k: Optional[int] = None
    rag_similarity_threshold: Optional[float] = None
    rag_context_budget: Optional[int] = None
    low_memory_mode: Optional[bool] = None
    max_upload_size_mb: Optional[int] = None
    lan_auth_enabled: Optional[bool] = None
    lan_auth_token: Optional[str] = None
