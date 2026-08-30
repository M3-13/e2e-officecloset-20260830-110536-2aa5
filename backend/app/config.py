from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from the environment (or a local ``.env``)."""

    jwt_secret: str = ""
    database_url: str = "sqlite:///./wardrobe.db"
    upload_dir: str = "./uploads"
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings, read lazily and cached once."""
    return Settings()
