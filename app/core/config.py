from __future__ import annotations

from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Geo-Semantic Satellite Analysis Platform"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    BASE_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2])
    DATA_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2] / "data")
    STORAGE_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2] / "storage")
    MODELS_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2] / "storage" / "models")
    TILES_DIR: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2] / "storage" / "tiles")
    QDRANT_PATH: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parents[2] / "data" / "qdrant"
    )

    DATABASE_URL: str = Field(
        default_factory=lambda: f"sqlite+aiosqlite:///{(Path(__file__).resolve().parents[2] / 'data' / 'geo_semantic.db').as_posix()}"
    )
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # Model configuration
    OPENCLIP_MODEL: str = "ViT-B-32"
    OPENCLIP_PRETRAINED: str = "openai"
    EMBEDDING_DIM: int = 512
    MODEL_CHECKPOINT_HASH: str = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    # Tiling & Resolution
    TILE_SIZE: int = 256
    TILE_STRIDE: int = 256
    MIN_VALID_PIXEL_RATIO: float = 0.80
    BLACK_PIXEL_THRESHOLD: float = 0.02

    # Vector store
    QDRANT_COLLECTION: str = "satellite_tiles"
    SEARCH_DEFAULT_TOP_K: int = 12
    CHANGE_DEFAULT_TOP_K: int = 50
    CHANGE_DRIFT_THRESHOLD: float = 0.18

    # Quality Assurance & Cloud Masking
    CLOUD_BRIGHTNESS_THRESHOLD: float = 0.85
    SHADOW_BRIGHTNESS_THRESHOLD: float = 0.05
    CLOUD_SHADOW_MAX_RATIO: float = 0.40
    NDVI_THRESHOLD_DIFF: float = 0.15

    # Change Categories
    CHANGE_CATEGORIES: List[str] = [
        "Construction / New Structure",
        "Vegetation Clearance / Deforestation",
        "Water Body Expansion / Flooding",
        "Road & Infrastructure Development",
        "Urban / Industrial Expansion",
        "Agricultural Transition",
    ]

    CORS_ORIGINS: List[str] = ["*"]
    LOG_LEVEL: str = "INFO"

    def ensure_dirs(self) -> None:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        self.TILES_DIR.mkdir(parents=True, exist_ok=True)
        self.QDRANT_PATH.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()