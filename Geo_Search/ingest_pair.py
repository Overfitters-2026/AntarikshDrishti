from __future__ import annotations

import asyncio
import json
import sqlite3
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import httpx

from app.core.config import settings
from app.models.tile_db import init_db as init_system_db, DB_PATH as SYSTEM_DB_PATH
from app.core.database import init_db as init_semantic_db
from main import app

T1_PATH = "storage/raw_geotiff/mumbai_2023-12-08_s2.tif"
T2_PATH = "storage/raw_geotiff/mumbai_2024-12-17_s2.tif"
T1_DATE = "2023-12-08"
T2_DATE = "2024-12-17"
SENSOR = "Sentinel-2"

async def run_pipeline():
    print("=" * 65)
    print("  AERO-SENTINEL // REAL SENTINEL-2 MULTI-TEMPORAL INGESTION RUNNER")
    print("=" * 65)

    # 0. Initialize databases and ensure columns exist
    await init_system_db()
    await init_semantic_db()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test", timeout=120.0) as client:
        # A. Ingest & Embed T1 Baseline Scene
        print(f"\n[STEP 1/4] Ingesting T1 Baseline ({T1_PATH}, Date: {T1_DATE})...")
        t1_resp = await client.post(
            "/api/v1/ingest/geotiff",
            json={
                "file_path": T1_PATH,
                "date": T1_DATE,
                "sensor": SENSOR,
                "tile_size": 256,
                "overlap": 0,
            }
        )
        print(f"  * Status: {t1_resp.status_code} | Result: {t1_resp.json()}")
        assert t1_resp.status_code == 200, f"T1 ingest failed: {t1_resp.text}"
        t1_tiles_count = t1_resp.json().get("tiles_ingested", 0)

        # B. Ingest & Embed T2 Observation Scene
        print(f"\n[STEP 2/4] Ingesting T2 Observation ({T2_PATH}, Date: {T2_DATE})...")
        t2_resp = await client.post(
            "/api/v1/ingest/geotiff",
            json={
                "file_path": T2_PATH,
                "date": T2_DATE,
                "sensor": SENSOR,
                "tile_size": 256,
                "overlap": 0,
            }
        )
        print(f"  * Status: {t2_resp.status_code} | Result: {t2_resp.json()}")
        assert t2_resp.status_code == 200, f"T2 ingest failed: {t2_resp.text}"
        t2_tiles_count = t2_resp.json().get("tiles_ingested", 0)

        # C. Run Change Detection between T1 and T2
        print(f"\n[STEP 3/4] Running Multi-Temporal Change Detection (T1: {T1_DATE} -> T2: {T2_DATE})...")
        detect_resp = await client.post(
            "/api/v1/change/detect",
            json={
                "image_path_t1": str(Path(T1_PATH).resolve()),
                "image_path_t2": str(Path(T2_PATH).resolve()),
                "date_t1": T1_DATE,
                "date_t2": T2_DATE,
                "sensor": SENSOR,
                "drift_threshold": 0.05,
                "top_k": 50,
                "enqueue_for_review": True,
            }
        )
        print(f"  * Status: {detect_resp.status_code}")
        assert detect_resp.status_code == 200, f"Change detection failed: {detect_resp.text}"
        change_data = detect_resp.json()
        candidates = change_data.get("candidates", [])
        review_items_created = change_data.get("review_items_created", 0)
        print(f"  * Candidates Detected: {len(candidates)}")
        print(f"  * Review Queue Items Created: {review_items_created}")

        for i, c in enumerate(candidates):
            print(f"    - Candidate #{i+1}: ID={c['t1_tile_id']}__{c['t2_tile_id']}")
            print(f"      Drift Score : {c['drift']:.4f}")
            print(f"      Similarity  : {c['similarity']:.4f}")
            print(f"      Confidence  : {c['confidence']:.4f}")
            print(f"      Suppressed  : {c['suppressed']}")

        # D. Confirm rows in review_queue (SQLAlchemy / data/geo_semantic.db)
        print("\n[STEP 4/4] Verifying Authoritative Review Queue & UI Cache...")
        semantic_db_path = Path("data/geo_semantic.db")
        with sqlite3.connect(semantic_db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM review_queue ORDER BY id DESC LIMIT 5")
            review_rows = [dict(r) for r in cur.fetchall()]

        # Confirm rows in tile_audit (SQLite UI Cache / data/geo_system.db)
        with sqlite3.connect(SYSTEM_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM tile_audit")
            total_audit_count = cur.fetchone()[0]
            cur.execute("SELECT * FROM tile_audit WHERE before_desc IS NOT NULL ORDER BY created_at DESC LIMIT 5")
            change_audit_rows = [dict(r) for r in cur.fetchall()]

        # Query GET /api/hotspots
        hotspots_resp = await client.get("/api/hotspots")
        hotspots = hotspots_resp.json()

        print("\n" + "=" * 65)
        print("  PIPELINE EXECUTION SUMMARY & AUDIT VERIFICATION")
        print("=" * 65)
        print(f"  1. T1 Tiles Ingested         : {t1_tiles_count}")
        print(f"  2. T2 Tiles Ingested         : {t2_tiles_count}")
        print(f"  3. Candidates Passing Drift  : {len(candidates)}")
        print(f"  4. review_queue Table Rows   : {len(review_rows)} (Authoritative Source of Truth)")
        print(f"  5. tile_audit Total Rows     : {total_audit_count} (UI Read Cache)")
        print(f"  6. /api/hotspots Live Count  : {len(hotspots)}")
        print("=" * 65)

        print("\n--- SAMPLE ROW IN review_queue (data/geo_semantic.db) ---")
        if review_rows:
            print(json.dumps(review_rows[0], indent=2, default=str))

        print("\n--- SAMPLE ROW IN tile_audit (data/geo_system.db) ---")
        if change_audit_rows:
            print(json.dumps(change_audit_rows[0], indent=2, default=str))

        print("\n--- SAMPLE OBJECT FROM GET /api/hotspots ---")
        if hotspots:
            print(json.dumps(hotspots[0], indent=2))

if __name__ == "__main__":
    asyncio.run(run_pipeline())
