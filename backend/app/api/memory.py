"""Memory API — CRUD for user facts."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services.memory import clear_all_facts, delete_fact, get_all_facts

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/memory", tags=["memory"])


class FactResponse(BaseModel):
    id: str
    key: str
    value: str
    confidence: float
    updated_at: str | None = None


@router.get("", response_model=list[FactResponse])
async def list_facts(
    session: AsyncSession = Depends(get_session),
) -> list[FactResponse]:
    facts = await get_all_facts(session)
    return [FactResponse(**f) for f in facts]


@router.delete("/{fact_id}", status_code=204)
async def remove_fact(
    fact_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    success = await delete_fact(fact_id, session)
    if not success:
        raise HTTPException(404, "Fact not found")


@router.delete("", status_code=200)
async def clear_facts(
    session: AsyncSession = Depends(get_session),
) -> dict:
    count = await clear_all_facts(session)
    return {"status": "ok", "removed": count}
