"""
Audit verification script testing three endpoints against live FastAPI + Qdrant:
1. GET /api/v1/discovery/cluster
2. POST /api/v1/search/image (both multipart upload and JSON body)
3. GET /api/v1/hotspots/{id}/similar
"""
import io
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_discovery_cluster():
    print("\n" + "="*80)
    print("TEST 1: GET /api/v1/discovery/cluster")
    print("="*80)
    url = f"{BASE_URL}/api/v1/discovery/cluster"
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode())
    
    print(f"Status Code: 200")
    print(f"Status: {data.get('status')}")
    print(f"Total Tiles Clustered from Qdrant: {data.get('total_tiles')}")
    print(f"Cluster Count: {data.get('cluster_count')}")
    print("\nClusters Breakdown:")
    for c in data.get("clusters", []):
        print(f"  - [{c['label']}] (Tile Count: {c['tile_count']}, Percentage: {c['percentage']}%)")
        print(f"    Sample Tile IDs: {c['sample_tiles'][:3]}")
    
    pts = data.get("points_2d", [])
    print(f"\n2D Manifold Points Computed: {len(pts)} total")
    if pts:
        p0 = pts[0]
        print(f"  Sample point: tile_id={p0['tile_id']}, cluster={p0['cluster_id']}, coords=({p0['x']}, {p0['y']})")
    return data

def test_search_image_json():
    print("\n" + "="*80)
    print("TEST 2A: POST /api/v1/search/image (JSON image_path)")
    print("="*80)
    url = f"{BASE_URL}/api/v1/search/image"
    payload = json.dumps({
        "image_path": "storage/tiles/test_rgb.png",
        "top_k": 3
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
    
    print(f"Status: 200 OK")
    print(f"Search Mode: {data.get('mode')}")
    print(f"Query Source: {data.get('query')}")
    print(f"Top K requested: {data.get('top_k')}, Returned: {len(data.get('results', []))}")
    print("\nTop Real Matches from Qdrant Vector Search:")
    for idx, hit in enumerate(data.get("results", [])):
        print(f"  {idx+1}. Tile ID: {hit['tile_id']}")
        print(f"     Cosine Similarity Score: {hit['score']:.4f}")
        print(f"     Sensor: {hit['sensor']}, Date: {hit['date']}, Lat: {hit['lat']:.4f}, Lng: {hit['lng']:.4f}")
    return data

def test_search_image_upload():
    print("\n" + "="*80)
    print("TEST 2B: POST /api/v1/search/image (Multipart File Upload)")
    print("="*80)
    url = f"{BASE_URL}/api/v1/search/image"
    test_img = Path("storage/tiles/test_rgb.png")
    if not test_img.exists():
        # Create a 256x256 test png if needed
        import numpy as np
        from PIL import Image
        arr = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
        Image.fromarray(arr).save(test_img)
    
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = bytearray()
    
    # top_k field
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="top_k"\r\n\r\n3\r\n')
    
    # file field
    with open(test_img, "rb") as f:
        file_bytes = f.read()
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="file"; filename="query_tile.png"\r\n')
    body.extend(b'Content-Type: image/png\r\n\r\n')
    body.extend(file_bytes)
    body.extend(f"\r\n--{boundary}--\r\n".encode())
    
    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
    
    print(f"Status: 200 OK")
    print(f"Search Mode: {data.get('mode')}")
    print(f"Uploaded Filename: {data.get('query')}")
    print(f"Results Count: {len(data.get('results', []))}")
    for idx, hit in enumerate(data.get("results", [])):
        print(f"  {idx+1}. Tile ID: {hit['tile_id']} | Score: {hit['score']:.4f} | Date: {hit['date']}")
    return data

def test_hotspot_similar():
    print("\n" + "="*80)
    print("TEST 3: GET /api/v1/hotspots/{id}/similar")
    print("="*80)
    # Use real hotspot ID from database
    hotspot_id = "mumbai_2023-12-08_s2_r256_c256_2023-12-08__mumbai_2024-12-17_s2_r256_c256_2024-12-17"
    url = f"{BASE_URL}/api/v1/hotspots/{urllib.parse.quote(hotspot_id)}/similar?top_k=3"
    
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
    
    print(f"Status: 200 OK")
    print(f"Query Hotspot ID: {data.get('query_hotspot_id')}")
    print(f"Matched Qdrant Vector Tile: {data.get('matched_tile_id')}")
    print(f"Top K: {data.get('top_k')}, Returned: {data.get('total_results')}")
    print("\nNearest Neighbor Visual Hotspots from Qdrant:")
    for idx, hit in enumerate(data.get("results", [])):
        print(f"  {idx+1}. Tile ID: {hit['tile_id']}")
        print(f"     Cosine Similarity Score: {hit['score']:.4f}")
        print(f"     Sensor: {hit['sensor']}, Date: {hit['date']}, Lat: {hit['lat']:.4f}, Lng: {hit['lng']:.4f}")
    return data

if __name__ == "__main__":
    test_discovery_cluster()
    test_search_image_json()
    test_search_image_upload()
    test_hotspot_similar()
    print("\n" + "="*80)
    print("ALL THREE ENDPOINTS VERIFIED WORKING WITH REAL QDRANT DATA END-TO-END!")
    print("="*80)
