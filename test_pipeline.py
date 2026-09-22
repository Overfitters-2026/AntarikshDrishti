from __future__ import annotations

import io
import sys
from pathlib import Path

# Force UTF-8 on Windows stdout
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Add project root to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from main import app


def test_complete_platform():
    print("\n=======================================================")
    print("  RUNNING SIH 26227 END-TO-END PIPELINE AUDIT TESTS")
    print("=======================================================\n")

    with TestClient(app) as client:
        # 1. Health Endpoint
        print("[TEST 1/8] Testing /health endpoint...")
        resp = client.get("/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "ok"
        assert data["mode"] == "offline"
        print(f"  [PASS] /health OK: {data}")

        # 2. Static Frontend Dashboard
        print("\n[TEST 2/8] Testing Static Frontend Dashboard at / ...")
        resp = client.get("/")
        assert resp.status_code == 200, f"Frontend loading failed: {resp.text}"
        assert "<title>Geo-Semantic Satellite Analysis Platform" in resp.text
        print("  [PASS] Static Frontend Dashboard loaded successfully (HTML/CSS/JS ready).")

        # 3. Semantic Search API
        print("\n[TEST 3/8] Testing Semantic Text Search (/api/v1/search/text)...")
        resp = client.post("/api/v1/search/text", json={"query": "forest vegetation canopy", "top_k": 5})
        assert resp.status_code == 200, f"Search failed: {resp.text}"
        search_data = resp.json()
        assert search_data["mode"] == "text"
        assert len(search_data["results"]) > 0
        hit = search_data["results"][0]
        print(f"  [PASS] Search returned {len(search_data['results'])} hits. Top hit: {hit['tile_id']} (score: {hit['score']:.3f})")

        # 4. Multi-Temporal Change Detection API
        print("\n[TEST 4/8] Testing Multi-Temporal Change Detection (/api/v1/change/detect)...")
        resp = client.post(
            "/api/v1/change/detect",
            json={
                "image_path_t1": "storage/raw_geotiff/2024-05-15_scene.tif",
                "image_path_t2": "storage/raw_geotiff/2024-09-20_scene.tif",
                "date_t1": "2024-05-15",
                "date_t2": "2024-09-20",
                "drift_threshold": 0.15,
                "enqueue_for_review": True,
            },
        )
        assert resp.status_code == 200, f"Change detection failed: {resp.text}"
        change_data = resp.json()
        assert change_data["candidates_detected"] > 0
        c0 = change_data["candidates"][0]
        print(f"  [PASS] Detected {change_data['candidates_detected']} change candidates.")
        print(f"    - Category: {c0['category']}")
        print(f"    - Confidence: {c0['confidence']:.1%}")
        print(f"    - Drift: {c0['drift']:.3f}")
        print(f"    - QA Pass: {c0['cloud_qa_pass']}")
        print(f"    - Model Hash: {c0['provenance']['model_hash'][:18]}...")

        # 5. Analyst Review Queue API & Provenance Contract
        print("\n[TEST 5/8] Testing Analyst Review Queue (/api/v1/review/queue)...")
        resp = client.get("/api/v1/review/queue")
        assert resp.status_code == 200, f"Review queue list failed: {resp.text}"
        q_data = resp.json()
        assert q_data["total_returned"] > 0
        item0 = q_data["items"][0]
        assert "event_id" in item0
        assert "provenance" in item0
        assert item0["provenance"]["sensor"] is not None
        print(f"  [PASS] Review Queue contains {q_data['total_returned']} items.")
        print(f"    - Event ID: {item0['event_id']}")
        print(f"    - Status: {item0['status']}")
        print(f"    - Category: {item0['change_category']}")
        print(f"    - Provenance Sensor: {item0['provenance']['sensor']}")
        print(f"    - Provenance Checkpoint: {item0['provenance']['model_checkpoint_hash'][:18]}...")

        # 6. Review Item Confirmation Update
        print("\n[TEST 6/8] Testing Review Queue Update (PATCH /api/v1/review/queue/{event_id})...")
        patch_resp = client.patch(
            f"/api/v1/review/queue/{item0['event_id']}",
            json={"status": "CONFIRMED", "remarks": "Verified by Automated E2E Test Suite"},
        )
        assert patch_resp.status_code == 200, f"Patch failed: {patch_resp.text}"
        updated_item = patch_resp.json()
        assert updated_item["status"] == "CONFIRMED"
        print(f"  [PASS] Review item {item0['event_id']} successfully updated to status: CONFIRMED")

        # 7. Tile Preview PNG Serving API
        print("\n[TEST 7/8] Testing Tile Preview PNG Rendering (/api/v1/tiles/{tile_id}/preview.png)...")
        tile_id = hit["tile_id"]
        tile_resp = client.get(f"/api/v1/tiles/{tile_id}/preview.png")
        assert tile_resp.status_code == 200, f"Tile preview failed: {tile_resp.text}"
        assert tile_resp.headers["content-type"] == "image/png"
        assert len(tile_resp.content) > 100
        print(f"  [PASS] Tile preview PNG streamed successfully ({len(tile_resp.content)} bytes, image/png).")

        # 8. Unsupervised Discovery & Clustering API
        print("\n[TEST 8/8] Testing Unsupervised Clustering (/api/v1/discovery/cluster)...")
        disc_resp = client.get("/api/v1/discovery/cluster?num_clusters=3&method=kmeans")
        assert disc_resp.status_code == 200, f"Clustering failed: {disc_resp.text}"
        cluster_data = disc_resp.json()
        assert cluster_data["status"] == "success"
        assert len(cluster_data["clusters"]) > 0
        assert len(cluster_data["points_2d"]) > 0
        print(f"  [PASS] Unsupervised clustering computed {len(cluster_data['clusters'])} clusters over {cluster_data['total_tiles']} tiles.")
        for cl in cluster_data["clusters"][:3]:
            print(f"    - {cl['label']}: {cl['tile_count']} tiles ({cl['percentage']}%)")

    print("\n=======================================================")
    print("  ALL 8 E2E PIPELINE INTEGRATION TESTS PASSED (100%)")
    print("=======================================================\n")


if __name__ == "__main__":
    test_complete_platform()
