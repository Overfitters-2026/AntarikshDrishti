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


def cluster_tiles_unsupervised(
    *,
    num_clusters: int = 5,
    min_cluster_size: int = 3,
    method: str = "kmeans",
) -> dict[str, Any]:
    """
    Performs unsupervised clustering over satellite tile embeddings.
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
    for r in records:
        if r.vector is not None:
            vectors.append(list(r.vector))
            tile_items.append({
                "tile_id": r.payload.get("tile_id", ""),
                "bbox": r.payload.get("bbox", {}),
                "date": r.payload.get("date", ""),
                "sensor": r.payload.get("sensor", ""),
            })

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

    # 3. Aggregate cluster summaries
    cluster_map: dict[int, list[int]] = {}
    for idx, lbl in enumerate(labels):
        lbl_int = int(lbl)
        if lbl_int not in cluster_map:
            cluster_map[lbl_int] = []
        cluster_map[lbl_int].append(idx)

    cluster_summaries = []
    points_2d = []

    theme_names = [
        "Dense Canopy & Forest Vegetation",
        "Urban Infrastructure & Builtup",
        "Water Reservoir & Hydrology",
        "Agricultural Cropland & Soil",
        "Industrial & Commercial Zones",
        "Transitional / Disturbed Terrain",
    ]

    for c_id, indices in cluster_map.items():
        c_name = theme_names[c_id % len(theme_names)]
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
            "label": f"Cluster {c_id}: {c_name}",
            "tile_count": len(indices),
            "percentage": round(len(indices) / n_samples * 100, 1),
            "envelope": envelope,
            "sample_tiles": [t["tile_id"] for t in c_tiles[:5]],
        })

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
        "points_2d": points_2d,
    }
