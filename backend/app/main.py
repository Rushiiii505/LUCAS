import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings, BASE_DIR
from app.database.db import init_db
from app.database import repository
from app.services.ollama_service import ollama_service
from app.utils.logger import logger

# Import API routers
from app.api.health import router as health_router
from app.api.models import router as models_router
from app.api.conversations import router as conversations_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router, knowledge_router
from app.api.settings import router as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown hooks."""
    logger.info("Initializing Lucas application...")
    settings.ensure_directories()
    init_db()

    # Load persisted settings overrides from SQLite
    try:
        persisted = repository.get_all_app_settings()
        if "ollama_base_url" in persisted:
            settings.ollama_base_url = persisted["ollama_base_url"]
            ollama_service.base_url = persisted["ollama_base_url"]
        if "default_model" in persisted:
            settings.default_model = persisted["default_model"]
        if "default_embedding_model" in persisted:
            settings.default_embedding_model = persisted["default_embedding_model"]
        if "default_temperature" in persisted:
            settings.default_temperature = float(persisted["default_temperature"])
        if "rag_chunk_size" in persisted:
            settings.rag_chunk_size = int(persisted["rag_chunk_size"])
        if "rag_chunk_overlap" in persisted:
            settings.rag_chunk_overlap = int(persisted["rag_chunk_overlap"])
        if "rag_top_k" in persisted:
            settings.rag_top_k = int(persisted["rag_top_k"])
        if "rag_similarity_threshold" in persisted:
            settings.rag_similarity_threshold = float(persisted["rag_similarity_threshold"])
        if "rag_context_budget" in persisted:
            settings.rag_context_budget = int(persisted["rag_context_budget"])
        logger.info("Persisted configuration loaded successfully.")
    except Exception as e:
        logger.warning(f"Could not load custom settings overrides: {e}")

    yield

    logger.info("Lucas application shutting down gracefully.")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Lucas — Your intelligence. Your infrastructure. Private, self-hosted AI chatbot platform with RAG.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

# Serve Frontend static assets for production deployment
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    logger.info(f"Serving production frontend from: {FRONTEND_DIST}")
    # Mount assets folder
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve SPA index.html for all non-API paths
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "status": "online",
            "message": "Lucas backend is running. Frontend dev server active at http://localhost:5173, or build frontend with 'make build' to serve locally.",
            "api_docs": "/docs"
        }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc)}
    )
