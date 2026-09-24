import urllib.request
import json
import numpy as np

BASE_URL = "http://127.0.0.1:8000"

def evaluate_k(k_val):
    url = f"{BASE_URL}/api/v1/discovery/cluster?num_clusters={k_val}"
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode())
    
    print(f"\n{'='*70}")
    print(f"EVALUATION FOR k = {k_val}")
    print(f"{'='*70}")
    print(f"Total tiles: {data['total_tiles']}, Total clusters: {data['cluster_count']}")
    
    clusters = data["clusters"]
    for c in clusters:
        print(f"  Cluster {c['cluster_id']}:")
        print(f"    Label: {c['label']}")
        print(f"    Semantic Theme: {c.get('semantic_theme')}")
        print(f"    Centroid Cosine Sim: {c.get('centroid_similarity')}")
        print(f"    Tile Count: {c['tile_count']} ({c['percentage']}%)")
        print(f"    Sample Tiles: {c['sample_tiles'][:3]}")

    labels = [c.get('semantic_theme') for c in clusters]
    unique_labels = len(set(labels))
    print(f"\n  Summary for k={k_val}: {unique_labels} unique semantic themes across {len(clusters)} clusters.")
    return data

if __name__ == "__main__":
    for k in [3, 4, 5]:
        evaluate_k(k)
