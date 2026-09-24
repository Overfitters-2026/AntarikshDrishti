import asyncio
import json
import os
import platform
import subprocess
import time
from pathlib import Path
import httpx
import sqlite3

BASE_DIR = Path(__file__).resolve().parent

def get_dir_size(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    for root, dirs, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total

def format_bytes(size: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"

def get_hardware_info():
    info = {
        "os": f"{platform.system()} {platform.release()} ({platform.version()})",
        "cpu": platform.processor(),
        "gpu": "Unknown",
        "ram_gb": 0.0
    }
    
    try:
        cpu_cmd = "powershell -NoProfile -Command \"(Get-CimInstance Win32_Processor).Name\""
        cpu_res = subprocess.check_output(cpu_cmd, shell=True, text=True).strip()
        if cpu_res:
            info["cpu"] = cpu_res
    except Exception:
        pass

    try:
        gpu_cmd = "powershell -NoProfile -Command \"(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ', '\""
        gpu_res = subprocess.check_output(gpu_cmd, shell=True, text=True).strip()
        if gpu_res:
            info["gpu"] = gpu_res
    except Exception:
        pass

    try:
        ram_cmd = "powershell -NoProfile -Command \"[math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1024 / 1024, 2)\""
        ram_res = subprocess.check_output(ram_cmd, shell=True, text=True).strip()
        if ram_res:
            info["ram_gb"] = float(ram_res)
    except Exception:
        pass

    return info

async def run_clean_scaled_benchmark():
    print("=" * 75)
    print("  AERO-SENTINEL // CLEAN SCALED REPRODUCIBILITY BENCHMARK")
    print("=" * 75)

    # 1. Hardware Info
    print("\n--- [1] HARDWARE & PLATFORM SPECIFICATION ---")
    hw = get_hardware_info()
    print(f"  * OS       : {hw['os']}")
    print(f"  * CPU      : {hw['cpu']}")
    print(f"  * GPU      : {hw['gpu']}")
    print(f"  * RAM Total: {hw['ram_gb']} GB")

    T1_PATH = "storage/raw_geotiff/mumbai_2023-12-08_s2.tif"
    T2_PATH = "storage/raw_geotiff/mumbai_2024-12-17_s2.tif"
    T1_DATE = "2023-12-08"
    T2_DATE = "2024-12-17"
    SENSOR = "Sentinel-2"

    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=180.0) as client:
        # Step 0: Clean Wipe of all databases and vector collection
        print("\n--- [2] CLEAN WIPE OF ALL AUDIT LEDGERS & VECTOR INDEX ---")
        reset_resp = await client.post("/api/v1/ingest/reset")
        assert reset_resp.status_code == 200, f"Reset failed: {reset_resp.text}"
        print(f"  * Reset Response: {reset_resp.json()['message']}")

        # Verify empty state before ingestion
        pre_status = (await client.get("/api/v1/ingest/status")).json()
        print(f"  * Pre-run tile count: {pre_status['tile_count']} | Sensors: {pre_status['sensors']} | Date Range: {pre_status['date_range']}")
        assert pre_status['tile_count'] == 0, "Database was not cleanly wiped!"

        # Step 1: Scale Ingestion (1024x1024 Mumbai AOI = 16 tiles per scene)
        print("\n--- [3] SCALED INGESTION & EMBEDDING PIPELINE (104.85 km² AOI) ---")
        print(f"  * T1 Baseline Scene   : {T1_PATH} ({T1_DATE}) - 1024x1024 px")
        print(f"  * T2 Observation Scene: {T2_PATH} ({T2_DATE}) - 1024x1024 px")
        
        t0 = time.perf_counter()

        # Ingest T1
        t1_start = time.perf_counter()
        resp_t1 = await client.post("/api/v1/ingest/geotiff", json={
            "file_path": T1_PATH,
            "date": T1_DATE,
            "sensor": SENSOR,
            "tile_size": 256,
            "overlap": 0,
        })
        t1_time = time.perf_counter() - t1_start
        assert resp_t1.status_code == 200, f"T1 failed: {resp_t1.text}"
        t1_tiles = resp_t1.json().get("tiles_ingested", 0)
        print(f"  >> Ingested & Embedded T1 Baseline: {t1_tiles} tiles in {t1_time:.3f}s")

        # Ingest T2
        t2_start = time.perf_counter()
        resp_t2 = await client.post("/api/v1/ingest/geotiff", json={
            "file_path": T2_PATH,
            "date": T2_DATE,
            "sensor": SENSOR,
            "tile_size": 256,
            "overlap": 0,
        })
        t2_time = time.perf_counter() - t2_start
        assert resp_t2.status_code == 200, f"T2 failed: {resp_t2.text}"
        t2_tiles = resp_t2.json().get("tiles_ingested", 0)
        print(f"  >> Ingested & Embedded T2 Observation: {t2_tiles} tiles in {t2_time:.3f}s")

        # Step 2: Change Detection across all 16 co-registered tile pairs
        print("\n--- [4] MULTI-TEMPORAL CHANGE DETECTION RUN ---")
        cd_start = time.perf_counter()
        resp_cd = await client.post("/api/v1/change/detect", json={
            "image_path_t1": str((BASE_DIR / T1_PATH).resolve()),
            "image_path_t2": str((BASE_DIR / T2_PATH).resolve()),
            "date_t1": T1_DATE,
            "date_t2": T2_DATE,
            "sensor": SENSOR,
            "drift_threshold": 0.05,
            "top_k": 50,
            "enqueue_for_review": True,
        })
        cd_time = time.perf_counter() - cd_start
        assert resp_cd.status_code == 200, f"Change detect failed: {resp_cd.text}"
        cd_json = resp_cd.json()
        candidates = cd_json.get("candidates", [])
        review_items_created = cd_json.get("review_items_created", 0)
        print(f"  >> Change Detection Completed in: {cd_time:.3f}s")
        print(f"  * Total Candidate Pairs Evaluated: {len(candidates)}")
        print(f"  * Anomalous Change Hotspots Enqueued: {review_items_created}")

        t_total = time.perf_counter() - t0
        print(f"\n  >> TOTAL END-TO-END BUILD TIME: {t_total:.3f} seconds ({t_total/60:.2f} min)")

        # Step 3: Storage Footprint & Tile Counts
        print("\n--- [5] TILE VOLUME & STORAGE FOOTPRINT ON DISK ---")
        geotiff_dir = BASE_DIR / "storage" / "raw_geotiff"
        tiles_dir = BASE_DIR / "storage" / "tiles"
        system_db = BASE_DIR / "data" / "geo_system.db"
        semantic_db = BASE_DIR / "data" / "geo_semantic.db"
        qdrant_dir = BASE_DIR / "data" / "qdrant"

        geotiff_size = get_dir_size(geotiff_dir)
        tiles_size = get_dir_size(tiles_dir)
        system_db_size = get_dir_size(system_db)
        semantic_db_size = get_dir_size(semantic_db)
        qdrant_size = get_dir_size(qdrant_dir)
        total_footprint = geotiff_size + tiles_size + system_db_size + semantic_db_size + qdrant_size

        tile_count = 0
        anomalies_count = 0
        sensors_in_db = []
        min_date_db = None
        max_date_db = None

        if system_db.exists():
            with sqlite3.connect(system_db) as conn:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*), MIN(date), MAX(date) FROM tile_audit")
                r = cur.fetchone()
                tile_count = r[0]
                min_date_db = r[1]
                max_date_db = r[2]
                cur.execute("SELECT COUNT(*) FROM tile_audit WHERE anomaly_score > 0")
                anomalies_count = cur.fetchone()[0]
                cur.execute("SELECT DISTINCT sensor FROM tile_audit WHERE sensor IS NOT NULL")
                sensors_in_db = [row[0] for row in cur.fetchall()]

        review_queue_count = 0
        if semantic_db.exists():
            with sqlite3.connect(semantic_db) as conn:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM review_queue")
                review_queue_count = cur.fetchone()[0]

        print(f"  * Raw Sentinel-2 GeoTIFFs : {format_bytes(geotiff_size)} (2 scenes @ 1024x1024, 10m Ground Sample)")
        print(f"  * Extracted JPEG/PNG Tiles: {format_bytes(tiles_size)}")
        print(f"  * System Audit SQLite DB  : {format_bytes(system_db_size)} ({tile_count} total tiles, {anomalies_count} change candidates)")
        print(f"  * Semantic Review Queue DB: {format_bytes(semantic_db_size)} ({review_queue_count} prioritized review items)")
        print(f"  * Qdrant Vector Storage   : {format_bytes(qdrant_size)}")
        print(f"  --------------------------------------------------")
        print(f"  * TOTAL FOOTPRINT ON DISK : {format_bytes(total_footprint)}")
        print(f"  * DB Sensors Confirmed    : {sensors_in_db}")
        print(f"  * DB Date Span Confirmed  : {min_date_db} to {max_date_db}")

        # Step 4: Latency Benchmarks (10 calls each)
        print("\n--- [6] LIVE QUERY LATENCY BENCHMARKS (10 CONSECUTIVE CALLS) ---")
        hotspot_latencies = []
        search_latencies = []

        print("  A. Measuring GET /api/hotspots (10 iterations)...")
        for i in range(10):
            req_t0 = time.perf_counter()
            resp = await client.get("/api/hotspots")
            req_t1 = time.perf_counter()
            elapsed_ms = (req_t1 - req_t0) * 1000.0
            assert resp.status_code == 200, f"Hotspots failed: {resp.status_code}"
            hotspot_latencies.append(elapsed_ms)
            print(f"     Iter {i+1:02d}: {elapsed_ms:6.2f} ms | Status: 200 | Hotspots: {len(resp.json())}")

        print("\n  B. Measuring POST /api/v1/search/text ('urban construction coastal development') (10 iterations)...")
        for i in range(10):
            req_t0 = time.perf_counter()
            resp = await client.post(
                "/api/v1/search/text",
                json={"query": "urban construction coastal development", "top_k": 10}
            )
            req_t1 = time.perf_counter()
            elapsed_ms = (req_t1 - req_t0) * 1000.0
            assert resp.status_code == 200, f"Search failed: {resp.status_code}"
            search_latencies.append(elapsed_ms)
            print(f"     Iter {i+1:02d}: {elapsed_ms:6.2f} ms | Status: 200 | Hits: {len(resp.json().get('results', []))}")

        def calc_stats(lats):
            sorted_l = sorted(lats)
            p95_idx = int(0.95 * len(sorted_l)) - 1
            return {
                "min_ms": round(min(lats), 2),
                "max_ms": round(max(lats), 2),
                "avg_ms": round(sum(lats) / len(lats), 2),
                "p95_ms": round(sorted_l[max(0, p95_idx)], 2),
            }

        hs_stats = calc_stats(hotspot_latencies)
        srch_stats = calc_stats(search_latencies)

        print("\n--- [7] SUMMARY LATENCY RESULTS ---")
        print(f"  * Hotspots Endpoint (GET /api/hotspots):")
        print(f"      Avg: {hs_stats['avg_ms']:6.2f} ms | Min: {hs_stats['min_ms']:6.2f} ms | Max: {hs_stats['max_ms']:6.2f} ms | P95: {hs_stats['p95_ms']:6.2f} ms")
        print(f"  * Semantic Search Endpoint (POST /api/v1/search/text):")
        print(f"      Avg: {srch_stats['avg_ms']:6.2f} ms | Min: {srch_stats['min_ms']:6.2f} ms | Max: {srch_stats['max_ms']:6.2f} ms | P95: {srch_stats['p95_ms']:6.2f} ms")

        # Compile final results
        results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "hardware": hw,
            "aoi_coverage": {
                "location": "Mumbai, Maharashtra, India (19.0760N, 72.8777E)",
                "window_pixels": "1024x1024 px",
                "ground_resolution": "10 meters/pixel (Sentinel-2 L2A)",
                "coverage_area_sq_km": 104.85,
            },
            "build_pipeline": {
                "total_run_time_seconds": round(t_total, 3),
                "t1_ingest_time_seconds": round(t1_time, 3),
                "t2_ingest_time_seconds": round(t2_time, 3),
                "change_detect_time_seconds": round(cd_time, 3),
                "tiles_processed": tile_count,
                "anomalies_detected": anomalies_count,
                "review_queue_items": review_queue_count,
            },
            "storage": {
                "raw_geotiff_bytes": geotiff_size,
                "raw_geotiff_formatted": format_bytes(geotiff_size),
                "tiles_bytes": tiles_size,
                "tiles_formatted": format_bytes(tiles_size),
                "system_db_bytes": system_db_size,
                "system_db_formatted": format_bytes(system_db_size),
                "semantic_db_bytes": semantic_db_size,
                "semantic_db_formatted": format_bytes(semantic_db_size),
                "qdrant_bytes": qdrant_size,
                "qdrant_formatted": format_bytes(qdrant_size),
                "total_footprint_bytes": total_footprint,
                "total_footprint_formatted": format_bytes(total_footprint),
            },
            "query_latency": {
                "hotspots_endpoint": hs_stats,
                "semantic_search_endpoint": srch_stats,
            }
        }

        out_file = BASE_DIR / "benchmark_results.json"
        with open(out_file, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\n[BENCHMARK COMPLETE] Saved verified metrics to: {out_file}\n" + "=" * 75)

        # Final verification of live status endpoint
        final_status = (await client.get("/api/v1/ingest/status")).json()
        print("\n--- [8] VERIFIED /api/v1/ingest/status PAYLOAD ---")
        print(f"  * status      : {final_status['status']}")
        print(f"  * tile_count  : {final_status['tile_count']}")
        print(f"  * sensors     : {final_status['sensors']}")
        print(f"  * date_range  : {final_status['date_range']}")
        print(f"  * storage     : {final_status['storage']}")

if __name__ == "__main__":
    asyncio.run(run_clean_scaled_benchmark())
