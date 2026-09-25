from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api import analyst, change, discovery, hotspots, ingest, search
from app.api.ml_routes import router as ml_router
from app.controllers.web_controller import router as web_router
from app.models.tile_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="AntarikshDrishti // Satellite Intelligence Platform",
    description="Offline-first Satellite Imagery Semantic Search & Multi-Spectral Surveillance Platform",
    version="1.4.0",
    lifespan=lifespan,
)

from fastapi.responses import JSONResponse
from fastapi import Request
import traceback

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "trace": traceback.format_exc()}
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://antariksh-drishti.vercel.app",
        "https://antarikshdrishti.onrender.com",
    ],
    allow_origin_regex=r"^https://.*\.vercel\.app$|^https://.*\.onrender\.com$|^http://localhost:.*$|^http://127\.0\.0\.1:.*$",
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

# 1. Mount modular static assets (CSS, JS)
static_dir = Path("frontend/static")
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# 2. Mount tile storage for visual previews
tiles_dir = Path("storage/tiles")
tiles_dir.mkdir(parents=True, exist_ok=True)
app.mount("/storage/tiles", StaticFiles(directory=str(tiles_dir)), name="tiles")

# API Routers
api_prefix = getattr(settings, "API_PREFIX", "/api/v1")
app.include_router(ingest.router, prefix=api_prefix)
app.include_router(search.router, prefix=api_prefix)
app.include_router(change.router, prefix=api_prefix)
app.include_router(analyst.router, prefix=api_prefix)
app.include_router(discovery.router, prefix=api_prefix)
app.include_router(hotspots.router)
app.include_router(ml_router)

# MVC Web Controller
app.include_router(web_router)


@app.get("/health", tags=["Health"])
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "mode": "offline-first",
        "system": "Aero-Sentinel Core",
    }

# Production: serve geo_search-ui built assets (must be last mount)
ui_dist_dir = Path(__file__).resolve().parent.parent / "geo_search-ui" / "dist"
if ui_dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(ui_dist_dir), html=True), name="ui")