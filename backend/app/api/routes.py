"""API routes — chat streaming + health."""

import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.models.schemas import ChatRequest
from app.services.deepseek import DeepSeekError, get_deepseek_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.environment,
        "deepseek_configured": settings.is_deepseek_configured,
        "model": settings.deepseek_model,
    }


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
