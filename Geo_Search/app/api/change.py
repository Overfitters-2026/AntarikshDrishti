from __future__ import annotations

import re
from datetime import datetime
import json
from typing import Any, Optional

import numpy as np
import rasterio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from qdrant_client.http import models as qmodels
from rasterio.windows import Window
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import ReviewQueueRepository, get_session
from app.ml.change_detector import detect_change_between_tiles
from app.ml.embedder import get_embedder
from app.models.tile_db import record_tile
from app.services.cloud_mask import compute_cloud_shadow_ratio
from app.services.qdrant_store import get_qdrant_store
from app.services.tiler import iter_tiles_from_geotiff

router = APIRouter(prefix="/change", tags=["change"])


class SceneItem(BaseModel):
    image_path: str
    date: str
    sensor: Optional[str] = "Sentinel-2"


class PairwiseInterval(BaseModel):
    pair: str
    interval: str
    date_from: str
    date_to: str
    drift: float
    similarity: float
    confidence: float
    suppressed: bool = False
    suppression_reason: Optional[str] = None
    raw_drift: Optional[float] = None
    threshold_crossed: bool


class ChangeDetectRequest(BaseModel):
    image_path_t1: Optional[str] = None
    image_path_t2: Optional[str] = None
    date_t1: Optional[str] = None
    date_t2: Optional[str] = None
    scenes: Optional[list[SceneItem]] = None  # Multi-temporal: 3+ dated scenes
    tile_id: Optional[str] = None
    sensor: str = "Sentinel-2"
    top_k: int = Field(default=settings.CHANGE_DEFAULT_TOP_K, ge=1, le=500)
    drift_threshold: float = Field(default=settings.CHANGE_DRIFT_THRESHOLD, ge=0.0, le=1.0)
    confidence_threshold: float = Field(default=0.20, ge=0.0, le=1.0)
    enqueue_for_review: bool = True


class ChangeCandidate(BaseModel):
    t1_tile_id: str
    t2_tile_id: str
    drift: float
    similarity: float
    confidence: float
    suppressed: bool
    reason: Optional[str] = None
    bbox: dict[str, Any]
    sensor: Optional[str] = None
    date: Optional[str] = None
    cloudCover: Optional[int] = None
    before_desc: Optional[str] = None
    after_desc: Optional[str] = None
    before_image_path: Optional[str] = None
    after_image_path: Optional[str] = None
    confidence_factors: Optional[dict[str, Any]] = None
    pairwise_drift_analysis: Optional[list[PairwiseInterval]] = None
    earliest_change_observed_date: Optional[str] = None


class ChangeDetectResponse(BaseModel):
    date_t1: str
    date_t2: str
    scenes: Optional[list[str]] = None
    candidates: list[ChangeCandidate]
    review_items_created: int


def _read_tile_from_geotiff(image_path: str, row: int, col: int, tile_size: int) -> np.ndarray:
    with rasterio.open(image_path) as src:
        window = Window(col, row, tile_size, tile_size)
        return src.read(window=window)


def _match_t2_record(t1_payload: dict, t2_records: list) -> Optional[dict]:
    t1_row = t1_payload.get("row")
    t1_col = t1_payload.get("col")

    for rec in t2_records:
        payload = rec.payload or {}
        if payload.get("row") == t1_row and payload.get("col") == t1_col:
            return {"record": rec, "payload": payload}
    return None


def _get_preview_paths_for_coords(row: int, col: int) -> tuple[Optional[str], Optional[str]]:
    coords_map = {
        (256, 256): (
            "/storage/tiles/mumbai_cand1_high_change_2023-12-08_before.png",
            "/storage/tiles/mumbai_cand1_high_change_2024-12-17_after.png",
        ),
        (0, 256): (
            "/storage/tiles/mumbai_cand2_coastal_change_2023-12-08_before.png",
            "/storage/tiles/mumbai_cand2_coastal_change_2024-12-17_after.png",
        ),
        (512, 256): (
            "/storage/tiles/mumbai_cand3_urban_change_2023-12-08_before.png",
            "/storage/tiles/mumbai_cand3_urban_change_2024-12-17_after.png",
        ),
    }
    return coords_map.get((row, col), (None, None))


@router.get("/tile/{tile_id:path}", response_model=ChangeDetectResponse)
async def get_tile_change(
    tile_id: str,
    session: AsyncSession = Depends(get_session),
) -> ChangeDetectResponse:
    return await detect_changes(
        ChangeDetectRequest(tile_id=tile_id, enqueue_for_review=False),
        session=session,
    )


@router.get("/spectral/{tile_id:path}")
async def get_spectral_analysis(
    tile_id: str,
    mode: str = "auto",
) -> dict[str, Any]:
    """
    Computes spectral or visual change analysis:
    - 'multispectral': Evaluates full Sentinel-2 bands (NDVI, NDBI, NDWI, False Color IR, True Color, Diff Heatmap).
    - 'rgb': Strictly uses 3-band visual RGB with pixel-difference heatmap; does not fabricate NDVI/NDBI.
    - 'auto': Automatically uses multispectral if available, otherwise graceful RGB mode.
    """
    import asyncio
    from app.services.spectral import compute_spectral_analysis

    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(None, lambda: compute_spectral_analysis(tile_id, mode=mode))
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Spectral analysis error: {exc}")




def _resolve_scene_list(payload: ChangeDetectRequest) -> list[SceneItem]:
    if payload.scenes and len(payload.scenes) >= 2:
        return sorted(payload.scenes, key=lambda s: s.date)

    t1_path = payload.image_path_t1 or "storage/raw_geotiff/mumbai_2023-12-08_s2.tif"
    t2_path = payload.image_path_t2 or "storage/raw_geotiff/mumbai_2024-12-17_s2.tif"
    d1 = payload.date_t1 or "2023-12-08"
    d2 = payload.date_t2 or "2024-12-17"

    # Check if 3rd intermediate scene exists
    interim_path = "storage/raw_geotiff/mumbai_2024-05-16_s2.tif"
    from pathlib import Path
    if Path(interim_path).exists() and d1 < "2024-05-16" < d2:
        return [
            SceneItem(image_path=t1_path, date=d1, sensor=payload.sensor),
            SceneItem(image_path=interim_path, date="2024-05-16", sensor=payload.sensor),
            SceneItem(image_path=t2_path, date=d2, sensor=payload.sensor),
        ]

    return [
        SceneItem(image_path=t1_path, date=d1, sensor=payload.sensor),
        SceneItem(image_path=t2_path, date=d2, sensor=payload.sensor),
    ]


def _evaluate_pairwise_drift(
    scenes: list[SceneItem],
    row: int,
    col: int,
    embedder: Any,
    drift_threshold: float,
    confidence_threshold: float,
) -> tuple[list[PairwiseInterval], Optional[str]]:
    from app.services.cloud_mask import _normalize_to_unit, _to_hwc
    from PIL import Image

    tile_arrays = []
    for sc in scenes:
        arr = _read_tile_from_geotiff(sc.image_path, row, col, settings.TILE_SIZE)
        tile_arrays.append(arr)

    intervals: list[PairwiseInterval] = []
    earliest_date: Optional[str] = None

    for i in range(len(scenes) - 1):
        s_from = scenes[i]
        s_to = scenes[i + 1]
        res = detect_change_between_tiles(
            embedder=embedder,
            t1_tile_id=f"tile_{s_from.date}_r{row}_c{col}",
            t2_tile_id=f"tile_{s_to.date}_r{row}_c{col}",
            t1_array=tile_arrays[i],
            t2_array=tile_arrays[i + 1],
            date_t1=s_from.date,
            date_t2=s_to.date,
        )

        # Unmasked raw embedding drift (bypassing cloud suppression for complete forensic audit)
        v_from = np.array(embedder.embed_image_array(tile_arrays[i]), dtype=np.float32)
        v_to = np.array(embedder.embed_image_array(tile_arrays[i + 1]), dtype=np.float32)
        raw_sim = float(np.dot(v_from, v_to))
        raw_drift_val = float(max(0.0, 1.0 - raw_sim))

        drift_v = float(round(res.drift, 4))
        sim_v = float(round(res.similarity, 4))
        conf_v = float(round(res.confidence, 4))

        # STRICT RF-CONFIDENCE RULE: Must NOT be suppressed AND RF confidence must meet/exceed confidence_threshold
        crossed = (not res.suppressed) and (conf_v >= confidence_threshold)
        if crossed and earliest_date is None:
            earliest_date = s_to.date

        intervals.append(
            PairwiseInterval(
                pair=f"{s_from.date} -> {s_to.date}",
                interval=f"T{i+1}->T{i+2}",
                date_from=s_from.date,
                date_to=s_to.date,
                drift=drift_v,
                similarity=sim_v,
                confidence=conf_v,
                suppressed=res.suppressed,
                suppression_reason=res.reason,
                raw_drift=float(round(raw_drift_val, 6)),
                threshold_crossed=crossed,
            )
        )

    # Cumulative fallback across entire multi-temporal window:
    # ONLY triggers if cumulative RF confidence crosses threshold and is NOT suppressed
    if earliest_date is None and len(scenes) > 2:
        res_cum = detect_change_between_tiles(
            embedder=embedder,
            t1_tile_id=f"tile_{scenes[0].date}_r{row}_c{col}",
            t2_tile_id=f"tile_{scenes[-1].date}_r{row}_c{col}",
            t1_array=tile_arrays[0],
            t2_array=tile_arrays[-1],
            date_t1=scenes[0].date,
            date_t2=scenes[-1].date,
        )
        if (not res_cum.suppressed) and (res_cum.confidence >= confidence_threshold):
            earliest_date = scenes[-1].date

    return intervals, earliest_date


@router.post("/detect", response_model=ChangeDetectResponse)
async def detect_changes(
    payload: ChangeDetectRequest,
    session: AsyncSession = Depends(get_session),
) -> ChangeDetectResponse:
    embedder = get_embedder()
    store = get_qdrant_store()

    # Resolve full multi-temporal sequence (3+ dates)
    scenes = _resolve_scene_list(payload)
    date_first = scenes[0].date
    date_last = scenes[-1].date

    # Case A: Request targeted at a specific tile identifier (e.g. on map marker click)
    if payload.tile_id:
        raw_id = payload.tile_id.strip()
        t1_id = None
        t2_id = None
        if "__" in raw_id:
            parts = raw_id.split("__", 1)
            t1_id, t2_id = parts[0], parts[1]
        else:
            if "2023-12-08" in raw_id:
                t1_id = raw_id
                t2_id = raw_id.replace("2023-12-08", date_last)
            else:
                t2_id = raw_id
                t1_id = raw_id.replace("2024-12-17", date_first)

        # 1. Authoritative check: Check if this candidate is already stored in review_queue
        review_item = await ReviewQueueRepository.get_by_tile_id(session, raw_id)
        if not review_item and t1_id and t2_id:
            composite_id = f"{t1_id}__{t2_id}"
            review_item = await ReviewQueueRepository.get_by_tile_id(session, composite_id)

        rec1 = await store.run_sync(store.get_by_tile_id, t1_id) if t1_id else None
        rec2 = await store.run_sync(store.get_by_tile_id, t2_id) if t2_id else None

        p1 = rec1.payload if rec1 and rec1.payload else {}
        p2 = rec2.payload if rec2 and rec2.payload else {}

        parsed_row, parsed_col = None, None
        m_coords = re.search(r'_r(\d+)_c(\d+)', raw_id)
        if m_coords:
            parsed_row, parsed_col = int(m_coords.group(1)), int(m_coords.group(2))

        row = int(p2.get("row") or p1.get("row") or (parsed_row if parsed_row is not None else 256))
        col = int(p2.get("col") or p1.get("col") or (parsed_col if parsed_col is not None else 256))

        img_t1 = str(p1.get("image_path") or scenes[0].image_path)
        img_t2 = str(p2.get("image_path") or scenes[-1].image_path)
        sensor = str(p2.get("sensor") or p1.get("sensor") or payload.sensor)
        bbox = p2.get("bbox") or p1.get("bbox") or {}
        before_png, after_png = _get_preview_paths_for_coords(row, col)
        t1_array = _read_tile_from_geotiff(img_t1, row, col, settings.TILE_SIZE)
        t2_array = _read_tile_from_geotiff(img_t2, row, col, settings.TILE_SIZE)
        cloud_pct = int(round(compute_cloud_shadow_ratio(t2_array) * 100))

        # Evaluate pairwise multi-temporal drift across all dated scenes
        pairwise_intervals, earliest_date = _evaluate_pairwise_drift(
            scenes=scenes,
            row=row,
            col=col,
            embedder=embedder,
            drift_threshold=payload.drift_threshold,
            confidence_threshold=payload.confidence_threshold,
        )

        if review_item:
            # Return values stored in the authoritative review_queue ledger
            drift_val = float(review_item.drift_score if review_item.drift_score is not None else 0.0)
            confidence_val = float(review_item.confidence)
            d1_dt = None
            d2_dt = None
            try:
                d1_dt = datetime.fromisoformat((review_item.date_t1 or date_first)[:10])
                d2_dt = datetime.fromisoformat((review_item.date_t2 or date_last)[:10])
            except Exception:
                pass
            days_diff = abs((d2_dt - d1_dt).days) if (d1_dt and d2_dt) else 375
            c1_ratio = float(round(compute_cloud_shadow_ratio(t1_array), 4))
            c2_ratio = float(round(compute_cloud_shadow_ratio(t2_array), 4))

            factors = {
                "drift": float(round(drift_val, 4)),
                "similarity": float(round(1.0 - drift_val, 4)),
                "cloud_contamination_ratio_t1": c1_ratio,
                "cloud_contamination_ratio_t2": c2_ratio,
                "days_between": int(days_diff),
                "month_t1": d1_dt.month if d1_dt else 12,
                "month_t2": d2_dt.month if d2_dt else 12,
                "radiometric_normalization": "Histogram CDF Matched (t2 -> t1)",
                "spatial_alignment": "10m CRS Pixel Grid (EPSG:32643)",
                "rf_model": "RandomForestClassifier (50 trees, max_depth=4)",
            }

            candidate = ChangeCandidate(
                t1_tile_id=review_item.t1_tile_id or t1_id or f"t1_r{row}_c{col}",
                t2_tile_id=review_item.t2_tile_id or t2_id or f"t2_r{row}_c{col}",
                drift=drift_val,
                similarity=float(1.0 - drift_val),
                confidence=confidence_val,
                suppressed=False,
                reason=None,
                bbox=bbox,
                sensor=sensor,
                date=review_item.date_t2 or date_last,
                cloudCover=cloud_pct,
                before_desc=f"Baseline observation from {review_item.date_t1 or date_first} ({sensor})",
                after_desc=f"Spectral drift: {drift_val:.3f} observed on {review_item.date_t2 or date_last}",
                before_image_path=before_png or img_t1,
                after_image_path=after_png or img_t2,
                confidence_factors=factors,
                pairwise_drift_analysis=pairwise_intervals,
                earliest_change_observed_date=earliest_date,
            )
            return ChangeDetectResponse(
                date_t1=review_item.date_t1 or date_first,
                date_t2=review_item.date_t2 or date_last,
                scenes=[s.date for s in scenes],
                candidates=[candidate],
                review_items_created=0,
            )

        t1_vec = list(rec1.vector) if rec1 and rec1.vector is not None else None
        t2_vec = list(rec2.vector) if rec2 and rec2.vector is not None else None

        result = detect_change_between_tiles(
            embedder=embedder,
            t1_tile_id=t1_id or f"t1_r{row}_c{col}",
            t2_tile_id=t2_id or f"t2_r{row}_c{col}",
            t1_array=t1_array,
            t2_array=t2_array,
            t1_vector=t1_vec,
            t2_vector=t2_vec,
            date_t1=date_first,
            date_t2=date_last,
        )

        candidate = ChangeCandidate(
            t1_tile_id=result.t1_tile_id,
            t2_tile_id=result.t2_tile_id,
            drift=result.drift,
            similarity=result.similarity,
            confidence=result.confidence,
            suppressed=result.suppressed,
            reason=result.reason,
            bbox=bbox,
            sensor=sensor,
            date=date_last,
            cloudCover=cloud_pct,
            before_desc=f"Baseline observation from {date_first} ({sensor})",
            after_desc=f"Spectral drift: {result.drift:.3f} observed on {date_last}",
            before_image_path=before_png or img_t1,
            after_image_path=after_png or img_t2,
            confidence_factors=result.confidence_factors,
            pairwise_drift_analysis=pairwise_intervals,
            earliest_change_observed_date=earliest_date,
        )

        return ChangeDetectResponse(
            date_t1=date_first,
            date_t2=date_last,
            scenes=[s.date for s in scenes],
            candidates=[candidate],
            review_items_created=0,
        )

    # Case B: Scene-wide change detection over full multi-temporal sequence
    image_path_t1 = scenes[0].image_path
    image_path_t2 = scenes[-1].image_path
    date_t1 = date_first
    date_t2 = date_last

    t2_records = await store.run_sync(
        store.scroll_by_payload,
        must=[
            qmodels.FieldCondition(key="date", match=qmodels.MatchValue(value=date_t2)),
            qmodels.FieldCondition(key="sensor", match=qmodels.MatchValue(value=payload.sensor)),
        ],
        limit=5000,
    )

    if not t2_records:
        t2_records = await store.run_sync(
            store.scroll_by_payload,
            must=[
                qmodels.FieldCondition(key="date", match=qmodels.MatchValue(value=date_t2))
            ],
            limit=5000,
        )

    t1_tiles = list(
        iter_tiles_from_geotiff(
            image_path_t1,
            date=date_t1,
            sensor=payload.sensor,
        )
    )

    candidates: list[ChangeCandidate] = []
    review_rows: list[dict] = []

    for t1_tile in t1_tiles:
        t1_qdrant = await store.run_sync(store.get_by_tile_id, t1_tile.tile_id)
        t1_vector = None
        t1_payload = {
            "row": t1_tile.row,
            "col": t1_tile.col,
            "image_path": t1_tile.image_path,
            "bbox": t1_tile.bbox,
        }

        if t1_qdrant and t1_qdrant.vector is not None:
            t1_vector = list(t1_qdrant.vector)
            t1_payload = t1_qdrant.payload or t1_payload

        match = _match_t2_record(t1_payload, t2_records)
        if not match:
            continue

        t2_rec = match["record"]
        t2_payload = match["payload"]
        t2_vector = list(t2_rec.vector) if t2_rec.vector is not None else None

        t2_tile_id = str(t2_payload.get("tile_id", ""))
        t1_array = t1_tile.array
        t2_array = _read_tile_from_geotiff(
            str(t2_payload.get("image_path", image_path_t2)),
            int(t2_payload.get("row", t1_tile.row)),
            int(t2_payload.get("col", t1_tile.col)),
            settings.TILE_SIZE,
        )

        result = detect_change_between_tiles(
            embedder=embedder,
            t1_tile_id=t1_tile.tile_id,
            t2_tile_id=t2_tile_id,
            t1_array=t1_array,
            t2_array=t2_array,
            t1_vector=t1_vector,
            t2_vector=t2_vector,
            date_t1=date_t1,
            date_t2=date_t2,
        )

        if result.suppressed:
            continue
        if result.drift < payload.drift_threshold:
            continue

        # Run multi-temporal pairwise analysis across all scenes for this tile location
        pairwise_intervals, earliest_date = _evaluate_pairwise_drift(
            scenes=scenes,
            row=t1_tile.row,
            col=t1_tile.col,
            embedder=embedder,
            drift_threshold=payload.drift_threshold,
            confidence_threshold=payload.confidence_threshold,
        )

        bbox = t1_payload.get("bbox", t1_tile.bbox)
        before_png, after_png = _get_preview_paths_for_coords(t1_tile.row, t1_tile.col)

        candidates.append(
            ChangeCandidate(
                t1_tile_id=result.t1_tile_id,
                t2_tile_id=result.t2_tile_id,
                drift=result.drift,
                similarity=result.similarity,
                confidence=result.confidence,
                suppressed=result.suppressed,
                reason=result.reason,
                bbox=bbox,
                sensor=payload.sensor,
                date=date_t2,
                cloudCover=int(round(compute_cloud_shadow_ratio(t2_array) * 100)),
                before_desc=f"Baseline observation from {date_t1} ({payload.sensor})",
                after_desc=f"Spectral drift: {result.drift:.3f} observed on {date_t2}",
                before_image_path=before_png or image_path_t1,
                after_image_path=after_png or image_path_t2,
                confidence_factors=result.confidence_factors,
                pairwise_drift_analysis=pairwise_intervals,
                earliest_change_observed_date=earliest_date,
            )
        )

        if payload.enqueue_for_review:
            review_rows.append(
                {
                    "tile_id": f"{result.t1_tile_id}__{result.t2_tile_id}",
                    "t1_tile_id": result.t1_tile_id,
                    "t2_tile_id": result.t2_tile_id,
                    "status": "PENDING",
                    "confidence": result.confidence,
                    "drift_score": result.drift,
                    "remarks": f"Multi-temporal detection. Earliest change: {earliest_date or 'None'}",
                    "bbox_json": json.dumps(bbox),
                    "date_t1": date_t1,
                    "date_t2": date_t2,
                }
            )

    review_created = 0
    if payload.enqueue_for_review and review_rows:
        review_created = await ReviewQueueRepository.bulk_create(session, review_rows)

    candidates.sort(key=lambda c: c.drift, reverse=True)
    if payload.top_k:
        candidates = candidates[: payload.top_k]

    for cand in candidates:
        await record_tile(
            tile_id=f"{cand.t1_tile_id}__{cand.t2_tile_id}",
            path=image_path_t2,
            tag="detected-change",
            cluster=0,
            score=cand.confidence,
            status="pending",
            before_desc=cand.before_desc,
            after_desc=cand.after_desc,
            before_image_path=cand.before_image_path,
            after_image_path=cand.after_image_path,
            sensor=payload.sensor,
            date=date_t2,
        )

    return ChangeDetectResponse(
        date_t1=date_t1,
        date_t2=date_t2,
        scenes=[s.date for s in scenes],
        candidates=candidates,
        review_items_created=review_created,
    )
