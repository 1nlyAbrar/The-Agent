"""Conversation CRUD API — isolated per device."""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_device_id
from app.db.models import Conversation, Message
from app.db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/conversations", tags=["conversations"])


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


async def _get_owned_conversation(
    conversation_id: str, device_id: str, session: AsyncSession
) -> Conversation:
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.device_id == device_id)
    )
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(404, "Conversation not found")
    return conv


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> list[ConversationSummary]:
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.device_id == device_id)
        .order_by(desc(Conversation.updated_at))
    )
    result = await session.execute(stmt)
    conversations = result.scalars().all()

    summaries = []
    for c in conversations:
        preview = None
        if c.messages:
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
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> ConversationSchema:
    conv = Conversation(title=req.title or "New conversation", device_id=device_id)
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
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> list[ConversationSummary]:
    pattern = f"%{q}%"
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.device_id == device_id)
        .where(Conversation.title.ilike(pattern))
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
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> ConversationSchema:
    conv = await _get_owned_conversation(conversation_id, device_id, session)
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
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> ConversationSchema:
    conv = await _get_owned_conversation(conversation_id, device_id, session)
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
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    conv = await _get_owned_conversation(conversation_id, device_id, session)
    await session.delete(conv)
    await session.commit()


@router.post("/{conversation_id}/messages", response_model=MessageSchema, status_code=201)
async def add_message(
    conversation_id: str,
    req: AddMessageRequest,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> MessageSchema:
    conv = await _get_owned_conversation(conversation_id, device_id, session)

    msg = Message(
        conversation_id=conversation_id,
        role=req.role,
        content=req.content,
        sources_json=json.dumps(req.sources) if req.sources else None,
    )
    session.add(msg)

    if req.role == "user" and conv.title == "New conversation":
        conv.title = req.content[:60]

    await session.commit()
    await session.refresh(msg)
    return _msg_to_schema(msg)
