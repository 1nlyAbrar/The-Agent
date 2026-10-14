"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    deepseek_api_key: str = ""
    google_api_key: str = ""
    deepseek_base_url: str = "https://tokenharbor.ai/v1"
    deepseek_model: str = "deepseek-v4-flash"
    deepseek_reasoning_model: str = "deepseek-v4-flash"

    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"
    log_level: str = "info"
    cors_origins: str = "http://localhost:3000"
    max_input_tokens: int = 8000
    request_timeout: int = 120

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_deepseek_configured(self) -> bool:
        # Accept any non-empty key (Token Harbor keys start with thk_live_)
        key = self.deepseek_api_key.strip()
        return bool(key and len(key) > 10 and "your-actual-key" not in key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
