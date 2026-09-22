from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Response
from PIL import Image

from app.core.config import settings
from app.services.qdrant_store import get_qdrant_store
from app.services.tiler import read_tile_chip, tile_to_preview_png

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tiles", tags=["tiles"])


@router.get("/{tile_id}/preview.png")
async def get_tile_preview(tile_id: str):
    """
    Returns high-contrast RGB PNG preview of the specified tile.
    Checks tile cache first; if not found, slices on-demand from raw GeoTIFF.
    """
    chip_path = settings.TILES_DIR / f"{tile_id}.png"
    if chip_path.exists():
        return Response(
            content=chip_path.read_bytes(),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # Lookup tile metadata in Qdrant
    store = get_qdrant_store()
    rec = store.get_by_tile_id(tile_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Tile '{tile_id}' not found in index")

    payload = rec.payload or {}
    image_path = payload.get("image_path")
    row = payload.get("row")
    col = payload.get("col")

    if not image_path or row is None or col is None or not Path(image_path).exists():
        raise HTTPException(status_code=404, detail=f"GeoTIFF source image missing for '{tile_id}'")

    try:
        arr = read_tile_chip(image_path, int(row), int(col), settings.TILE_SIZE)
        png_bytes = tile_to_preview_png(arr)
        chip_path.write_bytes(png_bytes)
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception as exc:
        logger.error(f"Error rendering tile preview for '{tile_id}': {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to generate tile preview: {exc}")
