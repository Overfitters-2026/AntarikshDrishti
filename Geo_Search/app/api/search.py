from __future__ import annotations

from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel, Field, field_validator
from qdrant_client.http import models as qmodels
from app.services.qdrant_store import QdrantStore, get_qdrant_store
from app.core.config import settings
from app.ml.embedder import get_embedder
from app.services.qdrant_store import get_qdrant_store
from qdrant_client.http import models

router = APIRouter(prefix="/search", tags=["search"])


class TextSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=512)
    top_k: int = Field(default=settings.SEARCH_DEFAULT_TOP_K, ge=1, le=100)
    date: Optional[str] = None
    sensor: Optional[str] = None


def _bbox_center(bbox: Optional[dict[str, Any]]) -> tuple[float, float]:
    bounds = (bbox or {}).get("bounds") if bbox else None
    crs = (bbox or {}).get("crs")
    if isinstance(bounds, list) and len(bounds) == 4:
        left, bottom, right, top = bounds
        center_y = float((bottom + top) / 2.0)
        center_x = float((left + right) / 2.0)
        if crs and str(crs).strip().upper() != "EPSG:4326":
            try:
                from rasterio.warp import transform
                xs, ys = transform(crs, "EPSG:4326", [center_x], [center_y])
                return float(ys[0]), float(xs[0])
            except Exception:
                pass
        return center_y, center_x
    return 0.0, 0.0


class SearchHit(BaseModel):
    score: float
    tile_id: str
    bbox: dict[str, Any]
    date: str
    sensor: str
    image_path: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class SearchResponse(BaseModel):
    mode: Literal["text", "image"]
    query: Optional[str] = None
    top_k: int
    results: list[SearchHit]


def _build_filter(date: Optional[str], sensor: Optional[str]) -> Optional[qmodels.Filter]:
    must: list[qmodels.FieldCondition] = []
    if date:
        must.append(qmodels.FieldCondition(key="date", match=qmodels.MatchValue(value=date)))
    if sensor:
        must.append(qmodels.FieldCondition(key="sensor", match=qmodels.MatchValue(value=sensor)))
    if not must:
        return None
    return qmodels.Filter(must=must)


def _to_hits(scored_points) -> list[SearchHit]:
    hits: list[SearchHit] = []
    for sp in scored_points:
        payload = sp.payload or {}
        bbox = payload.get("bbox", {})
        lat, lng = _bbox_center(bbox if isinstance(bbox, dict) else None)
        hits.append(
            SearchHit(
                score=float(sp.score),
                tile_id=str(payload.get("tile_id", "")),
                bbox=bbox,
                date=str(payload.get("date", "")),
                sensor=str(payload.get("sensor", "")),
                image_path=str(payload.get("image_path", "")),
                lat=lat,
                lng=lng,
            )
        )
    return hits


@router.post("/text", response_model=SearchResponse)
async def search_by_text(payload: TextSearchRequest) -> SearchResponse:
    embedder = get_embedder()
    store = get_qdrant_store()

    vector = await embedder.embed_text_async(payload.query.strip())
    query_filter = _build_filter(payload.date, payload.sensor)

    scored = await store.run_sync(
        store.search,
        vector,
        top_k=payload.top_k,
        query_filter=query_filter,
    )

    return SearchResponse(
        mode="text",
        query=payload.query,
        top_k=payload.top_k,
        results=_to_hits(scored),
    )


class ImagePathSearchRequest(BaseModel):
    image_path: str = Field(..., min_length=1)
    top_k: int = Field(default=settings.SEARCH_DEFAULT_TOP_K, ge=1, le=100)
    date: Optional[str] = None
    sensor: Optional[str] = None

    @field_validator("image_path")
    @classmethod
    def non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("image_path cannot be empty")
        return v


@router.post("/image-path", response_model=SearchResponse)
async def search_by_image_path(payload: ImagePathSearchRequest) -> SearchResponse:
    from pathlib import Path
    import asyncio

    embedder = get_embedder()
    store = get_qdrant_store()

    path = Path(payload.image_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {payload.image_path}")

    loop = asyncio.get_running_loop()
    vector = await loop.run_in_executor(None, embedder.embed_image_path, str(path))

    query_filter = _build_filter(payload.date, payload.sensor)
    scored = await store.run_sync(
        store.search,
        vector,
        top_k=payload.top_k,
        query_filter=query_filter,
    )

    return SearchResponse(
        mode="image",
        query=None,
        top_k=payload.top_k,
        results=_to_hits(scored),
    )
@router.post("/image-upload", response_model=SearchResponse)
async def search_by_image_upload(
    file: UploadFile = File(...),
    top_k: int = Form(default=settings.SEARCH_DEFAULT_TOP_K),
    date: Optional[str] = Form(default=None),
    sensor: Optional[str] = Form(default=None),
) -> SearchResponse:
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    embedder = get_embedder()
    store = get_qdrant_store()
    data = await file.read()
    vector = await embedder.embed_image_bytes_async(data)

    query_filter = _build_filter(date, sensor)
    scored = await store.run_sync(
        store.search,
        vector,
        top_k=top_k,
        query_filter=query_filter,
    )

    return SearchResponse(
        mode="image",
        query=None,
        top_k=top_k,
        results=_to_hits(scored),
    )
@router.get("/filter-by-tag")
async def filter_by_tag(tag: str, limit: int = 10, store: QdrantStore = Depends(get_qdrant_store)):
    """
    Directly query tiles belonging to a specific predicted ML category.
    """
    results, _ = store._client.scroll(
        collection_name=store.collection_name,
        scroll_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="primary_tag",
                    match=models.MatchValue(value=tag)
                )
            ]
        ),
        limit=limit,
        with_payload=True
    )
    return {"tag": tag, "total": len(results), "tiles": [r.payload for r in results]}


class SimilarTileSearchRequest(BaseModel):
    tile_id: str = Field(..., min_length=1)
    top_k: int = Field(default=6, ge=1, le=50)
    exclude_self: bool = True


@router.post("/similar-tile", response_model=SearchResponse)
async def search_similar_tiles(payload: SimilarTileSearchRequest) -> SearchResponse:
    """
    Visual clustering / similarity search: looks up the embedding of the query tile
    and performs cosine ANN vector search to find structurally similar geographical locations.
    """
    store = get_qdrant_store()

    candidate_ids = [payload.tile_id]
    if "__" in payload.tile_id:
        p1, p2 = payload.tile_id.split("__", 1)
        candidate_ids = [p2, p1, payload.tile_id]

    record = None
    matched_id = None
    for tid in candidate_ids:
        rec = await store.run_sync(store.get_by_tile_id, tid)
        if rec and rec.vector:
            record = rec
            matched_id = tid
            break

    if not record or not record.vector:
        raise HTTPException(
            status_code=404,
            detail=f"Visual vector embedding not found for tile_id: {payload.tile_id}",
        )

    query_vector = list(record.vector)

    limit = payload.top_k + (3 if payload.exclude_self else 0)
    scored = await store.run_sync(
        store.search,
        query_vector,
        top_k=limit,
    )

    if payload.exclude_self:
        scored = [
            sp for sp in scored
            if str((sp.payload or {}).get("tile_id", "")) not in candidate_ids
        ][: payload.top_k]
    else:
        scored = scored[: payload.top_k]

    return SearchResponse(
        mode="image",
        query=f"similar_to:{matched_id}",
        top_k=payload.top_k,
        results=_to_hits(scored),
    )