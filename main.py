from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import analyst, change, discovery, ingest, review, search, tiles
from app.core.config import settings
from app.core.database import close_db, init_db
from app.ml.embedder import get_embedder
from app.services.qdrant_store import get_qdrant_store

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Geo-Semantic Backend & Storage (100% Offline Mode)...")
    settings.ensure_dirs()
    await init_db()
    get_qdrant_store()
    get_embedder()
    logger.info("Database, Local Qdrant, and VLM Embedder successfully initialized.")
    yield
    await close_db()
    logger.info("Geo-Semantic Backend shut down cleanly.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Offline semantic satellite imagery search, multi-temporal change detection & analyst review",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(ingest.router, prefix=settings.API_PREFIX)
app.include_router(search.router, prefix=settings.API_PREFIX)
app.include_router(change.router, prefix=settings.API_PREFIX)
app.include_router(review.router, prefix=settings.API_PREFIX)
app.include_router(analyst.router, prefix=settings.API_PREFIX)
app.include_router(tiles.router, prefix=settings.API_PREFIX)
app.include_router(discovery.router, prefix=settings.API_PREFIX)


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "mode": "offline",
        "engine": "Geo-Semantic 1.0.0",
        "model_hash": settings.MODEL_CHECKPOINT_HASH,
    }


# Mount Static Frontend Dashboard
frontend_dir = settings.BASE_DIR / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")