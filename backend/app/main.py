"""THE AGENT — FastAPI Backend Entry Point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.api.documents import router as documents_router
from app.api.conversations import router as conversations_router
from app.api.memory import router as memory_router
from app.core.config import get_settings
from app.db.session import init_db
from app.services.deepseek import get_deepseek_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="THE AGENT API",
    description="Backend for THE AGENT — One Agent. Infinite Possibilities.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(documents_router)
app.include_router(conversations_router)
app.include_router(memory_router)


@app.get("/")
async def root() -> dict:
    return {
        "name": "THE AGENT API",
        "version": "0.1.0",
        "tagline": "One Agent. Infinite Possibilities.",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.on_event("startup")
async def startup() -> None:
    await init_db()
    logger.info("Database initialized")

    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("  THE AGENT — Backend Online")
    logger.info("  Environment: %s", settings.environment)
    logger.info("  Model: %s", settings.deepseek_model)
    logger.info(
        "  DeepSeek configured: %s",
        "yes" if settings.is_deepseek_configured else "NO — add key to .env",
    )
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


@app.on_event("shutdown")
async def shutdown() -> None:
    await get_deepseek_client().close()
    logger.info("THE AGENT — Backend shutting down")