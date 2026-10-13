"""API routes — chat streaming, RAG chat, and health."""

import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.models.schemas import ChatMessage, ChatRequest
from app.services.deepseek import DeepSeekError, get_deepseek_client
from app.db.session import SessionLocal
from app.services.memory import build_memory_context, extract_facts
from app.services.rag import build_augmented_prompt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ============================================
# Health
# ============================================

@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.environment,
        "deepseek_configured": settings.is_deepseek_configured,
        "model": settings.deepseek_model,
    }


# ============================================
# Plain chat (no RAG)
# ============================================

@router.post("/chat")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    settings = get_settings()

    if not settings.is_deepseek_configured:
        raise HTTPException(
            status_code=503,
            detail="DeepSeek API key not configured. See backend/.env",
        )

    client = get_deepseek_client()
    messages = [m.model_dump() for m in request.messages]

    async def event_generator() -> AsyncIterator[str]:
        try:
            yield _sse("start", {"model": request.model or settings.deepseek_model})
            async for chunk in client.stream_chat(
                messages=messages,
                model=request.model,
                temperature=request.temperature,
            ):
                yield _sse("token", {"content": chunk})
            yield _sse("done", {})
        except DeepSeekError as exc:
            logger.error("DeepSeek error: %s", exc)
            yield _sse("error", {"message": str(exc), "status": exc.status_code})
        except Exception:
            logger.exception("Unexpected error")
            yield _sse("error", {"message": "Internal server error"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================
# RAG chat (with document context)
# ============================================

class RagChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    temperature: float = 0.7
    use_documents: bool = False


@router.post("/chat/rag")
async def chat_with_rag(request: RagChatRequest) -> StreamingResponse:
    """Chat with optional RAG augmentation from uploaded documents."""
    settings = get_settings()

    if not settings.is_deepseek_configured:
        raise HTTPException(
            status_code=503,
            detail="DeepSeek API key not configured. See backend/.env",
        )

    client = get_deepseek_client()
    messages = [m.model_dump() for m in request.messages]

    # Extract latest user query for retrieval
    last_user = next((m for m in reversed(messages) if m["role"] == "user"), None)
    query = last_user["content"] if last_user else ""
    
    # Inject memory facts as a system message
    async with SessionLocal() as session:
        memory_context = await build_memory_context(session)
    if memory_context:
        messages = [{"role": "system", "content": memory_context}] + messages

    sources: list[dict] = []
    if request.use_documents and query:
        try:
            context_block, sources = build_augmented_prompt(query, top_k=5)
            if context_block:
                messages = [{"role": "system", "content": context_block}] + messages
        except Exception:
            logger.exception("RAG augmentation failed; falling back to plain chat")

    async def event_generator() -> AsyncIterator[str]:
        try:
            # Emit sources first so the frontend can show them immediately
            if sources:
                yield _sse("sources", {"sources": sources})

            yield _sse("start", {"model": request.model or settings.deepseek_model})

            full_response = ""
            async for chunk in client.stream_chat(
                messages=messages,
                model=request.model,
                temperature=request.temperature,
            ):
                full_response += chunk
                yield _sse("token", {"content": chunk})

            yield _sse("done", {})

            # Auto-extract facts (non-fatal)
            try:
                conversation_text = "\n".join(
                    f"{m['role']}: {m['content']}"
                    for m in messages
                    if m["role"] != "system"
                )
                conversation_text += f"\nassistant: {full_response}"

                async with SessionLocal() as session:
                    saved = await extract_facts(conversation_text, session)
                if saved:
                    logger.info("Extracted %d facts", len(saved))
            except Exception:
                logger.exception("Fact extraction failed (non-fatal)")
        except DeepSeekError as exc:
            logger.error("DeepSeek error: %s", exc)
            yield _sse("error", {"message": str(exc), "status": exc.status_code})
        except Exception:
            logger.exception("Unexpected error")
            yield _sse("error", {"message": "Internal server error"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
