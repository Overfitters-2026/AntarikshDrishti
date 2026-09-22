from __future__ import annotations

import json
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import ReviewQueueItem, ReviewQueueRepository, get_session

router = APIRouter(prefix="/review", tags=["review"])

ReviewStatus = Literal["PENDING", "CONFIRMED", "REJECTED"]


class ProvenanceInfo(BaseModel):
    sensor: str = "Sentinel-2"
    acquisition_date_t1: Optional[str] = None
    acquisition_date_t2: Optional[str] = None
    model_checkpoint_hash: str = "sha256:unknown"
    pipeline_version: str = "1.0.0-offline"
    processed_at: Optional[str] = None


class TileChipInfo(BaseModel):
    tile_id: Optional[str] = None
    date: Optional[str] = None
    preview_url: Optional[str] = None


class ReviewQueueItemResponse(BaseModel):
    event_id: str
    status: ReviewStatus
    confidence: float
    drift_score: Optional[float] = None
    change_category: str
    cloud_qa_pass: bool
    remarks: Optional[str] = None
    aoi_bbox: Optional[dict[str, Any]] = None
    t_before: TileChipInfo
    t_after: TileChipInfo
    provenance: ProvenanceInfo
    created_at: str
    updated_at: str


class ReviewQueueListResponse(BaseModel):
    total_returned: int
    status_filter: Optional[str] = None
    items: list[ReviewQueueItemResponse]


class ReviewUpdateRequest(BaseModel):
    status: Optional[ReviewStatus] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    remarks: Optional[str] = None


def _to_review_response(item: ReviewQueueItem) -> ReviewQueueItemResponse:
    bbox = None
    if item.bbox_json:
        try:
            bbox = json.loads(item.bbox_json)
        except Exception:
            bbox = None

    prov_dict = {}
    if item.provenance_json:
        try:
            prov_dict = json.loads(item.provenance_json)
        except Exception:
            prov_dict = {}

    provenance = ProvenanceInfo(
        sensor=prov_dict.get("sensor", "Sentinel-2"),
        acquisition_date_t1=item.date_t1,
        acquisition_date_t2=item.date_t2,
        model_checkpoint_hash=prov_dict.get("model_hash", "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
        pipeline_version=prov_dict.get("pipeline_version", "1.0.0-offline"),
        processed_at=prov_dict.get("processed_at", item.created_at.isoformat()),
    )

    t_before = TileChipInfo(
        tile_id=item.t1_tile_id,
        date=item.date_t1,
        preview_url=f"/api/v1/tiles/{item.t1_tile_id}/preview.png" if item.t1_tile_id else None,
    )
    t_after = TileChipInfo(
        tile_id=item.t2_tile_id,
        date=item.date_t2,
        preview_url=f"/api/v1/tiles/{item.t2_tile_id}/preview.png" if item.t2_tile_id else None,
    )

    return ReviewQueueItemResponse(
        event_id=item.event_id,
        status=item.status,  # type: ignore[arg-type]
        confidence=item.confidence,
        drift_score=item.drift_score,
        change_category=item.change_category,
        cloud_qa_pass=item.cloud_qa_pass,
        remarks=item.remarks,
        aoi_bbox=bbox,
        t_before=t_before,
        t_after=t_after,
        provenance=provenance,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
    )


@router.get("/queue", response_model=ReviewQueueListResponse)
async def list_review_queue(
    status: Optional[ReviewStatus] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> ReviewQueueListResponse:
    rows = await ReviewQueueRepository.list_items(
        session,
        status=status,
        limit=limit,
        offset=offset,
    )
    items = [_to_review_response(row) for row in rows]
    return ReviewQueueListResponse(
        total_returned=len(items),
        status_filter=status,
        items=items,
    )


@router.get("/queue/{event_id}", response_model=ReviewQueueItemResponse)
async def get_review_item(
    event_id: str,
    session: AsyncSession = Depends(get_session),
) -> ReviewQueueItemResponse:
    row = await ReviewQueueRepository.get_by_event_id(session, event_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Review event '{event_id}' not found")
    return _to_review_response(row)


@router.patch("/queue/{event_id}", response_model=ReviewQueueItemResponse)
async def update_review_item(
    event_id: str,
    payload: ReviewUpdateRequest,
    session: AsyncSession = Depends(get_session),
) -> ReviewQueueItemResponse:
    if payload.status is None and payload.confidence is None and payload.remarks is None:
        raise HTTPException(status_code=400, detail="At least one field must be provided to update")

    item = await ReviewQueueRepository.update_by_event_id(
        session,
        event_id,
        status=payload.status,
        confidence=payload.confidence,
        remarks=payload.remarks,
    )
    if item is None:
        raise HTTPException(status_code=404, detail=f"Review event '{event_id}' not found")
    return _to_review_response(item)
