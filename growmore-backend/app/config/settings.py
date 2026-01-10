import json
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = Field(default="GrowMore", env="APP_NAME")
    app_env: str = Field(default="development", env="APP_ENV")
    debug: bool = Field(default=True, env="DEBUG")
    api_v1_prefix: str = Field(default="/api/v1", env="API_V1_PREFIX")

    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")

    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_key: str = Field(..., env="SUPABASE_KEY")
    supabase_service_key: str = Field(..., env="SUPABASE_SERVICE_KEY")

    firebase_project_id: str = Field(..., env="FIREBASE_PROJECT_ID")
    firebase_private_key: str = Field(..., env="FIREBASE_PRIVATE_KEY")
    firebase_client_email: str = Field(..., env="FIREBASE_CLIENT_EMAIL")

    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-70b-versatile", env="GROQ_MODEL")
    groq_embedding_model: str = Field(default="llama-3.1-8b-instant", env="GROQ_EMBEDDING_MODEL")

    reddit_client_id: Optional[str] = Field(default=None, env="REDDIT_CLIENT_ID")
    reddit_client_secret: Optional[str] = Field(default=None, env="REDDIT_CLIENT_SECRET")
    reddit_user_agent: str = Field(default="GrowMore/1.0", env="REDDIT_USER_AGENT")

    scrape_interval_minutes: int = Field(default=30, env="SCRAPE_INTERVAL_MINUTES")
    news_scrape_interval_minutes: int = Field(default=15, env="NEWS_SCRAPE_INTERVAL_MINUTES")
    enable_scheduler: bool = Field(default=False, env="ENABLE_SCHEDULER")

    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="CORS_ORIGINS",
    )

    rate_limit_per_minute: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    rate_limit_authenticated: int = Field(default=120, env="RATE_LIMIT_AUTHENTICATED")

    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
