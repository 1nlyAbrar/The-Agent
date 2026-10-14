"""Memory API — CRUD for user facts, isolated per device."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_device_id
from app.db.models import UserFact
from app.db.session import get_session

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
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> list[FactResponse]:
    stmt = (
        select(UserFact)
        .where(UserFact.device_id == device_id)
        .order_by(UserFact.updated_at.desc())
    )
    result = await session.execute(stmt)
    facts = result.scalars().all()
    return [
        FactResponse(
            id=f.id,
            key=f.key,
            value=f.value,
            confidence=f.confidence,
            updated_at=f.updated_at.isoformat() if f.updated_at else None,
        )
        for f in facts
    ]


@router.delete("/{fact_id}", status_code=204)
async def remove_fact(
    fact_id: str,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> None:
    stmt = select(UserFact).where(
        UserFact.id == fact_id, UserFact.device_id == device_id
    )
    result = await session.execute(stmt)
    fact = result.scalar_one_or_none()
    if not fact:
        raise HTTPException(404, "Fact not found")
    await session.delete(fact)
    await session.commit()


@router.delete("", status_code=200)
async def clear_facts(
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> dict:
    stmt = delete(UserFact).where(UserFact.device_id == device_id)
    result = await session.execute(stmt)
    await session.commit()
    return {"status": "ok", "removed": result.rowcount or 0}
