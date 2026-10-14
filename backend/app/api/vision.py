"""Vision API — analyze images via Gemini."""

import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.vision import (
    SUPPORTED_IMAGE_TYPES,
    VisionError,
    analyze_image,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/vision", tags=["vision"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    question: str = Form(default="What is in this image? Describe it in detail."),
) -> dict:
    """Upload an image and ask a question about it."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            400,
            f"Unsupported image type: {suffix}. "
            f"Allowed: {', '.join(sorted(SUPPORTED_IMAGE_TYPES))}",
        )

    target = UPLOAD_DIR / f"vision-{uuid.uuid4()}{suffix}"
    try:
        with target.open("wb") as f:
            shutil.copyfileobj(file.file, f)

        if target.stat().st_size > MAX_SIZE:
            target.unlink()
            raise HTTPException(413, "Image too large. Max: 10 MB")

        text = await analyze_image(target, question)
        return {
            "status": "ok",
            "filename": file.filename,
            "question": question,
            "response": text,
        }

    except VisionError as exc:
        raise HTTPException(exc.status_code or 500, str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Vision analysis failed")
        raise HTTPException(500, f"Analysis failed: {exc}")
    finally:
        target.unlink(missing_ok=True)