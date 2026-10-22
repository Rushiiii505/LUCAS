from fastapi import APIRouter
from app.services.ollama_service import ollama_service
from app.config import settings

router = APIRouter(tags=["Models"])

@router.get("/models")
async def list_models():
    """Discover installed models from the local Ollama instance."""
    models = await ollama_service.list_models()
    return {
        "models": models,
        "default_model": settings.default_model or (models[0]["name"] if models else None),
        "count": len(models)
    }
