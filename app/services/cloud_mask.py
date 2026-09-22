from __future__ import annotations

import numpy as np


def _to_hwc(array: np.ndarray) -> np.ndarray:
    if array.ndim == 2:
        return np.stack([array, array, array], axis=-1)
    if array.shape[0] in (1, 3, 4) and array.shape[-1] not in (1, 3, 4):
        return np.transpose(array[:3], (1, 2, 0))
    return array[..., :3]


def _normalize_to_unit(image: np.ndarray) -> np.ndarray:
    img = image.astype(np.float32)
    if img.max() > 1.0:
        img = img / 255.0
    return np.clip(img, 0.0, 1.0)


def compute_cloud_shadow_ratio(
    array: np.ndarray,
    *,
    cloud_threshold: float = 0.85,
    shadow_threshold: float = 0.05,
) -> tuple[float, float, float]:
    """
    Computes cloud ratio, shadow ratio, and combined contamination.
    """
    img = _normalize_to_unit(_to_hwc(array))
    gray = img.mean(axis=-1)
    cloud_mask = gray >= cloud_threshold
    shadow_mask = gray <= shadow_threshold
    cloud_ratio = float(np.mean(cloud_mask))
    shadow_ratio = float(np.mean(shadow_mask))
    combined_ratio = float(np.mean(np.logical_or(cloud_mask, shadow_mask)))
    return cloud_ratio, shadow_ratio, combined_ratio


def compute_ndvi_or_green_index(array: np.ndarray) -> float:
    """
    Computes average vegetative index:
    - If 4-band [R, G, B, NIR]: uses (NIR - Red) / (NIR + Red)
    - If 3-band [R, G, B]: uses Visible Atmospherically Resistant Index (VARI) = (G - R) / (G + R - B)
    """
    img = array.astype(np.float32)
    if img.ndim == 3 and img.shape[0] >= 4:
        # Band 0: Red, Band 3: NIR
        red = img[0]
        nir = img[3]
        denom = nir + red + 1e-6
        ndvi = (nir - red) / denom
        return float(np.mean(np.clip(ndvi, -1.0, 1.0)))
    elif img.ndim == 3 and img.shape[0] >= 3:
        red = img[0]
        green = img[1]
        blue = img[2]
        denom = green + red - blue + 1e-6
        vari = (green - red) / np.maximum(np.abs(denom), 1e-3)
        return float(np.mean(np.clip(vari, -1.0, 1.0)))
    return 0.0


def validate_qa_mask(
    array: np.ndarray,
    *,
    max_ratio: float = 0.40,
    cloud_threshold: float = 0.85,
    shadow_threshold: float = 0.05,
) -> tuple[bool, dict, str | None]:
    """
    Validates tile against QA/Cloud/Shadow criteria.
    Returns: (passed: bool, metrics: dict, reason: Optional[str])
    """
    c_ratio, s_ratio, combined = compute_cloud_shadow_ratio(
        array,
        cloud_threshold=cloud_threshold,
        shadow_threshold=shadow_threshold,
    )
    veg_idx = compute_ndvi_or_green_index(array)
    metrics = {
        "cloud_ratio": round(c_ratio, 4),
        "shadow_ratio": round(s_ratio, 4),
        "contaminated_ratio": round(combined, 4),
        "veg_index": round(veg_idx, 4),
    }

    if combined > max_ratio:
        if c_ratio > s_ratio:
            return False, metrics, f"Cloud contamination ({round(c_ratio * 100, 1)}% > {round(max_ratio * 100)}%)"
        return False, metrics, f"Heavy shadow occlusion ({round(s_ratio * 100, 1)}% > {round(max_ratio * 100)}%)"

    return True, metrics, None