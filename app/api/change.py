from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np
import rasterio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from qdrant_client.http import models as qmodels
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import ReviewQueueRepository, get_session
from app.ml.change_detector import detect_change_between_tiles
from app.ml.embedder import get_embedder
from app.services.qdrant_store import get_qdrant_store
from app.services.tiler import compute_bbox_intersection, iter_tiles_from_geotiff, read_tile_chip

router = APIRouter(prefix="/change", tags=["change"])


class ChangeDetectRequest(BaseModel):
    image_path_t1: str
    image_path_t2: str
    date_t1: str
    date_t2: str
    sensor: str = "Sentinel-2"
    top_k: int = Field(default=settings.CHANGE_DEFAULT_TOP_K, ge=1, le=500)
    drift_threshold: float = Field(default=settings.CHANGE_DRIFT_THRESHOLD, ge=0.0, le=1.0)
    enqueue_for_review: bool = True


class ChangeCandidate(BaseModel):
    event_id: str
    t1_tile_id: str
    t2_tile_id: str
    category: str
    confidence: float
    drift: float
    similarity: float
    cloud_qa_pass: bool
    earliest_observation: str
    bbox: dict[str, Any]
    suppressed: bool
    reason: Optional[str] = None
    provenance: dict[str, Any]


class ChangeDetectResponse(BaseModel):
    date_t1: str
    date_t2: str
    sensor: str
    total_pairs_evaluated: int
    candidates_detected: int
    review_items_created: int
    candidates: list[ChangeCandidate]


def _find_matching_t2(t1_tile, t2_tiles_dict: dict[str, Any], t2_records: list) -> Optional[dict]:
    """
    Finds matching T2 tile using exact row/col or spatial bounding box intersection.
    """
    # 1. Check direct row/col match
    key = f"{t1_tile.row}_{t1_tile.col}"
    if key in t2_tiles_dict:
        return t2_tiles_dict[key]

    # 2. Check bounding box IoU intersection against Qdrant records
    t1_bounds = t1_tile.bounds
    best_match = None
    best_iou = 0.0

    for rec in t2_records:
        payload = rec.payload or {}
        b = payload.get("bbox", {}).get("bounds")
        if b and len(b) == 4:
            iou = compute_bbox_intersection(t1_bounds, b)
            if iou > 0.6 and iou > best_iou:
                best_iou = iou
                best_match = {"record": rec, "payload": payload}

    return best_match


@router.post("/detect", response_model=ChangeDetectResponse)
async def detect_changes(
    payload: ChangeDetectRequest,
    session: AsyncSession = Depends(get_session),
) -> ChangeDetectResponse:
    embedder = get_embedder()
    store = get_qdrant_store()
    model_hash = embedder.get_model_hash()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Retrieve T2 records from Qdrant if indexed
    t2_records = await store.run_sync(
        store.scroll_by_payload,
        must=[
            qmodels.FieldCondition(key="date", match=qmodels.MatchValue(value=payload.date_t2)),
        ],
        limit=5000,
    )

    # Slice T1 tiles from GeoTIFF
    t1_tiles = list(
        iter_tiles_from_geotiff(
            payload.image_path_t1,
            date=payload.date_t1,
            sensor=payload.sensor,
        )
    )

    # Slice T2 tiles from GeoTIFF
    t2_tiles = list(
        iter_tiles_from_geotiff(
            payload.image_path_t2,
            date=payload.date_t2,
            sensor=payload.sensor,
        )
    )
    t2_tiles_dict = {f"{t.row}_{t.col}": t for t in t2_tiles}

    candidates: list[ChangeCandidate] = []
    review_rows: list[dict] = []
    total_evaluated = 0

    for t1_tile in t1_tiles:
        # Match T2 tile
        match_t2 = _find_matching_t2(t1_tile, t2_tiles_dict, t2_records)
        if not match_t2:
            continue

        total_evaluated += 1

        if isinstance(match_t2, dict):
            t2_rec = match_t2["record"]
            t2_payload = match_t2["payload"]
            t2_tile_id = str(t2_payload.get("tile_id", ""))
            t2_vector = list(t2_rec.vector) if t2_rec.vector is not None else None
            t2_array = read_tile_chip(
                str(t2_payload.get("image_path", payload.image_path_t2)),
                int(t2_payload.get("row", t1_tile.row)),
                int(t2_payload.get("col", t1_tile.col)),
                settings.TILE_SIZE,
            )
        else:
            # Direct TileRecord instance
            t2_tile_obj = match_t2
            t2_tile_id = t2_tile_obj.tile_id
            t2_vector = None
            t2_array = t2_tile_obj.array

        # Fetch T1 vector if present
        t1_qdrant = await store.run_sync(store.get_by_tile_id, t1_tile.tile_id)
        t1_vector = list(t1_qdrant.vector) if (t1_qdrant and t1_qdrant.vector is not None) else None

        # Execute change detection with QA validation and classification
        result = detect_change_between_tiles(
            embedder=embedder,
            t1_tile_id=t1_tile.tile_id,
            t2_tile_id=t2_tile_id,
            t1_array=t1_tile.array,
            t2_array=t2_array,
            t1_vector=t1_vector,
            t2_vector=t2_vector,
        )

        if result.suppressed:
            continue
        if result.drift < payload.drift_threshold:
            continue

        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        earliest_obs = min(payload.date_t1, payload.date_t2)

        provenance = {
            "sensor": payload.sensor,
            "date_t1": payload.date_t1,
            "date_t2": payload.date_t2,
            "model_hash": model_hash,
            "pipeline_version": "1.0.0-offline",
            "processed_at": now_iso,
        }

        candidate = ChangeCandidate(
            event_id=event_id,
            t1_tile_id=result.t1_tile_id,
            t2_tile_id=result.t2_tile_id,
            category=result.category,
            confidence=result.confidence,
            drift=result.drift,
            similarity=result.similarity,
            cloud_qa_pass=result.cloud_qa_pass,
            earliest_observation=earliest_obs,
            bbox=t1_tile.bbox,
            suppressed=result.suppressed,
            reason=result.reason,
            provenance=provenance,
        )
        candidates.append(candidate)

        if payload.enqueue_for_review:
            review_rows.append({
                "event_id": event_id,
                "tile_id": f"{result.t1_tile_id}__{result.t2_tile_id}",
                "t1_tile_id": result.t1_tile_id,
                "t2_tile_id": result.t2_tile_id,
                "status": "PENDING",
                "confidence": result.confidence,
                "drift_score": result.drift,
                "change_category": result.category,
                "cloud_qa_pass": result.cloud_qa_pass,
                "remarks": f"Automated detection: {result.category} (drift: {result.drift:.3f})",
                "bbox_json": json.dumps(t1_tile.bbox),
                "provenance_json": json.dumps(provenance),
                "date_t1": payload.date_t1,
                "date_t2": payload.date_t2,
            })

    # Sort candidates by confidence descending
    candidates.sort(key=lambda c: c.confidence, reverse=True)
    candidates = candidates[: payload.top_k]

    review_created = 0
    if payload.enqueue_for_review and review_rows:
        cand_events = {c.event_id for c in candidates}
        filtered_rows = [r for r in review_rows if r["event_id"] in cand_events]
        review_created = await ReviewQueueRepository.bulk_create(session, filtered_rows)

    return ChangeDetectResponse(
        date_t1=payload.date_t1,
        date_t2=payload.date_t2,
        sensor=payload.sensor,
        total_pairs_evaluated=total_evaluated,
        candidates_detected=len(candidates),
        review_items_created=review_created,
        candidates=candidates,
    )