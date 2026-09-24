from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import os
from typing import Any, Optional

import joblib
import numpy as np

from app.core.config import settings
from app.ml.embedder import OpenCLIPEmbedder
from app.services.cloud_mask import (
    compute_cloud_shadow_ratio,
    is_cloud_or_shadow_contaminated,
)
from app.services.normalizer import histogram_match_t2_to_t1

_rf_model = None
_rf_model_loaded = False


def get_rf_classifier():
    global _rf_model, _rf_model_loaded
    if not _rf_model_loaded:
        candidates = [
            os.path.join(os.getcwd(), "data", "models", "rf_false_alarm.joblib"),
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "data",
                "models",
                "rf_false_alarm.joblib",
            ),
        ]
        for path in candidates:
            if os.path.exists(path):
                try:
                    _rf_model = joblib.load(path)
                    break
                except Exception:
                    _rf_model = None
        _rf_model_loaded = True
    return _rf_model


@dataclass(frozen=True)
class ChangeResult:
    t1_tile_id: str
    t2_tile_id: str
    drift: float
    similarity: float
    confidence: float
    suppressed: bool
    reason: Optional[str] = None
    confidence_factors: Optional[dict[str, Any]] = None


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    a = np.asarray(v1, dtype=np.float32)
    b = np.asarray(v2, dtype=np.float32)
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom <= 1e-12:
        return 0.0
    return float(np.dot(a, b) / denom)


def embedding_drift(v1: list[float], v2: list[float]) -> float:
    sim = cosine_similarity(v1, v2)
    return float(max(0.0, 1.0 - sim))


def detect_change_between_tiles(
    *,
    embedder: OpenCLIPEmbedder,
    t1_tile_id: str,
    t2_tile_id: str,
    t1_array: np.ndarray,
    t2_array: np.ndarray,
    t1_vector: Optional[list[float]] = None,
    t2_vector: Optional[list[float]] = None,
    date_t1: Optional[str] = None,
    date_t2: Optional[str] = None,
) -> ChangeResult:
    if is_cloud_or_shadow_contaminated(
        t1_array,
        max_ratio=settings.CLOUD_SHADOW_MAX_RATIO,
        cloud_threshold=settings.CLOUD_BRIGHTNESS_THRESHOLD,
        shadow_threshold=settings.SHADOW_BRIGHTNESS_THRESHOLD,
    ):
        return ChangeResult(
            t1_tile_id=t1_tile_id,
            t2_tile_id=t2_tile_id,
            drift=0.0,
            similarity=1.0,
            confidence=0.0,
            suppressed=True,
            reason="T1 cloud/shadow contamination",
        )

    if is_cloud_or_shadow_contaminated(
        t2_array,
        max_ratio=settings.CLOUD_SHADOW_MAX_RATIO,
        cloud_threshold=settings.CLOUD_BRIGHTNESS_THRESHOLD,
        shadow_threshold=settings.SHADOW_BRIGHTNESS_THRESHOLD,
    ):
        return ChangeResult(
            t1_tile_id=t1_tile_id,
            t2_tile_id=t2_tile_id,
            drift=0.0,
            similarity=1.0,
            confidence=0.0,
            suppressed=True,
            reason="T2 cloud/shadow contamination",
        )

    t2_norm = histogram_match_t2_to_t1(t1_array, t2_array)

    vec1 = t1_vector if t1_vector is not None else embedder.embed_image_array(t1_array)
    vec2 = t2_vector if t2_vector is not None else embedder.embed_image_array(t2_norm)

    sim = cosine_similarity(vec1, vec2)
    drift = embedding_drift(vec1, vec2)

    c1 = compute_cloud_shadow_ratio(
        t1_array,
        cloud_threshold=settings.CLOUD_BRIGHTNESS_THRESHOLD,
        shadow_threshold=settings.SHADOW_BRIGHTNESS_THRESHOLD,
    )
    c2 = compute_cloud_shadow_ratio(
        t2_array,
        cloud_threshold=settings.CLOUD_BRIGHTNESS_THRESHOLD,
        shadow_threshold=settings.SHADOW_BRIGHTNESS_THRESHOLD,
    )
    d1 = None
    d2 = None
    if date_t1:
        try:
            d1 = datetime.fromisoformat(date_t1[:10])
        except Exception:
            pass
    if date_t2:
        try:
            d2 = datetime.fromisoformat(date_t2[:10])
        except Exception:
            pass

    days_between = abs((d2 - d1).days) if (d1 and d2) else 30
    month_t1 = d1.month if d1 else 1
    month_t2 = d2.month if d2 else 1

    feature_vector = np.array(
        [[drift, sim, c1, c2, days_between, month_t1, month_t2]],
        dtype=np.float32,
    )

    rf = get_rf_classifier()
    if rf is not None:
        try:
            # Learned probability of class 1 (Real Change)
            confidence = float(rf.predict_proba(feature_vector)[0][1])
        except Exception:
            confidence = float(min(1.0, drift / max(settings.CHANGE_DRIFT_THRESHOLD, 1e-6)))
    else:
        confidence = float(min(1.0, drift / max(settings.CHANGE_DRIFT_THRESHOLD, 1e-6)))

    factors = {
        "drift": float(round(drift, 4)),
        "similarity": float(round(sim, 4)),
        "cloud_contamination_ratio_t1": float(round(c1, 4)),
        "cloud_contamination_ratio_t2": float(round(c2, 4)),
        "days_between": int(days_between),
        "month_t1": int(month_t1),
        "month_t2": int(month_t2),
        "radiometric_normalization": "Histogram CDF Matched (t2 -> t1)",
        "spatial_alignment": "10m CRS Pixel Grid (EPSG:32643)",
        "rf_model": "RandomForestClassifier (50 trees, max_depth=4)" if rf is not None else "Deterministic Calibration",
    }

    return ChangeResult(
        t1_tile_id=t1_tile_id,
        t2_tile_id=t2_tile_id,
        drift=drift,
        similarity=sim,
        confidence=confidence,
        suppressed=False,
        reason=None,
        confidence_factors=factors,
    )