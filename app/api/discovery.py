from __future__ import annotations

import asyncio
from typing import Any, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.discovery import cluster_tiles_unsupervised

router = APIRouter(prefix="/discovery", tags=["discovery"])


class ClusterRequest(BaseModel):
    num_clusters: int = Field(default=5, ge=2, le=20)
    min_cluster_size: int = Field(default=3, ge=2, le=50)
    method: str = Field(default="kmeans", description="kmeans or hdbscan")


@router.get("/cluster")
async def get_clusters(
    num_clusters: int = Query(default=5, ge=2, le=20),
    min_cluster_size: int = Query(default=3, ge=2, le=50),
    method: str = Query(default="kmeans"),
) -> dict[str, Any]:
    """
    Returns unsupervised clustering groups over tile embeddings with 2D projection and bounding envelopes.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: cluster_tiles_unsupervised(
            num_clusters=num_clusters,
            min_cluster_size=min_cluster_size,
            method=method,
        ),
    )


@router.post("/cluster")
async def post_clusters(payload: ClusterRequest) -> dict[str, Any]:
    """
    Executes unsupervised clustering with custom parameters.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: cluster_tiles_unsupervised(
            num_clusters=payload.num_clusters,
            min_cluster_size=payload.min_cluster_size,
            method=payload.method,
        ),
    )
