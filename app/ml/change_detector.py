from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

from app.core.config import settings
from app.ml.embedder import OpenCLIPEmbedder
from app.services.cloud_mask import compute_ndvi_or_green_index, validate_qa_mask
from app.services.normalizer import histogram_match_t2_to_t1


@dataclass(frozen=True)
class ChangeResult:
    t1_tile_id: str
    t2_tile_id: str
    drift: float
    similarity: float
    confidence: float
    category: str
    cloud_qa_pass: bool
    suppressed: bool
    reason: Optional[str] = None
    qa_metrics: Optional[dict] = None


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    a = np.asarray(v1, dtype=np.float32)
    b = np.asarray(v2, dtype=np.float32)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom <= 1e-12:
        return 0.0
    return float(np.dot(a, b) / denom)


def compute_spectral_drift(t1: np.ndarray, t2: np.ndarray) -> float:
    """
    Computes direct radiometric & spectral variation between T1 and T2 arrays.
    """
    a1 = t1.astype(np.float32) / (255.0 if t1.max() > 1.0 else 1.0)
    a2 = t2.astype(np.float32) / (255.0 if t2.max() > 1.0 else 1.0)
    bands = min(a1.shape[0] if a1.ndim == 3 else 1, a2.shape[0] if a2.ndim == 3 else 1)
    
    diff = np.abs(a1[:bands] - a2[:bands])
    mean_diff = float(np.mean(diff))
    return float(np.clip(mean_diff * 2.5, 0.0, 1.0))


def detect_change_between_tiles(
    *,
    embedder: OpenCLIPEmbedder,
    t1_tile_id: str,
    t2_tile_id: str,
    t1_array: np.ndarray,
    t2_array: np.ndarray,
    t1_vector: Optional[list[float]] = None,
    t2_vector: Optional[list[float]] = None,
) -> ChangeResult:
    # 1. QA Mask & Cloud/Shadow filtering
    t1_pass, t1_qa, t1_reason = validate_qa_mask(
        t1_array,
        max_ratio=settings.CLOUD_SHADOW_MAX_RATIO,
        cloud_threshold=0.92,
        shadow_threshold=settings.SHADOW_BRIGHTNESS_THRESHOLD,
    )
    if not t1_pass:
        return ChangeResult(
            t1_tile_id=t1_tile_id,
            t2_tile_id=t2_tile_id,
            drift=0.0,
            similarity=1.0,
            confidence=0.0,
            category="Suppressed / Cloud Occlusion",
            cloud_qa_pass=False,
            suppressed=True,
            reason=f"T1 {t1_reason}",
            qa_metrics=t1_qa,
        )

    t2_pass, t2_qa, t2_reason = validate_qa_mask(
        t2_array,
        max_ratio=settings.CLOUD_SHADOW_MAX_RATIO,
        cloud_threshold=0.92,
        shadow_threshold=settings.SHADOW_BRIGHTNESS_THRESHOLD,
    )
    if not t2_pass:
        return ChangeResult(
            t1_tile_id=t1_tile_id,
            t2_tile_id=t2_tile_id,
            drift=0.0,
            similarity=1.0,
            confidence=0.0,
            category="Suppressed / Cloud Occlusion",
            cloud_qa_pass=False,
            suppressed=True,
            reason=f"T2 {t2_reason}",
            qa_metrics=t2_qa,
        )

    # 2. Extract vectors
    vec1 = t1_vector if t1_vector is not None else embedder.embed_image_array(t1_array)
    vec2 = t2_vector if t2_vector is not None else embedder.embed_image_array(t2_array)

    # 3. Embedding drift & Spectral difference
    sim = cosine_similarity(vec1, vec2)
    embed_drift = float(max(0.0, 1.0 - sim))
    spectral_drift = compute_spectral_drift(t1_array, t2_array)
    
    # Combined drift metric
    drift = float(np.clip(0.5 * embed_drift + 0.5 * spectral_drift, 0.0, 1.0))

    # 4. Multi-band Vegetative & Spectral Transition Analysis
    t1_ndvi = compute_ndvi_or_green_index(t1_array)
    t2_ndvi = compute_ndvi_or_green_index(t2_array)
    ndvi_delta = t2_ndvi - t1_ndvi

    # Compute RGB band averages
    t1_f = t1_array.astype(np.float32) / (255.0 if t1_array.max() > 1.0 else 1.0)
    t2_f = t2_array.astype(np.float32) / (255.0 if t2_array.max() > 1.0 else 1.0)

    t2_mean_r = float(np.mean(t2_f[0]))
    t2_mean_g = float(np.mean(t2_f[1]))
    t2_mean_b = float(np.mean(t2_f[2]))
    t2_mean_nir = float(np.mean(t2_f[3])) if t2_f.shape[0] >= 4 else 0.5

    # Determine Change Category based on spectral transition signatures & zero-shot vectors
    if drift < 0.08:
        category = "Stable / No Significant Change"
        confidence = round(float(drift), 4)
    elif t2_mean_b > 0.65 and t2_mean_nir < 0.20 and t2_mean_r < 0.35:
        category = "Water Body Expansion / Flooding"
        confidence = round(float(np.clip(0.75 + drift * 0.25, 0.75, 0.98)), 4)
    elif ndvi_delta < -0.30 and t2_mean_r > 0.55 and t2_mean_b < 0.45:
        category = "Vegetation Clearance / Deforestation"
        confidence = round(float(np.clip(0.70 + drift * 0.30, 0.70, 0.96)), 4)
    elif t2_mean_r > 0.60 and t2_mean_g > 0.60 and t2_mean_b > 0.60:
        category = "Construction / New Structure"
        confidence = round(float(np.clip(0.80 + drift * 0.20, 0.80, 0.99)), 4)
    elif np.abs(ndvi_delta) > 0.20:
        category = "Agricultural Transition"
        confidence = round(float(np.clip(0.60 + drift * 0.40, 0.60, 0.90)), 4)
    else:
        # Fall back to zero-shot CLIP classification
        clip_cat, clip_conf = embedder.classify_change(vec1, vec2)
        category = clip_cat
        confidence = round(float(np.clip(0.5 * drift + 0.5 * clip_conf, 0.4, 0.95)), 4)

    return ChangeResult(
        t1_tile_id=t1_tile_id,
        t2_tile_id=t2_tile_id,
        drift=round(drift, 4),
        similarity=round(sim, 4),
        confidence=confidence,
        category=category,
        cloud_qa_pass=True,
        suppressed=False,
        reason=None,
        qa_metrics={"t1": t1_qa, "t2": t2_qa, "ndvi_t1": round(t1_ndvi, 3), "ndvi_t2": round(t2_ndvi, 3)},
    )