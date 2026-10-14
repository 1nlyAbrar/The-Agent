"""Vision service — image understanding via Groq's API."""

import base64
import logging
from pathlib import Path

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GROQ_VISION_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_VISION_MODEL = "qwen/qwen3.6-27b"
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
    """Get the API key from settings (should be a Groq key)."""
    settings = get_settings()
    key = (settings.deepseek_api_key or "").strip()
    if not key:
        raise VisionError(
            "No API key configured. Set DEEPSEEK_API_KEY with your Groq key.",
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
    """Send an image + question to Groq Vision. Returns text response."""
    api_key = _get_api_key()
    image_b64, mime = _encode_image(path)

    payload = {
        "model": GROQ_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT.format(question=question)},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{image_b64}"
                        }
                    },
                ]
            }
        ],
        "max_completion_tokens": 2048,
        "temperature": 1,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                GROQ_VISION_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
        except httpx.RequestError as exc:
            raise VisionError(f"Network error: {exc}", status_code=502) from exc

    if resp.status_code != 200:
        raw = resp.text
        logger.error("Groq Vision error %s: %s", resp.status_code, raw[:300])
        raise VisionError(
            f"Vision API error: {raw[:200]}",
            status_code=resp.status_code,
        )

    data = resp.json()

    try:
        choices = data.get("choices", [])
        if not choices:
            raise VisionError("No response from vision model", status_code=500)
        content = choices[0].get("message", {}).get("content", "")
        if not content:
            raise VisionError("Empty response from vision model", status_code=500)
        return content
    except (KeyError, IndexError, TypeError) as exc:
        raise VisionError(f"Unexpected response format: {exc}", status_code=500) from exc
