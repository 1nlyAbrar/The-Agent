"""Async SQLAlchemy session management."""

from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.models import Base


DB_PATH = Path("the_agent.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def _ensure_column(conn, table: str, column: str, ddl: str) -> None:
    """Add a column to a table if it doesn't already exist (SQLite)."""
    result = await conn.execute(text(f"PRAGMA table_info({table})"))
    rows = result.fetchall()
    existing = {row[1] for row in rows}
    if column not in existing:
        await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


async def init_db() -> None:
    """Create all tables if they don't exist, and add new columns to old tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Backfill device_id on pre-existing tables
        await _ensure_column(
            conn, "conversations", "device_id", "device_id VARCHAR(64) DEFAULT 'default'"
        )
        await _ensure_column(
            conn, "user_facts", "device_id", "device_id VARCHAR(64) DEFAULT 'default'"
        )


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for DB sessions."""
    async with SessionLocal() as session:
        yield session
