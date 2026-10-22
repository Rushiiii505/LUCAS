from fastapi import APIRouter
from app.config import settings
from app.services.ollama_service import ollama_service
from app.services.vector_store import vector_store

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """Application health status and resource overview."""
    ollama_info = await ollama_service.get_status()
    vec_stats = vector_store.get_stats()
    
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "tagline": settings.tagline,
        "ollama": ollama_info,
        "storage": {
            "low_memory_mode": settings.low_memory_mode,
            "vector_store": vec_stats
        }
    }

@router.get("/ollama/status")
async def ollama_status():
    """Specific status check for Ollama connectivity and installed models."""
    status_info = await ollama_service.get_status()
    return status_info
