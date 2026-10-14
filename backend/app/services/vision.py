"""Gemini Vision service — image understanding via Google's API."""

import base64
import logging
from pathlib import Path

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

SUPPORTED_IMAGE_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}

VISION_PROMPT = """You are THE AGENT analyzing an image. Provide a clear, detailed response.

The user's question: {question}

Please:
- Answer directly and thoroughly
- Extract any visible text verbatim if relevant
- Describe charts, tables, or diagrams with specifics
- Mention uncertainties honestly"""


class VisionError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _get_api_key() -> str:
    """Get the Google API key from settings."""
    settings = get_settings()
    key = (settings.google_api_key or "").strip()
    if not key:
        alt = settings.deepseek_api_key.strip()
        if alt.startswith("AIza"):
            key = alt
        else:
            raise VisionError(
                "Vision requires GOOGLE_API_KEY environment variable. "
                "Add it in Render with your Google Gemini API key.",
                status_code=400,
            )
    if not key.startswith("AIza"):
        raise VisionError(
            "GOOGLE_API_KEY must start with 'AIza'. "
            "Get yours at https://aistudio.google.com/apikey",
            status_code=400,
        )
    return key


def _encode_image(path: Path) -> tuple[str, str]:
    """Return (base64_data, mime_type) for an image file."""
    suffix = path.suffix.lower()
    mime = SUPPORTED_IMAGE_TYPES.get(suffix)
    if not mime:
        raise VisionError(f"Unsupported image format: {suffix}", status_code=415)

    size = path.stat().st_size
    if size > MAX_IMAGE_SIZE:
        raise VisionError(
            f"Image too large ({size / 1024 / 1024:.1f} MB). Max: 10 MB.",
            status_code=413,
        )

    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return data, mime


async def analyze_image(path: Path, question: str) -> str:
    """Send an image + question to Gemini Vision. Returns text response."""
    api_key = _get_api_key()
    image_b64, mime = _encode_image(path)

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": VISION_PROMPT.format(question=question)},
                    {
                        "inline_data": {
                            "mime_type": mime,
                            "data": image_b64,
                        }
                    },
                ]
            }
        ]
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{GEMINI_API_URL}?key={api_key}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
        except httpx.RequestError as exc:
            raise VisionError(f"Network error: {exc}", status_code=502) from exc

    if resp.status_code != 200:
        raw = resp.text
        logger.error("Gemini Vision error %s: %s", resp.status_code, raw[:300])
        raise VisionError(
            f"Vision API error: {raw[:200]}",
            status_code=resp.status_code,
        )

    data = resp.json()

    try:
        candidates = data.get("candidates", [])
        if not candidates:
            raise VisionError("No response from vision model", status_code=500)
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts)
        if not text:
            raise VisionError("Empty response from vision model", status_code=500)
        return text
    except (KeyError, IndexError, TypeError) as exc:
        raise VisionError(f"Unexpected response format: {exc}", status_code=500) from exc