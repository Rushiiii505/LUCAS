from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.database import repository
from app.database.models import (
    Conversation, ConversationDetail, ConversationCreate, ConversationUpdate
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.get("", response_model=List[Conversation])
async def get_conversations():
    """Retrieve all conversations ordered by recent activity."""
    return repository.list_conversations()

@router.post("", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_new_conversation(data: ConversationCreate):
    """Create a new conversation session."""
    return repository.create_conversation(data)

@router.get("/search", response_model=List[Conversation])
async def search_conversations(q: str = Query(..., min_length=1, description="Search query")):
    """Search conversations by title or message content."""
    return repository.search_conversations(q)

@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation_details(conversation_id: str):
    """Get conversation details with all associated messages."""
    conv = repository.get_conversation_detail(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found."
        )
    return conv

@router.patch("/{conversation_id}", response_model=Conversation)
async def update_conversation_details(conversation_id: str, data: ConversationUpdate):
    """Update title, model, or parameters for a conversation."""
    updated = repository.update_conversation(conversation_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found."
        )
    return updated

@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str):
    """Delete a conversation and its messages."""
    deleted = repository.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found."
        )
    return None
