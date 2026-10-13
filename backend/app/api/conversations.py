"""Conversation CRUD API."""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Conversation, Message
from app.db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/conversations", tags=["conversations"])


# ============================================
# Schemas
# ============================================

class MessageSchema(BaseModel):
    id: str
    role: str
    content: str
    sources: list[dict] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationSchema(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageSchema] = []


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    preview: str | None = None


class CreateConversationRequest(BaseModel):
    title: str | None = "New conversation"


class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class AddMessageRequest(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)
    sources: list[dict] | None = None


# ============================================
# Helpers
# ============================================

def _msg_to_schema(msg: Message) -> MessageSchema:
    sources = None
    if msg.sources_json:
        try:
            sources = json.loads(msg.sources_json)
        except json.JSONDecodeError:
            sources = None
    return MessageSchema(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        sources=sources,
        created_at=msg.created_at,
    )


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=list[ConversationSummary])
async def list_conversations(
    session: AsyncSession = Depends(get_session),
) -> list[ConversationSummary]:
    """List all conversations (newest first) with message counts."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .order_by(desc(Conversation.updated_at))
    )
    result = await session.execute(stmt)
    conversations = result.scalars().all()

    summaries = []
    for c in conversations:
        preview = None
        if c.messages:
            # First user message as preview
            first_user = next((m for m in c.messages if m.role == "user"), None)
            if first_user:
                preview = first_user.content[:80]
        summaries.append(
            ConversationSummary(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=len(c.messages),
                preview=preview,
            )
        )
    return summaries


@router.post("", response_model=ConversationSchema, status_code=201)
async def create_conversation(
    req: CreateConversationRequest,
    session: AsyncSession = Depends(get_session),
) -> ConversationSchema:
    """Create a new empty conversation."""
    conv = Conversation(title=req.title or "New conversation")
    session.add(conv)
    await session.commit()
    await session.refresh(conv, ["messages"])
    return ConversationSchema(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[],
    )


@router.get("/search", response_model=list[ConversationSummary])
async def search_conversations(
    q: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
) -> list[ConversationSummary]:
    """Search conversations by title or message content."""
    pattern = f"%{q}%"
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            or_(
                Conversation.title.ilike(pattern),
                Conversation.messages.any(Message.content.ilike(pattern)),
            )
        )
        .order_by(desc(Conversation.updated_at))
        .limit(50)
    )
    result = await session.execute(stmt)
    conversations = result.scalars().all()
    return [
        ConversationSummary(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages),
        )
        for c in conversations
    ]


@router.get("/{conversation_id}", response_model=ConversationSchema)
async def get_conversation(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> ConversationSchema:
    """Get a single conversation with all messages."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    return ConversationSchema(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[_msg_to_schema(m) for m in conv.messages],
    )


@router.put("/{conversation_id}", response_model=ConversationSchema)
async def rename_conversation(
    conversation_id: str,
    req: RenameConversationRequest,
    session: AsyncSession = Depends(get_session),
) -> ConversationSchema:
    """Rename a conversation."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    conv.title = req.title
    await session.commit()
    await session.refresh(conv, ["messages"])

    return ConversationSchema(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[_msg_to_schema(m) for m in conv.messages],
    )


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a conversation and all its messages."""
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(404, "Conversation not found")
    await session.delete(conv)
    await session.commit()


@router.post("/{conversation_id}/messages", response_model=MessageSchema, status_code=201)
async def add_message(
    conversation_id: str,
    req: AddMessageRequest,
    session: AsyncSession = Depends(get_session),
) -> MessageSchema:
    """Append a message to a conversation."""
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    msg = Message(
        conversation_id=conversation_id,
        role=req.role,
        content=req.content,
        sources_json=json.dumps(req.sources) if req.sources else None,
    )
    session.add(msg)

    # Auto-title from first user message
    if req.role == "user" and conv.title == "New conversation":
        conv.title = req.content[:60]

    await session.commit()
    await session.refresh(msg)
    return _msg_to_schema(msg)