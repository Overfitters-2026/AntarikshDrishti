from __future__ import annotations

import asyncio
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.tile_db import get_anomalous_tiles, record_tile, update_tile_status
from app.services.qdrant_store import get_qdrant_store

router = APIRouter(prefix="/api", tags=["ui-hotspots"])


class Hotspot(BaseModel):
    id: str
    lat: float
    lng: float
    classification: str
    confidence: float
    sensor: str
    date: str
    cloudCover: int = Field(ge=0, le=100)
    status: str
    image_path: Optional[str] = None
    bbox: Optional[dict[str, Any]] = None


class HotspotStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)


def _bbox_center(bbox: Optional[dict[str, Any]]) -> tuple[float, float]:
    bounds = (bbox or {}).get("bounds") if bbox else None
    if isinstance(bounds, list) and len(bounds) == 4:
        left, bottom, right, top = bounds
        return float((bottom + top) / 2.0), float((left + right) / 2.0)
    return 0.0, 0.0


def _normalize_confidence(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def _hotspot_from_row(row: dict[str, Any], payload: Optional[dict[str, Any]]) -> Hotspot:
    payload = payload or {}
    bbox = payload.get("bbox")
    lat, lng = _bbox_center(bbox if isinstance(bbox, dict) else None)
    confidence = _normalize_confidence(row.get("anomaly_score", 0.0))

    return Hotspot(
        id=str(row.get("id", "")),
        lat=lat,
        lng=lng,
        classification=str(row.get("primary_tag") or payload.get("primary_tag") or "unassigned"),
        confidence=confidence,
        sensor=str(payload.get("sensor") or "unknown"),
        date=str(payload.get("date") or row.get("created_at") or ""),
        cloudCover=int(round(max(0.0, min(1.0, 1.0 - confidence)) * 100)),
        status=str(row.get("status") or "pending"),
        image_path=str(payload.get("image_path") or row.get("image_path") or ""),
        bbox=bbox if isinstance(bbox, dict) else None,
    )


@router.get("/hotspots", response_model=list[Hotspot])
async def list_hotspots(limit: int = 100) -> list[Hotspot]:
    rows = await get_anomalous_tiles(limit=limit)
    if not rows:
        return []

    store = get_qdrant_store()
    payload_tasks = [store.run_sync(store.get_by_tile_id, str(row.get("id", ""))) for row in rows]
    qdrant_records = await asyncio.gather(*payload_tasks)

    hotspots: list[Hotspot] = []
    for row, record in zip(rows, qdrant_records):
        payload = dict(record.payload) if record and record.payload else None
        hotspots.append(_hotspot_from_row(row, payload))
    return hotspots


@router.post("/hotspots/{hotspot_id}/status", response_model=Hotspot)
async def update_hotspot_status(hotspot_id: str, payload: HotspotStatusUpdate) -> Hotspot:
    rows = await get_anomalous_tiles(limit=1000)
    row = next((item for item in rows if str(item.get("id")) == hotspot_id), None)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Hotspot {hotspot_id} not found")

    store = get_qdrant_store()
    record = await store.run_sync(store.get_by_tile_id, hotspot_id)
    record_payload = dict(record.payload) if record and record.payload else None

    await update_tile_status(hotspot_id, payload.status)

    if row.get("image_path") and not record_payload:
        await record_tile(
            tile_id=hotspot_id,
            path=str(row["image_path"]),
            tag=str(row.get("primary_tag") or "unassigned"),
            cluster=int(row.get("cluster") or 0),
            score=float(row.get("anomaly_score") or 0.0),
            status=payload.status,
        )

    updated_row = {**row, "status": payload.status}
    return _hotspot_from_row(updated_row, record_payload)