from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Generator, Optional, Tuple

import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import Window
from shapely.geometry import box, mapping, shape

from app.core.config import settings


@dataclass(frozen=True)
class TileRecord:
    tile_id: str
    array: np.ndarray
    bbox: dict
    bounds: list[float]  # [left, bottom, right, top]
    row: int
    col: int
    crs: str
    date: str
    sensor: str
    image_path: str


def _is_mostly_black(tile: np.ndarray, threshold: float) -> bool:
    if tile.size == 0:
        return True
    if tile.ndim == 2:
        data = tile.astype(np.float32)
    else:
        data = tile[:3].astype(np.float32) if tile.shape[0] >= 3 else tile.astype(np.float32)
    if data.max() > 1.0:
        data = data / 255.0
    dark_ratio = float(np.mean(data <= threshold))
    return dark_ratio > (1.0 - settings.MIN_VALID_PIXEL_RATIO)


def _is_mostly_nodata(tile: np.ndarray, nodata: Optional[float]) -> bool:
    if nodata is None:
        return False
    if tile.ndim == 2:
        valid = tile != nodata
    else:
        valid = np.any(tile != nodata, axis=0)
    valid_ratio = float(np.mean(valid))
    return valid_ratio < settings.MIN_VALID_PIXEL_RATIO


def _window_bbox(window: Window, transform, crs: str) -> Tuple[dict, list[float]]:
    left, bottom, right, top = rasterio.windows.bounds(window, transform)
    geom = box(left, bottom, right, top)
    bbox_geojson = {
        "type": "Polygon",
        "coordinates": [list(mapping(geom)["coordinates"][0])],
        "crs": crs,
        "bounds": [left, bottom, right, top],
    }
    return bbox_geojson, [left, bottom, right, top]


def compute_bbox_intersection(box_a: list[float], box_b: list[float]) -> float:
    """Computes Intersection over Union (IoU) of two bounding boxes [left, bottom, right, top]."""
    poly_a = box(*box_a)
    poly_b = box(*box_b)
    if not poly_a.intersects(poly_b):
        return 0.0
    inter_area = poly_a.intersection(poly_b).area
    union_area = poly_a.union(poly_b).area
    return float(inter_area / max(union_area, 1e-9))


def tile_to_preview_png(array: np.ndarray) -> bytes:
    """
    Renders raster numpy array (CHW or HWC) to PNG bytes with 2-98% percentile linear stretch.
    """
    if array.ndim == 2:
        rgb = np.stack([array, array, array], axis=-1)
    elif array.shape[0] in (1, 3, 4) and array.shape[-1] not in (1, 3, 4):
        rgb = np.transpose(array[:3], (1, 2, 0))
    else:
        rgb = array[..., :3]

    rgb = rgb.astype(np.float32)
    # Apply 2% - 98% percentile linear contrast stretch
    p2, p98 = np.percentile(rgb, (2, 98))
    if p98 > p2:
        rgb = np.clip((rgb - p2) / (p98 - p2), 0.0, 1.0)
    elif rgb.max() > 1.0:
        rgb = np.clip(rgb / 255.0, 0.0, 1.0)

    img_uint8 = (rgb * 255.0).astype(np.uint8)
    pil_img = Image.fromarray(img_uint8)

    buf = BytesIO()
    pil_img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def read_tile_chip(image_path: str | Path, row: int, col: int, tile_size: int = 256) -> np.ndarray:
    with rasterio.open(image_path) as src:
        window = Window(col, row, tile_size, tile_size)
        return src.read(window=window)


def iter_tiles_from_geotiff(
    image_path: str | Path,
    *,
    date: str,
    sensor: str,
    tile_size: int | None = None,
    stride: int | None = None,
) -> Generator[TileRecord, None, None]:
    image_path = Path(image_path)
    tile_size = tile_size or settings.TILE_SIZE
    stride = stride or settings.TILE_STRIDE

    with rasterio.open(image_path) as src:
        crs = src.crs.to_string() if src.crs else "EPSG:4326"
        nodata = src.nodata
        height, width = src.height, src.width

        for row_off in range(0, height, stride):
            for col_off in range(0, width, stride):
                win_height = min(tile_size, height - row_off)
                win_width = min(tile_size, width - col_off)
                if win_height < tile_size or win_width < tile_size:
                    continue

                window = Window(col_off, row_off, win_width, win_height)
                tile = src.read(window=window)

                if _is_mostly_nodata(tile, nodata):
                    continue
                if _is_mostly_black(tile, settings.BLACK_PIXEL_THRESHOLD):
                    continue

                bbox_geojson, bounds = _window_bbox(window, src.transform, crs)
                tile_id = f"{image_path.stem}_r{row_off}_c{col_off}_{date}"

                # Cache preview chip to disk for fast serving
                chip_path = settings.TILES_DIR / f"{tile_id}.png"
                if not chip_path.exists():
                    try:
                        png_bytes = tile_to_preview_png(tile)
                        chip_path.write_bytes(png_bytes)
                    except Exception:
                        pass

                yield TileRecord(
                    tile_id=tile_id,
                    array=tile,
                    bbox=bbox_geojson,
                    bounds=bounds,
                    row=row_off,
                    col=col_off,
                    crs=crs,
                    date=date,
                    sensor=sensor,
                    image_path=str(image_path.resolve()),
                )