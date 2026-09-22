from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

# Force UTF-8 on Windows stdout
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import numpy as np
import rasterio
from rasterio.transform import from_bounds

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.core.database import ReviewQueueRepository, get_session, init_db
from app.ml.change_detector import detect_change_between_tiles
from app.ml.embedder import get_embedder
from app.services.qdrant_store import get_qdrant_store, make_point_id, payload_from_tile_metadata
from app.services.tiler import iter_tiles_from_geotiff


def generate_synthetic_scene_pair():
    """
    Generates deterministic 4-band [R, G, B, NIR] GeoTIFF pairs (T1 Baseline vs T2 Observation)
    with clear, distinct spatial changes:
    - Quadrant 1 (0:256, 0:256): Forest -> Active Construction / Concrete Roofs
    - Quadrant 2 (0:256, 256:512): Dense Forest -> Cleared Land / Deforestation
    - Quadrant 3 (256:512, 0:256): Dry Soil -> Water Body Expansion / Flooding
    - Quadrant 4 (256:512, 256:512): Stable Urban Settlement (No change)
    """
    settings.ensure_dirs()
    raw_dir = settings.BASE_DIR / "storage" / "raw_geotiff"
    raw_dir.mkdir(parents=True, exist_ok=True)

    t1_path = raw_dir / "2024-05-15_scene.tif"
    t2_path = raw_dir / "2024-09-20_scene.tif"

    height, width = 512, 512
    # Geographic bounds around Mumbai AOI [minx, miny, maxx, maxy]
    bounds = (72.820, 19.020, 72.880, 19.080)
    transform = from_bounds(bounds[0], bounds[1], bounds[2], bounds[3], width, height)
    crs = "EPSG:4326"

    # Seed random for deterministic generation
    np.random.seed(42)

    # ------------------- Create T1 (Baseline Scene) -------------------
    t1_data = np.zeros((4, height, width), dtype=np.uint8)

    # Base background: Mild grassland
    t1_data[0] = np.random.randint(60, 90, (height, width))   # R
    t1_data[1] = np.random.randint(120, 160, (height, width)) # G
    t1_data[2] = np.random.randint(50, 80, (height, width))   # B
    t1_data[3] = np.random.randint(180, 220, (height, width)) # NIR

    # Quad 1 (0:256, 0:256): Dense Green Forest
    t1_data[0, 0:256, 0:256] = np.random.randint(30, 55, (256, 256))
    t1_data[1, 0:256, 0:256] = np.random.randint(150, 210, (256, 256))
    t1_data[2, 0:256, 0:256] = np.random.randint(30, 60, (256, 256))
    t1_data[3, 0:256, 0:256] = np.random.randint(210, 255, (256, 256))

    # Quad 2 (0:256, 256:512): Dense Tree Canopy
    t1_data[0, 0:256, 256:512] = np.random.randint(35, 60, (256, 256))
    t1_data[1, 0:256, 256:512] = np.random.randint(140, 195, (256, 256))
    t1_data[2, 0:256, 256:512] = np.random.randint(35, 65, (256, 256))
    t1_data[3, 0:256, 256:512] = np.random.randint(200, 245, (256, 256))

    # Quad 3 (256:512, 0:256): Dry Soil / Sandy Shore
    t1_data[0, 256:512, 0:256] = np.random.randint(160, 200, (256, 256))
    t1_data[1, 256:512, 0:256] = np.random.randint(140, 175, (256, 256))
    t1_data[2, 256:512, 0:256] = np.random.randint(110, 140, (256, 256))
    t1_data[3, 256:512, 0:256] = np.random.randint(120, 150, (256, 256))

    # Quad 4 (256:512, 256:512): Urban Residential Settlement
    t1_data[0, 256:512, 256:512] = np.random.randint(130, 170, (256, 256))
    t1_data[1, 256:512, 256:512] = np.random.randint(130, 165, (256, 256))
    t1_data[2, 256:512, 256:512] = np.random.randint(140, 180, (256, 256))
    t1_data[3, 256:512, 256:512] = np.random.randint(100, 130, (256, 256))

    # Write T1 GeoTIFF
    with rasterio.open(
        t1_path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=4,
        dtype=np.uint8,
        crs=crs,
        transform=transform,
    ) as dst:
        dst.write(t1_data)

    # ------------------- Create T2 (Observation Scene with Changes) -------------------
    t2_data = t1_data.copy()

    # CHANGE 1: Quad 1 (Forest -> Heavy Construction / Concrete Structures / Industrial Roofs)
    t2_data[0, 30:230, 30:230] = np.random.randint(170, 200, (200, 200)) # Grey Concrete
    t2_data[1, 30:230, 30:230] = np.random.randint(170, 200, (200, 200))
    t2_data[2, 30:230, 30:230] = np.random.randint(175, 205, (200, 200))
    t2_data[3, 30:230, 30:230] = np.random.randint(80, 110, (200, 200))

    # Add geometric building grid pattern
    for r in range(40, 220, 30):
        t2_data[:, r:r+10, 40:220] = 195
    for c in range(40, 220, 30):
        t2_data[:, 40:220, c:c+10] = 195

    # CHANGE 2: Quad 2 (Forest -> Complete Vegetation Clearance / Deforestation / Bare Soil)
    t2_data[0, 20:235, 275:490] = np.random.randint(180, 215, (215, 215)) # Brownish Earth
    t2_data[1, 20:235, 275:490] = np.random.randint(105, 135, (215, 215)) # Reduced Green
    t2_data[2, 20:235, 275:490] = np.random.randint(65, 90, (215, 215))   # Low Blue
    t2_data[3, 20:235, 275:490] = np.random.randint(75, 105, (215, 215))  # Dropped NIR

    # CHANGE 3: Quad 3 (Dry Soil -> Water Body Expansion / Flooding)
    t2_data[0, 275:495, 20:235] = np.random.randint(20, 45, (220, 215))   # Low Red
    t2_data[1, 275:495, 20:235] = np.random.randint(60, 95, (220, 215))   # Low/Medium Green
    t2_data[2, 275:495, 20:235] = np.random.randint(185, 230, (220, 215)) # High Blue Water
    t2_data[3, 275:495, 20:235] = np.random.randint(10, 30, (220, 215))   # Low NIR

    # Quad 4: Remains stable urban (minor random noise)
    t2_data[:, 256:512, 256:512] += np.random.randint(-4, 4, (4, 256, 256), dtype=np.int16).astype(np.uint8)

    # Write T2 GeoTIFF
    with rasterio.open(
        t2_path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=4,
        dtype=np.uint8,
        crs=crs,
        transform=transform,
    ) as dst:
        dst.write(t2_data)

    print(f"[OK] Synthetic GeoTIFFs created:\n  - T1: {t1_path}\n  - T2: {t2_path}")
    return str(t1_path), str(t2_path)


async def seed_database():
    print("\n[1/4] Initializing Database & Local Vector Storage...")
    await init_db()
    store = get_qdrant_store()
    embedder = get_embedder()

    t1_file, t2_file = generate_synthetic_scene_pair()

    print("\n[2/4] Ingesting & Indexing Baseline (T1) and Observation (T2) Tiles...")
    dates_and_files = [
        ("2024-05-15", t1_file),
        ("2024-09-20", t2_file),
    ]

    all_points = []
    for date_str, img_path in dates_and_files:
        for tile in iter_tiles_from_geotiff(img_path, date=date_str, sensor="Sentinel-2", tile_size=256, stride=256):
            vec = await embedder.embed_image_array_async(tile.array)
            meta = {
                "tile_id": tile.tile_id,
                "bbox": tile.bbox,
                "date": tile.date,
                "sensor": tile.sensor,
                "image_path": tile.image_path,
                "crs": tile.crs,
                "row": tile.row,
                "col": tile.col,
            }
            all_points.append((
                make_point_id(),
                vec,
                payload_from_tile_metadata(meta),
            ))

    # Upsert points to Qdrant
    from qdrant_client.http import models as qmodels
    qpoints = [qmodels.PointStruct(id=p[0], vector=p[1], payload=p[2]) for p in all_points]
    store.upsert_points(qpoints)
    print(f"[OK] Indexed {len(qpoints)} tiles into Qdrant vector database.")

    print("\n[3/4] Running Multi-Temporal Change Pipeline with Semantic Classification...")
    t1_tiles = list(iter_tiles_from_geotiff(t1_file, date="2024-05-15", sensor="Sentinel-2", tile_size=256, stride=256))
    t2_tiles = list(iter_tiles_from_geotiff(t2_file, date="2024-09-20", sensor="Sentinel-2", tile_size=256, stride=256))

    async for session in get_session():
        review_items = []
        for t1 in t1_tiles:
            for t2 in t2_tiles:
                if t1.row == t2.row and t1.col == t2.col:
                    res = detect_change_between_tiles(
                        embedder=embedder,
                        t1_tile_id=t1.tile_id,
                        t2_tile_id=t2.tile_id,
                        t1_array=t1.array,
                        t2_array=t2.array,
                    )
                    if res.confidence > 0.30 and not res.suppressed:
                        event_id = f"evt_{t1.row}_{t1.col}_{t1.date}"
                        prov = {
                            "sensor": "Sentinel-2 MSI",
                            "date_t1": "2024-05-15",
                            "date_t2": "2024-09-20",
                            "model_hash": embedder.get_model_hash(),
                            "pipeline_version": "1.0.0-offline",
                            "processed_at": "2024-09-22T12:00:00Z",
                        }
                        review_items.append({
                            "event_id": event_id,
                            "tile_id": f"{t1.tile_id}__{t2.tile_id}",
                            "t1_tile_id": t1.tile_id,
                            "t2_tile_id": t2.tile_id,
                            "status": "PENDING",
                            "confidence": res.confidence,
                            "drift_score": res.drift,
                            "change_category": res.category,
                            "cloud_qa_pass": res.cloud_qa_pass,
                            "remarks": f"Detected: {res.category} (drift: {res.drift:.3f})",
                            "bbox_json": json.dumps(t1.bbox),
                            "provenance_json": json.dumps(prov),
                            "date_t1": "2024-05-15",
                            "date_t2": "2024-09-20",
                        })
                        print(f"  * Detected Change: [{res.category}] | Conf: {res.confidence:.1%} | Drift: {res.drift:.3f}")

        if review_items:
            created = await ReviewQueueRepository.bulk_create(session, review_items)
            print(f"[OK] Created {created} verified items in Analyst Review Queue.")

    print("\n[4/4] Seed Complete! Demo Platform is Ready.")
    print("===============================================================")
    print("Start the FastAPI Platform:")
    print("  .\\venv\\Scripts\\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000")
    print("Open Dashboard:")
    print("  http://127.0.0.1:8000/")
    print("===============================================================\n")


if __name__ == "__main__":
    asyncio.run(seed_database())
