from __future__ import annotations

from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request
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


def _to_hits(scored_points, limit: Optional[int] = None) -> list[SearchHit]:
    hits: list[SearchHit] = []
    seen_tile_ids: set[str] = set()
    for sp in scored_points:
        payload = sp.payload or {}
        tid = str(payload.get("tile_id", ""))
        if tid and tid in seen_tile_ids:
            continue
        if tid:
            seen_tile_ids.add(tid)
        bbox = payload.get("bbox", {})
        lat, lng = _bbox_center(bbox if isinstance(bbox, dict) else None)
        hits.append(
            SearchHit(
                score=float(sp.score),
                tile_id=tid,
                bbox=bbox,
                date=str(payload.get("date", "")),
                sensor=str(payload.get("sensor", "")),
                image_path=str(payload.get("image_path", "")),
                lat=lat,
                lng=lng,
            )
        )
        if limit is not None and len(hits) >= limit:
            break
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
        top_k=max(payload.top_k * 3, 20),
        query_filter=query_filter,
    )

    return SearchResponse(
        mode="text",
        query=payload.query,
        top_k=payload.top_k,
        results=_to_hits(scored, limit=payload.top_k),
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
        top_k=max(payload.top_k * 3, 20),
        query_filter=query_filter,
    )

    return SearchResponse(
        mode="image",
        query=None,
        top_k=payload.top_k,
        results=_to_hits(scored, limit=payload.top_k),
    )


@router.post("/image", response_model=SearchResponse)
async def search_by_image(request: Request) -> SearchResponse:
    """
    Image-to-image semantic visual search querying real Qdrant vectors.
    Supports:
      1. Multipart Form Upload: 'file' (UploadFile)
      2. JSON payload: {"image_path": "...", "top_k": 10}
      3. JSON payload: {"tile_id": "...", "top_k": 10}
    """
    embedder = get_embedder()
    store = get_qdrant_store()
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if not uploaded_file or not hasattr(uploaded_file, "read"):
            raise HTTPException(status_code=400, detail="Missing image file in form data")
        top_k = int(form.get("top_k", settings.SEARCH_DEFAULT_TOP_K))
        date = form.get("date")
        sensor = form.get("sensor")
        data = await uploaded_file.read()
        vector = await embedder.embed_image_bytes_async(data)
        query_filter = _build_filter(str(date) if date else None, str(sensor) if sensor else None)
        scored = await store.run_sync(
            store.search,
            vector,
            top_k=max(top_k * 3, 20),
            query_filter=query_filter,
        )
        return SearchResponse(
            mode="image",
            query=getattr(uploaded_file, "filename", "uploaded_image.png"),
            top_k=top_k,
            results=_to_hits(scored, limit=top_k),
        )
    else:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")

        image_path = body.get("image_path")
        tile_id = body.get("tile_id")
        top_k = int(body.get("top_k", settings.SEARCH_DEFAULT_TOP_K))
        date = body.get("date")
        sensor = body.get("sensor")

        if image_path:
            from pathlib import Path
            import asyncio
            p = Path(image_path)
            if not p.exists():
                raise HTTPException(status_code=404, detail=f"Image not found: {image_path}")
            loop = asyncio.get_running_loop()
            vector = await loop.run_in_executor(None, embedder.embed_image_path, str(p))
            query_filter = _build_filter(date, sensor)
            scored = await store.run_sync(
                store.search,
                vector,
                top_k=max(top_k * 3, 20),
                query_filter=query_filter,
            )
            return SearchResponse(
                mode="image",
                query=str(image_path),
                top_k=top_k,
                results=_to_hits(scored, limit=top_k),
            )
        elif tile_id:
            return await search_similar_tiles(SimilarTileSearchRequest(tile_id=tile_id, top_k=top_k))
        else:
            raise HTTPException(
                status_code=400,
                detail="Request must contain either an uploaded 'file', 'image_path', or 'tile_id'.",
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
        top_k=max(top_k * 3, 20),
        query_filter=query_filter,
    )

    return SearchResponse(
        mode="image",
        query=None,
        top_k=top_k,
        results=_to_hits(scored, limit=top_k),
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
    Guarantees deduplicated, unique tile_id results.
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

    limit = max(payload.top_k * 4, 25)
    scored = await store.run_sync(
        store.search,
        query_vector,
        top_k=limit,
    )

    candidate_set = set(candidate_ids) if payload.exclude_self else set()
    hits: list[SearchHit] = []
    seen_tile_ids: set[str] = set()

    for sp in scored:
        payload_dict = sp.payload or {}
        tid = str(payload_dict.get("tile_id", ""))
        if not tid:
            continue
        if payload.exclude_self and tid in candidate_set:
            continue
        if tid in seen_tile_ids:
            continue
        seen_tile_ids.add(tid)
        bbox = payload_dict.get("bbox", {})
        lat, lng = _bbox_center(bbox if isinstance(bbox, dict) else None)
        hits.append(
            SearchHit(
                score=float(sp.score),
                tile_id=tid,
                bbox=bbox,
                date=str(payload_dict.get("date", "")),
                sensor=str(payload_dict.get("sensor", "")),
                image_path=str(payload_dict.get("image_path", "")),
                lat=lat,
                lng=lng,
            )
        )
        if len(hits) >= payload.top_k:
            break

    return SearchResponse(
        mode="image",
        query=f"similar_to:{matched_id}",
        top_k=payload.top_k,
        results=hits,
    )