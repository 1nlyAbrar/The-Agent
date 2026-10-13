"""Document upload + RAG API endpoints."""

import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.parsers import ParseError
from app.services.rag import (
    delete_document,
    get_document_list,
    ingest_document,
    retrieve_context,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".xlsx", ".xls", ".json"}


@router.get("")
async def list_documents() -> dict:
    """List all ingested documents."""
    return {"documents": get_document_list()}


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)) -> dict:
    """Upload and ingest a document."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Unsupported file type: {ext}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Save to disk with unique name
    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}{ext}"
    target = UPLOAD_DIR / safe_name

    try:
        with target.open("wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        logger.exception("Upload save failed")
        raise HTTPException(500, f"Failed to save file: {e}")

    # Size check
    size = target.stat().st_size
    if size > MAX_FILE_SIZE:
        target.unlink()
        raise HTTPException(413, f"File too large ({size} bytes). Max: 25 MB")

    # Ingest
    try:
        result = ingest_document(target, document_id=doc_id)
        result["name"] = file.filename  # preserve original name
        return {"status": "ok", "document": result}
    except ParseError as e:
        target.unlink(missing_ok=True)
        raise HTTPException(422, f"Could not parse document: {e}")
    except Exception as e:
        logger.exception("Ingest failed")
        target.unlink(missing_ok=True)
        raise HTTPException(500, f"Ingest failed: {e}")


@router.delete("/{document_id}")
async def remove_document(document_id: str) -> dict:
    """Remove a document and its chunks."""
    removed = delete_document(document_id)
    if removed == 0:
        raise HTTPException(404, "Document not found")
    return {"status": "ok", "chunks_removed": removed}


@router.post("/search")
async def search_documents(payload: dict) -> dict:
    """Direct vector search (for testing)."""
    query = payload.get("query", "").strip()
    if not query:
        raise HTTPException(400, "Missing 'query'")
    top_k = int(payload.get("top_k", 5))
    results = retrieve_context(query, top_k=top_k)
    return {
        "query": query,
        "results": [
            {
                "document": c.document_name,
                "page": c.page,
                "score": round(s, 3),
                "text": c.text[:300],
            }
            for c, s in results
        ],
    }