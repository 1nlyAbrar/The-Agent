"""DeepSeek API client with streaming support."""

import json
from typing import AsyncIterator

import httpx

from app.core.config import get_settings


class DeepSeekError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class DeepSeekClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.settings.deepseek_base_url,
                headers={
                    "Authorization": f"Bearer {self.settings.deepseek_api_key}",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(self.settings.request_timeout),
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        if not self.settings.is_deepseek_configured:
            raise DeepSeekError(
                "DeepSeek API key is not configured. Add DEEPSEEK_API_KEY to backend/.env",
                status_code=503,
            )

        payload: dict = {
            "model": model or self.settings.deepseek_model,
            "messages": messages,
            "stream": True,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens

        client = await self._get_client()

        try:
            async with client.stream("POST", "/chat/completions", json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    try:
                        error_json = json.loads(error_body)
                        message = error_json.get("error", {}).get("message", str(error_body))
                    except json.JSONDecodeError:
                        message = error_body.decode("utf-8", errors="replace")
                    raise DeepSeekError(
                        f"DeepSeek API error: {message}",
                        status_code=response.status_code,
                    )

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choices = chunk.get("choices", [])
                    if not choices:
                        continue
                    delta = choices[0].get("delta", {})
                    content = delta.get("content")
                    if content:
                        yield content

        except httpx.TimeoutException as exc:
            raise DeepSeekError(
                f"DeepSeek request timed out after {self.settings.request_timeout}s",
                status_code=504,
            ) from exc
        except httpx.RequestError as exc:
            raise DeepSeekError(
                f"Failed to reach DeepSeek: {exc}",
                status_code=502,
            ) from exc


_client: DeepSeekClient | None = None


def get_deepseek_client() -> DeepSeekClient:
    global _client
    if _client is None:
        _client = DeepSeekClient()
    return _client
