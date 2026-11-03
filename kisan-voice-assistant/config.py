
"""Central configuration for Kisan Voice Assistant."""

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Base Paths
    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = BASE_DIR / "data"
    ADVISORIES_DIR: Path = DATA_DIR / "advisories"
    SCHEMES_DIR: Path = DATA_DIR / "schemes"
    CHROMA_PERSIST_DIR: Path = DATA_DIR / "chroma_db"

    # LLM Settings
    LLM_PROVIDER: Literal["ollama", "anthropic", "gemini"] = "gemini"

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b-instruct-q4_K_M"

    # Mandi API
    DATA_GOV_IN_API_KEY: str = ""

    # Embedding & RAG
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-m3"
    RERANKER_MODEL_NAME: str = "BAAI/bge-reranker-base"
    USE_RERANKER: bool = False
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 80
    RAG_TOP_K: int = 4
    DEVICE: str = "cpu"

    # Speech Configuration
    WHISPER_MODEL_SIZE: str = "small"
    TTS_FALLBACK_OFFLINE: bool = False


settings = Settings()

# Ensure directories exist
settings.ADVISORIES_DIR.mkdir(parents=True, exist_ok=True)
settings.SCHEMES_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)
