import shutil
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter
from app.config import settings
from app.database import repository
from app.database.models import SettingsUpdate
from app.services.vector_store import vector_store
from app.services.ollama_service import ollama_service

router = APIRouter(prefix="/settings", tags=["Settings"])

def get_disk_usage_stats() -> Dict[str, Any]:
    """Calculate storage usage for the data directory."""
    data_dir = settings.data_dir
    total_size = 0
    if data_dir.exists():
        for p in data_dir.glob("**/*"):
            if p.is_file():
                total_size += p.stat().st_size
    
    # Also check system disk space
    disk = shutil.disk_usage(data_dir if data_dir.exists() else Path.cwd())
    return {
        "app_data_size_bytes": total_size,
        "app_data_size_mb": round(total_size / (1024 * 1024), 2),
        "disk_free_gb": round(disk.free / (1024 ** 3), 2),
        "disk_total_gb": round(disk.total / (1024 ** 3), 2),
    }

@router.get("")
async def get_current_settings():
    """Retrieve full configuration and runtime diagnostic settings."""
    persisted = repository.get_all_app_settings()
    disk_stats = get_disk_usage_stats()
    vec_stats = vector_store.get_stats()
    ollama_status = await ollama_service.get_status()
    models = await ollama_service.list_models()

    return {
        "general": {
            "app_name": settings.app_name,
            "app_version": settings.app_version,
            "tagline": settings.tagline,
            "default_model": persisted.get("default_model", settings.default_model or (models[0]["name"] if models else None)),
            "default_temperature": float(persisted.get("default_temperature", settings.default_temperature)),
            "default_system_prompt": persisted.get("default_system_prompt", settings.default_system_prompt),
        },
        "ollama": {
            "base_url": persisted.get("ollama_base_url", settings.ollama_base_url),
            "status": ollama_status,
            "available_models": models,
        },
        "knowledge_base": {
            "default_embedding_model": persisted.get("default_embedding_model", settings.default_embedding_model or "nomic-embed-text"),
            "rag_chunk_size": int(persisted.get("rag_chunk_size", settings.rag_chunk_size)),
            "rag_chunk_overlap": int(persisted.get("rag_chunk_overlap", settings.rag_chunk_overlap)),
            "rag_top_k": int(persisted.get("rag_top_k", settings.rag_top_k)),
            "rag_similarity_threshold": float(persisted.get("rag_similarity_threshold", settings.rag_similarity_threshold)),
            "rag_context_budget": int(persisted.get("rag_context_budget", settings.rag_context_budget)),
            "vector_store": vec_stats,
        },
        "performance": {
            "low_memory_mode": bool(int(persisted.get("low_memory_mode", 1 if settings.low_memory_mode else 0))),
            "max_simultaneous_generations": settings.max_simultaneous_generations,
            "max_simultaneous_ingestions": settings.max_simultaneous_ingestions,
            "max_upload_size_mb": int(persisted.get("max_upload_size_mb", settings.max_upload_size_mb)),
            "request_timeout_seconds": settings.request_timeout_seconds,
        },
        "storage": {
            "data_directory": str(settings.data_dir),
            "database_path": str(settings.database_path),
            "uploads_directory": str(settings.uploads_path),
            "vectors_directory": str(settings.vectors_path),
            "disk_usage": disk_stats,
        },
        "security": {
            "lan_auth_enabled": bool(int(persisted.get("lan_auth_enabled", 1 if settings.lan_auth_enabled else 0))),
        }
    }

@router.patch("")
async def update_settings(payload: SettingsUpdate):
    """Update configurable settings persistently in database."""
    if payload.ollama_base_url is not None:
        repository.set_app_setting("ollama_base_url", payload.ollama_base_url.strip())
        settings.ollama_base_url = payload.ollama_base_url.strip()
        ollama_service.base_url = payload.ollama_base_url.strip()

    if payload.default_model is not None:
        repository.set_app_setting("default_model", payload.default_model)
        settings.default_model = payload.default_model

    if payload.default_embedding_model is not None:
        repository.set_app_setting("default_embedding_model", payload.default_embedding_model)
        settings.default_embedding_model = payload.default_embedding_model

    if payload.default_temperature is not None:
        repository.set_app_setting("default_temperature", str(payload.default_temperature))
        settings.default_temperature = payload.default_temperature

    if payload.default_system_prompt is not None:
        repository.set_app_setting("default_system_prompt", payload.default_system_prompt)
        settings.default_system_prompt = payload.default_system_prompt

    if payload.rag_chunk_size is not None:
        repository.set_app_setting("rag_chunk_size", str(payload.rag_chunk_size))
        settings.rag_chunk_size = payload.rag_chunk_size

    if payload.rag_chunk_overlap is not None:
        repository.set_app_setting("rag_chunk_overlap", str(payload.rag_chunk_overlap))
        settings.rag_chunk_overlap = payload.rag_chunk_overlap

    if payload.rag_top_k is not None:
        repository.set_app_setting("rag_top_k", str(payload.rag_top_k))
        settings.rag_top_k = payload.rag_top_k

    if payload.rag_similarity_threshold is not None:
        repository.set_app_setting("rag_similarity_threshold", str(payload.rag_similarity_threshold))
        settings.rag_similarity_threshold = payload.rag_similarity_threshold

    if payload.rag_context_budget is not None:
        repository.set_app_setting("rag_context_budget", str(payload.rag_context_budget))
        settings.rag_context_budget = payload.rag_context_budget

    if payload.low_memory_mode is not None:
        repository.set_app_setting("low_memory_mode", "1" if payload.low_memory_mode else "0")
        settings.low_memory_mode = payload.low_memory_mode

    if payload.max_upload_size_mb is not None:
        repository.set_app_setting("max_upload_size_mb", str(payload.max_upload_size_mb))
        settings.max_upload_size_mb = payload.max_upload_size_mb

    if payload.lan_auth_enabled is not None:
        repository.set_app_setting("lan_auth_enabled", "1" if payload.lan_auth_enabled else "0")
        settings.lan_auth_enabled = payload.lan_auth_enabled

    if payload.lan_auth_token is not None:
        repository.set_app_setting("lan_auth_token", payload.lan_auth_token)
        settings.lan_auth_token = payload.lan_auth_token

    return await get_current_settings()
