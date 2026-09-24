from __future__ import annotations

import logging
from typing import Any, Optional

import numpy as np

from app.core.config import settings
from app.services.qdrant_store import get_qdrant_store

logger = logging.getLogger(__name__)


def _numpy_pca_2d(X: np.ndarray) -> np.ndarray:
    """
    Pure NumPy SVD-based PCA projection to 2D.
    Immune to Windows DLL AppControl blocks.
    """
    X_centered = X - np.mean(X, axis=0)
    U, S, Vt = np.linalg.svd(X_centered, full_matrices=False)
    return np.dot(X_centered, Vt[:2].T)


def _numpy_kmeans(X: np.ndarray, k: int, max_iter: int = 50) -> np.ndarray:
    """
    Pure NumPy K-Means clustering algorithm.
    """
    np.random.seed(42)
    n_samples = len(X)
    k = min(k, n_samples)
    
    init_indices = np.random.choice(n_samples, size=k, replace=False)
    centroids = X[init_indices].copy()
    labels = np.zeros(n_samples, dtype=int)

    for _ in range(max_iter):
        distances = np.linalg.norm(X[:, np.newaxis, :] - centroids[np.newaxis, :, :], axis=2)
        new_labels = np.argmin(distances, axis=1)

        if np.array_equal(labels, new_labels):
            break
        labels = new_labels

        for c in range(k):
            members = X[labels == c]
            if len(members) > 0:
                centroids[c] = np.mean(members, axis=0)

    return labels


SEMANTIC_CATEGORIES = [
    ("Dense Commercial & High-Rise Urban", "satellite imagery of dense metropolitan high-rise buildings, commercial skyline, and skyscrapers"),
    ("Low-Rise Residential & Suburban Fabric", "satellite imagery of dense residential housing rooftops, suburban streets, and neighborhood settlement"),
    ("Airport Runways, Hangars & Tarmac", "satellite imagery of airport runway tarmac, airport taxiways, airport terminals, and hangars"),
    ("Maritime Port, Docks & Industrial Zone", "satellite imagery of maritime shipping docks, port harbor, cargo containers, warehouses, and industrial piers"),
    ("Coastal Bay & Open Water Hydrology", "satellite imagery of ocean seawater, coastal bay, river estuary, and deep open water"),
    ("Coastal Wetlands, Mudflats & Mangroves", "satellite imagery of coastal tidal mudflats, mangrove vegetation, intertidal marsh, and creek wetlands"),
    ("Dense Canopy & Forest Vegetation", "satellite imagery of dense green tree canopy, forest, and lush vegetation"),
    ("Agricultural Cropland & Rural Soil", "satellite imagery of agricultural farm fields, crop vegetation, and rural soil"),
    ("Land Clearance & Active Earthworks", "satellite imagery of bare ground earthworks, construction sites, and excavated soil"),
]

_THEME_EMBEDDINGS: dict[str, np.ndarray] = {}


def _get_theme_embeddings() -> list[tuple[str, np.ndarray]]:
    global _THEME_EMBEDDINGS
    if not _THEME_EMBEDDINGS:
        from app.ml.embedder import get_embedder
        embedder = get_embedder()
        for label, prompt in SEMANTIC_CATEGORIES:
            vec = np.array(embedder.embed_text(prompt), dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec /= norm
            _THEME_EMBEDDINGS[label] = vec
    return list(_THEME_EMBEDDINGS.items())


def cluster_tiles_unsupervised(
    *,
    num_clusters: int = 5,
    min_cluster_size: int = 3,
    method: str = "kmeans",
) -> dict[str, Any]:
    """
    Performs unsupervised clustering over satellite tile embeddings.
    Derives genuine semantic labels via zero-shot cosine similarity between
    each cluster's centroid vector and canonical geospatial CLIP embeddings.
    Computes inter-cluster centroid separation metrics.
    Returns 2D PCA projections and spatial cluster envelopes.
    """
    store = get_qdrant_store()
    records = store.scroll_by_payload(must=[], limit=2000)

    if not records or len(records) < 3:
        return {
            "status": "empty",
            "message": "Insufficient tiles indexed in Qdrant for clustering.",
            "total_tiles": len(records),
            "clusters": [],
            "points_2d": [],
        }

    vectors = []
    tile_items = []
    seen_tile_ids = set()

    for r in records:
        if r.vector is not None:
            tid = str((r.payload or {}).get("tile_id", ""))
            # Ensure only authentic Mumbai AOI tiles are clustered and deduplicated
            if not tid.startswith("mumbai_") or tid in seen_tile_ids:
                continue
            seen_tile_ids.add(tid)
            vectors.append(list(r.vector))
            tile_items.append({
                "tile_id": tid,
                "bbox": (r.payload or {}).get("bbox", {}),
                "date": (r.payload or {}).get("date", ""),
                "sensor": (r.payload or {}).get("sensor", ""),
            })

    if len(vectors) < 3:
        return {
            "status": "empty",
            "message": "Insufficient valid Mumbai tiles in Qdrant for clustering.",
            "total_tiles": len(vectors),
            "clusters": [],
            "points_2d": [],
        }

    X = np.array(vectors, dtype=np.float32)
    n_samples = len(X)

    # 1. 2D projection using pure NumPy PCA
    try:
        X_2d = _numpy_pca_2d(X)
    except Exception as e:
        logger.warning(f"SVD PCA error ({e}), using first 2 dimensions")
        X_2d = X[:, :2]

    # Normalize 2D coords to [-100, 100] for chart rendering
    x_min, x_max = X_2d[:, 0].min(), X_2d[:, 0].max()
    y_min, y_max = X_2d[:, 1].min(), X_2d[:, 1].max()
    norm_x = ((X_2d[:, 0] - x_min) / max(x_max - x_min, 1e-6) * 200 - 100).tolist()
    norm_y = ((X_2d[:, 1] - y_min) / max(y_max - y_min, 1e-6) * 200 - 100).tolist()

    # 2. Clustering algorithm (pure NumPy K-Means)
    k = min(num_clusters, max(2, n_samples // 2))
    labels = _numpy_kmeans(X, k=k)

    # 3. Aggregate cluster summaries and compute real centroid semantic labels
    cluster_map: dict[int, list[int]] = {}
    for idx, lbl in enumerate(labels):
        lbl_int = int(lbl)
        if lbl_int not in cluster_map:
            cluster_map[lbl_int] = []
        cluster_map[lbl_int].append(idx)

    theme_embeddings = _get_theme_embeddings()
    cluster_summaries = []
    points_2d = []
    centroids: dict[int, np.ndarray] = {}

    for c_id, indices in cluster_map.items():
        # Derive mathematically sound centroid vector for cluster c_id
        cluster_vecs = X[indices]
        centroid = cluster_vecs.mean(axis=0)
        c_norm = np.linalg.norm(centroid)
        if c_norm > 0:
            centroid /= c_norm
        centroids[c_id] = centroid

        best_theme = "Unassigned"
        best_sim = -1.0
        for theme_name, theme_vec in theme_embeddings:
            sim = float(np.dot(centroid, theme_vec))
            if sim > best_sim:
                best_sim = sim
                best_theme = theme_name

        c_tiles = [tile_items[i] for i in indices]
        
        all_bounds = []
        for t in c_tiles:
            b = t.get("bbox", {}).get("bounds")
            if b and len(b) == 4:
                all_bounds.append(b)

        envelope = None
        if all_bounds:
            arr_b = np.array(all_bounds)
            envelope = [
                float(arr_b[:, 0].min()),
                float(arr_b[:, 1].min()),
                float(arr_b[:, 2].max()),
                float(arr_b[:, 3].max()),
            ]

        cluster_summaries.append({
            "cluster_id": c_id,
            "label": f"Cluster {c_id}: {best_theme} (cos {best_sim:.3f})",
            "semantic_theme": best_theme,
            "centroid_similarity": round(best_sim, 4),
            "tile_count": len(indices),
            "percentage": round(len(indices) / n_samples * 100, 1),
            "envelope": envelope,
            "sample_tiles": [t["tile_id"] for t in c_tiles[:5]],
        })

    # 4. Compute inter-cluster centroid distances and separation metrics
    inter_cluster_distances = []
    c_keys = sorted(centroids.keys())
    for i in range(len(c_keys)):
        for j in range(i + 1, len(c_keys)):
            c1, c2 = c_keys[i], c_keys[j]
            cos_sim = float(np.dot(centroids[c1], centroids[c2]))
            cos_dist = float(1.0 - cos_sim)
            inter_cluster_distances.append({
                "pair": f"C{c1}-C{c2}",
                "cosine_similarity": round(cos_sim, 4),
                "cosine_distance": round(cos_dist, 4),
            })

    mean_dist = float(np.mean([d["cosine_distance"] for d in inter_cluster_distances])) if inter_cluster_distances else 0.0
    min_dist = float(np.min([d["cosine_distance"] for d in inter_cluster_distances])) if inter_cluster_distances else 0.0

    for i in range(n_samples):
        points_2d.append({
            "tile_id": tile_items[i]["tile_id"],
            "cluster_id": int(labels[i]),
            "x": round(norm_x[i], 2),
            "y": round(norm_y[i], 2),
            "date": tile_items[i]["date"],
            "bbox": tile_items[i]["bbox"],
        })

    return {
        "status": "success",
        "total_tiles": n_samples,
        "cluster_count": len(cluster_summaries),
        "clusters": sorted(cluster_summaries, key=lambda c: c["tile_count"], reverse=True),
        "separation_metrics": {
            "mean_inter_cluster_distance": round(mean_dist, 4),
            "min_inter_cluster_distance": round(min_dist, 4),
            "pairwise_distances": inter_cluster_distances,
        },
        "points_2d": points_2d,
    }

