import urllib.request
import json
import numpy as np

# Let's inspect the vectors directly from discovery response points_2d or Qdrant
# We can test granular theme probes via an API or python embedder
from app.ml.embedder import get_embedder

embedder = get_embedder()

# Granular probes tailored to Mumbai AOI sub-geographies
CANDIDATE_THEMES = [
    ("Dense Commercial & High-Rise Urban", "satellite view of dense metropolitan high-rise buildings, skyscrapers, and commercial city center"),
    ("Low-Rise Residential & Dense Settlement", "satellite view of residential neighborhoods, dense housing rooftops, and suburban roads"),
    ("Airport Runways & Aviation Tarmac", "satellite view of airport runway tarmac, airport taxiways, and airport terminals"),
    ("Maritime Port, Docks & Logistics", "satellite view of maritime shipping docks, port harbor, cargo containers, and industrial piers"),
    ("Coastal Bay & Open Water Hydrology", "satellite view of ocean water, coastal bay, sea waves, and deep water body"),
    ("Coastal Wetlands, Mudflats & Mangroves", "satellite view of coastal tidal mudflats, mangrove vegetation, and creek wetlands"),
]

theme_vecs = []
for label, prompt in CANDIDATE_THEMES:
    v = np.array(embedder.embed_text(prompt), dtype=np.float32)
    v /= np.linalg.norm(v)
    theme_vecs.append((label, v))

# Test on k=3, 4, 5 centroids
from app.services.qdrant_store import get_qdrant_store
from app.services.discovery import _numpy_kmeans

store = get_qdrant_store()
records = store.scroll_by_payload(must=[], limit=200)
valid_recs = [r for r in records if r.vector is not None and str(r.payload.get("tile_id","")).startswith("mumbai_")]

# Deduplicate
seen = set()
unique_recs = []
for r in valid_recs:
    tid = str(r.payload.get("tile_id",""))
    if tid not in seen:
        seen.add(tid)
        unique_recs.append(r)

X = np.array([r.vector for r in unique_recs], dtype=np.float32)
print(f"Loaded {len(X)} unique Mumbai vectors.")

for k in [3, 4, 5]:
    labels = _numpy_kmeans(X, k=k)
    print(f"\n{'='*70}\nTESTING GRANULAR THEMES FOR k={k}\n{'='*70}")
    matched_themes = []
    for c in range(k):
        idx = np.where(labels == c)[0]
        centroid = X[idx].mean(axis=0)
        centroid /= np.linalg.norm(centroid)
        
        scores = [(name, float(np.dot(centroid, tv))) for name, tv in theme_vecs]
        scores.sort(key=lambda s: s[1], reverse=True)
        top_name, top_score = scores[0]
        matched_themes.append(top_name)
        print(f"Cluster {c} ({len(idx)} tiles):")
        print(f"  Top Match: {top_name} (cos {top_score:.4f})")
        print(f"  Runner-up: {scores[1][0]} (cos {scores[1][1]:.4f})")
        print(f"  3rd:       {scores[2][0]} (cos {scores[2][1]:.4f})")
    print(f"Unique Themes for k={k}: {len(set(matched_themes))} / {k}")
