"""Memory service — extracts and stores facts about the user."""

import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserFact

logger = logging.getLogger(__name__)


EXTRACTION_PROMPT = """You are a memory extraction system. Analyze the conversation below and extract FACTS about the user.

RULES:
- Only extract EXPLICIT facts the user stated about themselves
- Do NOT guess, infer, or hallucinate
- Categories: name, location, language, job, project, preference, goal, hobby, education, age, relationship
- Return ONLY valid JSON — no explanations
- Maximum 5 facts per conversation
- If nothing to extract, return []

OUTPUT FORMAT (strict JSON array):
[
  {"key": "name", "value": "Abrar Faiyaz", "confidence": 1.0},
  {"key": "location", "value": "Dhaka, Bangladesh", "confidence": 0.9}
]

CONVERSATION:
{conversation}

Extract facts now:"""


async def extract_facts(
    conversation_text: str,
    session: AsyncSession,
) -> list[dict]:
    """Use the AI to extract facts from a conversation. Upsert by key."""
    from app.services.deepseek import get_deepseek_client

    client = get_deepseek_client()
    prompt = EXTRACTION_PROMPT.replace("{conversation}", conversation_text[:8000])

    try:
        raw = ""
        async for chunk in client.stream_chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        ):
            raw += chunk

        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        facts = json.loads(raw)
        if not isinstance(facts, list):
            return []

    except Exception as e:
        logger.error("Fact extraction failed: %s", e)
        return []

    saved = []
    for fact in facts[:5]:
        key = str(fact.get("key", "")).strip().lower()[:100]
        value = str(fact.get("value", "")).strip()
        confidence = float(fact.get("confidence", 1.0))

        if not key or not value:
            continue

        stmt = select(UserFact).where(UserFact.key == key)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            if len(value) >= len(existing.value):
                existing.value = value
                existing.confidence = confidence
        else:
            session.add(UserFact(key=key, value=value, confidence=confidence))

        saved.append({"key": key, "value": value})

    if saved:
        await session.commit()

    return saved


async def get_all_facts(session: AsyncSession) -> list[dict]:
    """Fetch all stored facts."""
    stmt = select(UserFact).order_by(UserFact.updated_at.desc())
    result = await session.execute(stmt)
    facts = result.scalars().all()
    return [
        {
            "id": f.id,
            "key": f.key,
            "value": f.value,
            "confidence": f.confidence,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        }
        for f in facts
    ]


async def build_memory_context(session: AsyncSession) -> str:
    """Build a system prompt prefix with all known facts."""
    stmt = select(UserFact).order_by(UserFact.updated_at.desc())
    result = await session.execute(stmt)
    facts = result.scalars().all()

    if not facts:
        return ""

    lines = [f"- {f.key}: {f.value}" for f in facts]
    return (
        "You remember the following facts about the user from past conversations. "
        "Use them naturally when relevant. Do NOT mention that you have a memory system — "
        "just use the knowledge as if you always knew.\n\n"
        "KNOWN FACTS:\n" + "\n".join(lines)
    )


async def delete_fact(fact_id: str, session: AsyncSession) -> bool:
    stmt = select(UserFact).where(UserFact.id == fact_id)
    result = await session.execute(stmt)
    fact = result.scalar_one_or_none()
    if not fact:
        return False
    await session.delete(fact)
    await session.commit()
    return True


async def clear_all_facts(session: AsyncSession) -> int:
    stmt = select(UserFact)
    result = await session.execute(stmt)
    facts = result.scalars().all()
    count = len(facts)
    for f in facts:
        await session.delete(f)
    await session.commit()
    return count
