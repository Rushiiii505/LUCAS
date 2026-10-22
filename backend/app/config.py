import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Base directory for the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DATA_DIR = BASE_DIR / "data"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # General
    app_name: str = "Lucas"
    app_version: str = "1.0.0"
    tagline: str = "Your intelligence. Your infrastructure."
    environment: str = "production"
    debug: bool = False
    
    # Server / Networking
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])
    lan_auth_enabled: bool = False
    lan_auth_token: Optional[str] = None
    request_timeout_seconds: int = 120

    # Storage Paths
    data_dir: Path = DEFAULT_DATA_DIR
    database_name: str = "lucas.db"
    uploads_dir_name: str = "uploads"
    vectors_dir_name: str = "vectors"

    # Ollama Configuration
    ollama_base_url: str = "http://127.0.0.1:11434"
    default_model: Optional[str] = None
    default_embedding_model: Optional[str] = None
    default_temperature: float = 0.7
    default_system_prompt: str = (
        "You are Lucas, a thoughtful, precise, and private personal AI assistant. "
        "Provide direct, well-structured, and accurate answers. "
        "Format your responses using clear Markdown, clean code snippets with language labels, and concise explanations."
    )

    # RAG & Ingestion Configuration
    rag_chunk_size: int = 600
    rag_chunk_overlap: int = 100
    rag_top_k: int = 4
    rag_similarity_threshold: float = 0.30
    rag_context_budget: int = 3500
    max_upload_size_mb: int = 25
    allowed_extensions: List[str] = Field(
        default_factory=lambda: [".pdf", ".txt", ".md", ".docx", ".csv", ".json"]
    )

    # Raspberry Pi 5 Optimization & Concurrency Limits
    low_memory_mode: bool = True
    max_simultaneous_generations: int = 1
    max_simultaneous_ingestions: int = 1
    max_history_messages: int = 12  # Prevents context explosion on 4GB Pi

    @property
    def database_path(self) -> Path:
        return self.data_dir / self.database_name

    @property
    def uploads_path(self) -> Path:
        return self.data_dir / self.uploads_dir_name

    @property
    def vectors_path(self) -> Path:
        return self.data_dir / self.vectors_dir_name

    def ensure_directories(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_path.mkdir(parents=True, exist_ok=True)
        self.vectors_path.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
