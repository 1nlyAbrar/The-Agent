"""Shared FastAPI dependencies."""

from fastapi import Header, HTTPException


async def get_device_id(
    x_device_id: str | None = Header(default=None, alias="X-Device-ID"),
) -> str:
    """Extract the caller's device ID from the request header."""
    if not x_device_id or len(x_device_id) < 8 or len(x_device_id) > 64:
        raise HTTPException(
            status_code=400,
            detail="Missing or invalid X-Device-ID header.",
        )
    return x_device_id
