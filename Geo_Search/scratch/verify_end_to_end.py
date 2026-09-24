import asyncio
import json
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import rasterio
from rasterio.transform import from_bounds
import httpx

from app.core.config import settings
from app.models.tile_db import init_db as init_system_db, DB_PATH as SYSTEM_DB_PATH
from app.core.database import init_db as init_semantic_db, AsyncSessionLocal
from app.services.qdrant_store import get_qdrant_store, make_point_id
from app.ml.embedder import get_embedder
from app.api.change import ChangeDetectRequest, detect_changes
from qdrant_client.http import models as qmodels
from main import app

async def run_verification():
    print("=== 1. INITIALIZING DATABASES ===")
    await init_system_db()
    await init_semantic_db()
    print("Databases initialized successfully.")

    raw_dir = Path("storage/raw_geotiff")
    raw_dir.mkdir(parents=True, exist_ok=True)
    t1_path = raw_dir / "test_t1.tif"
    t2_path = raw_dir / "test_t2.tif"

    # Create synthetic GeoTIFFs (256x256, 3 bands)
    # Bounds near Mumbai: [72.85, 19.05, 72.90, 19.10]
    transform = from_bounds(72.85, 19.05, 72.90, 19.10, 256, 256)
    crs = "EPSG:4326"

    # T1: baseline vegetation (greenish)
    np.random.seed(42)
    t1_data = np.zeros((3, 256, 256), dtype=np.uint8)
    t1_data[0] = np.random.randint(30, 60, (256, 256), dtype=np.uint8)   # Red
    t1_data[1] = np.random.randint(110, 150, (256, 256), dtype=np.uint8) # Green
    t1_data[2] = np.random.randint(35, 70, (256, 256), dtype=np.uint8)   # Blue

    # T2: significant urban construction change (bright reflective gray/concrete)
    t2_data = np.copy(t1_data)
    t2_data[:, 64:192, 64:192] = np.random.randint(190, 230, (3, 128, 128), dtype=np.uint8)

    meta = {
        "driver": "GTiff",
        "height": 256,
        "width": 256,
        "count": 3,
        "dtype": "uint8",
        "crs": crs,
        "transform": transform,
    }

    with rasterio.open(t1_path, "w", **meta) as dst:
        dst.write(t1_data)

    with rasterio.open(t2_path, "w", **meta) as dst:
        dst.write(t2_data)

    print(f"Created GeoTIFFs: {t1_path} and {t2_path}")

    # Register T2 into Qdrant so change detection matches it
    print("=== 2. EMBEDDING & REGISTERING T2 INTO QDRANT ===")
    embedder = get_embedder()
    store = get_qdrant_store()

    t2_vector = embedder.embed_image_array(t2_data)
    t2_tile_id = f"test_t2_r0_c0_2025-12-01"
    t2_bbox = {
        "type": "Polygon",
        "bounds": [72.85, 19.05, 72.90, 19.10],
        "crs": crs,
    }

    t2_point = qmodels.PointStruct(
        id=make_point_id(),
        vector=t2_vector,
        payload={
            "tile_id": t2_tile_id,
            "row": 0,
            "col": 0,
            "date": "2025-12-01",
            "sensor": "Sentinel-2",
            "image_path": str(t2_path.resolve()),
            "bbox": t2_bbox,
        }
    )
    store.upsert_points([t2_point])
    print(f"Upserted T2 point into Qdrant with tile_id={t2_tile_id}")

    # Run Change Detection
    print("=== 3. EXECUTING DETECT_CHANGES() ===")
    req = ChangeDetectRequest(
        image_path_t1=str(t1_path.resolve()),
        image_path_t2=str(t2_path.resolve()),
        date_t1="2025-06-01",
        date_t2="2025-12-01",
        sensor="Sentinel-2",
        drift_threshold=0.05,
        enqueue_for_review=True,
    )

    async with AsyncSessionLocal() as session:
        response = await detect_changes(req, session=session)

    print(f"Detect changes response: {len(response.candidates)} candidate(s), review_items_created={response.review_items_created}")

    # Query review_queue
    print("\n=== 4. ROW CONTENTS IN review_queue (SQLAlchemy / data/geo_semantic.db) ===")
    semantic_db_path = Path("data/geo_semantic.db")
    with sqlite3.connect(semantic_db_path) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM review_queue ORDER BY id DESC LIMIT 5")
        review_rows = [dict(r) for r in cur.fetchall()]
        print(json.dumps(review_rows, indent=2, default=str))

    # Query tile_audit
    print("\n=== 5. ROW CONTENTS IN tile_audit (SQLite UI Cache / data/geo_system.db) ===")
    with sqlite3.connect(SYSTEM_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM tile_audit ORDER BY created_at DESC LIMIT 5")
        audit_rows = [dict(r) for r in cur.fetchall()]
        print(json.dumps(audit_rows, indent=2, default=str))

    # Query GET /api/hotspots
    print("\n=== 6. API RESPONSE: GET /api/hotspots ===")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/hotspots")
        print(f"Status Code: {resp.status_code}")
        print(json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(run_verification())
