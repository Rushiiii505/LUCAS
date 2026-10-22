import json
import uuid
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from app.config import settings
from app.database import repository
from app.database.models import (
    ChatRequest, ChatStopRequest, RegenerateRequest, ConversationCreate, Citation
)
from app.services.ollama_service import ollama_service
from app.services.rag_service import rag_service
from app.utils.logger import logger

router = APIRouter(prefix="/chat", tags=["Chat"])

# Active generation cancellation signals: conversation_id -> asyncio.Event
ACTIVE_CANCELLATIONS: Dict[str, asyncio.Event] = {}
# Concurrency limit for generations on Pi 5 (4GB RAM)
GENERATION_SEMAPHORE = asyncio.Semaphore(settings.max_simultaneous_generations)

def generate_conversation_title(first_message: str) -> str:
    """Generate a clean, readable title from the initial prompt."""
    cleaned = " ".join(first_message.strip().split())
    if len(cleaned) <= 35:
        return cleaned.capitalize()
    words = cleaned.split()[:6]
    title = " ".join(words)
    return title.capitalize() + "..."

@router.post("/stop")
async def stop_generation(req: ChatStopRequest):
    """Signals an ongoing generation stream for this conversation to stop."""
    conv_id = req.conversation_id
    if conv_id in ACTIVE_CANCELLATIONS:
        ACTIVE_CANCELLATIONS[conv_id].set()
        logger.info(f"Stop signal sent for conversation {conv_id}")
        return {"status": "stopped", "conversation_id": conv_id}
    return {"status": "not_active", "conversation_id": conv_id}

@router.post("/stream")
async def chat_stream_endpoint(req: ChatRequest, request: Request):
    """
    Primary conversational streaming endpoint using Server-Sent Events (SSE).
    Orchestrates: RAG retrieval -> Context injection -> Ollama streaming -> SQLite persistence.
    """
    # 1. Resolve or create conversation
    conv_id = req.conversation_id
    if not conv_id:
        conv = repository.create_conversation(ConversationCreate(
            title=generate_conversation_title(req.message),
            model=req.model or settings.default_model,
            rag_enabled=req.rag_enabled if req.rag_enabled is not None else True,
            system_prompt=req.system_prompt or settings.default_system_prompt,
            temperature=req.temperature or settings.default_temperature
        ))
        conv_id = conv.id
    else:
        conv = repository.get_conversation(conv_id)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conv_id} not found."
            )
        # Update title if it was default
        if conv.title in ("New Conversation", "Untitled Conversation"):
            new_title = generate_conversation_title(req.message)
            repository.update_conversation(conv_id, ConversationCreate(title=new_title))

    # Determine effective settings
    model_to_use = req.model or conv.model or settings.default_model
    if not model_to_use:
        # Discover first installed model dynamically
        installed = await ollama_service.list_models()
        if installed:
            model_to_use = installed[0]["name"]
        else:
            model_to_use = "llama2-uncensored:latest"

    is_rag_enabled = req.rag_enabled if req.rag_enabled is not None else conv.rag_enabled
    temperature = req.temperature if req.temperature is not None else conv.temperature
    system_prompt = req.system_prompt or conv.system_prompt or settings.default_system_prompt

    # 2. Persist User Message
    user_msg = repository.create_message(
        conversation_id=conv_id,
        role="user",
        content=req.message,
        status="completed"
    )

    # 3. Create Assistant Message placeholder
    assistant_msg_id = str(uuid.uuid4())
    assistant_msg = repository.create_message(
        conversation_id=conv_id,
        role="assistant",
        content="",
        status="streaming",
        custom_id=assistant_msg_id
    )

    # Set up cancellation token
    cancel_event = asyncio.Event()
    ACTIVE_CANCELLATIONS[conv_id] = cancel_event

    async def event_generator():
        accumulated_text = []
        citations_list: list[Citation] = []
        status_state = "completed"

        try:
            # Send initial metadata event
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': conv_id, 'user_message_id': user_msg.id, 'assistant_message_id': assistant_msg_id, 'model': model_to_use})}\n\n"

            # 4. RAG Retrieval if enabled
            effective_system_prompt = system_prompt
            if is_rag_enabled:
                try:
                    rag_context, citations = await rag_service.retrieve_context(req.message)
                    citations_list = citations
                    if citations:
                        yield f"data: {json.dumps({'type': 'citations', 'citations': [c.model_dump() for c in citations]})}\n\n"
                    if rag_context:
                        effective_system_prompt = f"{system_prompt}\n\n{rag_context}"
                except Exception as e:
                    logger.error(f"RAG retrieval warning: {e}")

            # 5. Build conversation history within bounded context window
            recent_msgs = repository.get_conversation_messages(conv_id)
            # Exclude the current in-progress assistant message and keep up to max_history_messages
            history_candidates = [m for m in recent_msgs if m.id != assistant_msg_id]
            history_window = history_candidates[-settings.max_history_messages:]
            
            ollama_messages = [
                {"role": m.role, "content": m.content}
                for m in history_window
            ]

            # 6. Stream from Ollama with bounded semaphore
            async with GENERATION_SEMAPHORE:
                async for chunk in ollama_service.chat_stream(
                    messages=ollama_messages,
                    model=model_to_use,
                    temperature=temperature,
                    system_prompt=effective_system_prompt
                ):
                    # Check cancellation
                    if cancel_event.is_set():
                        status_state = "stopped"
                        yield f"data: {json.dumps({'type': 'stopped', 'message': 'Generation cancelled by user'})}\n\n"
                        break

                    # Check client disconnect
                    if await request.is_disconnected():
                        status_state = "stopped"
                        logger.info("Client disconnected during stream")
                        break

                    if "error" in chunk:
                        status_state = "failed"
                        yield f"data: {json.dumps({'type': 'error', 'error': chunk['error']})}\n\n"
                        break

                    token = chunk.get("content", "")
                    if token:
                        accumulated_text.append(token)
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                    if chunk.get("done"):
                        break

        except Exception as e:
            status_state = "failed"
            logger.error(f"Error during stream generation: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

        finally:
            # Clean up active cancellation
            ACTIVE_CANCELLATIONS.pop(conv_id, None)

            # 7. Persist final assistant response and citations to SQLite
            final_content = "".join(accumulated_text)
            repository.update_message(
                msg_id=assistant_msg_id,
                content=final_content,
                status=status_state,
                sources=citations_list if citations_list else None
            )
            repository.touch_conversation(conv_id)

            # Send done event
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id, 'message_id': assistant_msg_id, 'status': status_state, 'citations': [c.model_dump() for c in citations_list]})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.post("", response_model=Dict[str, Any])
async def chat_sync_endpoint(req: ChatRequest):
    """Non-streaming chat endpoint alternative."""
    conv_id = req.conversation_id
    if not conv_id:
        conv = repository.create_conversation(ConversationCreate(
            title=generate_conversation_title(req.message),
            model=req.model or settings.default_model,
            rag_enabled=req.rag_enabled if req.rag_enabled is not None else True
        ))
        conv_id = conv.id
    else:
        conv = repository.get_conversation(conv_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

    model_to_use = req.model or conv.model or settings.default_model
    if not model_to_use:
        installed = await ollama_service.list_models()
        model_to_use = installed[0]["name"] if installed else "llama2-uncensored:latest"

    # User message
    user_msg = repository.create_message(conversation_id=conv_id, role="user", content=req.message)

    # RAG
    citations_list: list[Citation] = []
    effective_system_prompt = conv.system_prompt or settings.default_system_prompt
    if req.rag_enabled or (req.rag_enabled is None and conv.rag_enabled):
        rag_context, citations = await rag_service.retrieve_context(req.message)
        citations_list = citations
        if rag_context:
            effective_system_prompt = f"{effective_system_prompt}\n\n{rag_context}"

    recent_msgs = repository.get_conversation_messages(conv_id)
    history_window = recent_msgs[-settings.max_history_messages:]
    ollama_messages = [{"role": m.role, "content": m.content} for m in history_window]

    accumulated = []
    async with GENERATION_SEMAPHORE:
        async for chunk in ollama_service.chat_stream(
            messages=ollama_messages,
            model=model_to_use,
            temperature=conv.temperature,
            system_prompt=effective_system_prompt
        ):
            if "error" in chunk:
                raise HTTPException(status_code=500, detail=chunk["error"])
            token = chunk.get("content", "")
            if token:
                accumulated.append(token)

    content = "".join(accumulated)
    assistant_msg = repository.create_message(
        conversation_id=conv_id,
        role="assistant",
        content=content,
        sources=citations_list if citations_list else None,
        status="completed"
    )

    return {
        "conversation_id": conv_id,
        "message": assistant_msg.model_dump(),
        "citations": [c.model_dump() for c in citations_list]
    }

@router.post("/{conversation_id}/regenerate")
async def regenerate_message(conversation_id: str, req: RegenerateRequest, request: Request):
    """Regenerates the last assistant response for the conversation."""
    conv = repository.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = repository.get_conversation_messages(conversation_id)
    if not messages:
        raise HTTPException(status_code=400, detail="No messages in conversation to regenerate")

    # Find the last user message
    last_user_msg = None
    for m in reversed(messages):
        if m.role == "user":
            last_user_msg = m
            break

    if not last_user_msg:
        raise HTTPException(status_code=400, detail="No user message found to regenerate response for")

    # Call streaming endpoint logic with the last user message
    chat_req = ChatRequest(
        conversation_id=conversation_id,
        message=last_user_msg.content,
        model=req.model or conv.model,
        rag_enabled=req.rag_enabled if req.rag_enabled is not None else conv.rag_enabled,
        stream=True
    )
    return await chat_stream_endpoint(chat_req, request)
