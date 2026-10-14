"""Memory service — extracts and stores facts per device."""

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
  {"key": "name", "value": "Abrar Faiyaz", "confidence": 1.0}
]

CONVERSATION:
{conversation}

Extract facts now:"""


async def extract_facts(
    conversation_text: str,
    session: AsyncSession,
    device_id: str,
) -> list[dict]:
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

        stmt = select(UserFact).where(
            UserFact.key == key, UserFact.device_id == device_id
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            if len(value) >= len(existing.value):
                existing.value = value
                existing.confidence = confidence
        else:
            session.add(
                UserFact(key=key, value=value, confidence=confidence, device_id=device_id)
            )

        saved.append({"key": key, "value": value})

    if saved:
        await session.commit()

    return saved


async def build_memory_context(session: AsyncSession, device_id: str) -> str:
    stmt = (
        select(UserFact)
        .where(UserFact.device_id == device_id)
        .order_by(UserFact.updated_at.desc())
    )
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
