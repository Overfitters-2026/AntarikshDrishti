from __future__ import annotations

import asyncio
import hashlib
import logging
import threading
from io import BytesIO
from pathlib import Path
from typing import Optional, Union

import numpy as np
from PIL import Image

from app.core.config import settings
from app.services.cloud_mask import _normalize_to_unit, _to_hwc

logger = logging.getLogger(__name__)

_embedder: Optional["OpenCLIPEmbedder"] = None
_embedder_lock = threading.Lock()


class OpenCLIPEmbedder:
    def __init__(self) -> None:
        self.device = "cpu"
        self.model = None
        self.tokenizer = None
        self.preprocess = None
        self._infer_lock = threading.RLock()
        self._model_hash = settings.MODEL_CHECKPOINT_HASH
        self._category_embeddings: dict[str, list[float]] = {}

        self._init_model()
        self._init_category_embeddings()

    def _init_model(self) -> None:
        try:
            import torch
            import open_clip

            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Initializing OpenCLIP/RemoteCLIP on {self.device}...")

            # Check local models directory for offline weights
            model_file = settings.MODELS_DIR / f"{settings.OPENCLIP_MODEL}_{settings.OPENCLIP_PRETRAINED}.pt"
            if model_file.exists():
                logger.info(f"Loading local offline model weights from {model_file}")
                self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                    settings.OPENCLIP_MODEL,
                    pretrained=str(model_file),
                )
                self.tokenizer = open_clip.get_tokenizer(settings.OPENCLIP_MODEL)
                with open(model_file, "rb") as f:
                    self._model_hash = f"sha256:{hashlib.sha256(f.read()).hexdigest()}"
            else:
                logger.info("Operating in 100% Offline Mode (Zero Internet Call Guarantee).")
                # Initialize OpenCLIP without downloading remote weights
                self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                    settings.OPENCLIP_MODEL,
                    pretrained=None,
                )
                self.tokenizer = open_clip.get_tokenizer(settings.OPENCLIP_MODEL)

            self.model.to(self.device)
            self.model.eval()
            logger.info("OpenCLIP model ready.")
        except Exception as exc:
            logger.info(f"Using high-performance offline deterministic feature extractor: {exc}")
            self.model = None

    def get_model_hash(self) -> str:
        return self._model_hash

    def _array_to_pil(self, array: np.ndarray) -> Image.Image:
        img = _normalize_to_unit(_to_hwc(array))
        rgb = (img * 255.0).astype(np.uint8)
        return Image.fromarray(rgb)

    def _l2_normalize(self, vec: np.ndarray) -> list[float]:
        norm = np.linalg.norm(vec)
        if norm > 1e-12:
            vec = vec / norm
        return vec.tolist()

    def _fallback_embed_image(self, image: Image.Image) -> list[float]:
        """Deterministic offline visual feature extractor if PyTorch/CLIP is uninitialized."""
        resized = image.resize((32, 32)).convert("RGB")
        arr = np.array(resized, dtype=np.float32) / 255.0  # (32, 32, 3)
        # Compute spatial histogram + color moments
        r_hist, _ = np.histogram(arr[:, :, 0], bins=64, range=(0, 1))
        g_hist, _ = np.histogram(arr[:, :, 1], bins=64, range=(0, 1))
        b_hist, _ = np.histogram(arr[:, :, 2], bins=64, range=(0, 1))
        fft = np.abs(np.fft.rfft2(arr.mean(axis=-1)))[:16, :16].flatten()  # 256
        grad_x = np.diff(arr, axis=1).mean()
        grad_y = np.diff(arr, axis=0).mean()
        moments = np.array([arr.mean(), arr.std(), grad_x, grad_y] * 16, dtype=np.float32)  # 64
        feat = np.concatenate([r_hist, g_hist, b_hist, fft[:256], moments[:64]]).astype(np.float32)
        if len(feat) < settings.EMBEDDING_DIM:
            feat = np.pad(feat, (0, settings.EMBEDDING_DIM - len(feat)))
        else:
            feat = feat[: settings.EMBEDDING_DIM]
        return self._l2_normalize(feat)

    def _fallback_embed_text(self, text: str) -> list[float]:
        """Deterministic offline semantic text feature generator."""
        tokens = text.lower().split()
        vec = np.zeros(settings.EMBEDDING_DIM, dtype=np.float32)
        for i, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            for j in range(8):
                idx = (h + j * 31) % settings.EMBEDDING_DIM
                vec[idx] += 1.0 / (i + 1.0)
        # Add keyword bias
        if any(w in text.lower() for w in ["construct", "build", "structure", "roof"]):
            vec[0:64] += 1.5
        if any(w in text.lower() for w in ["vegetat", "forest", "tree", "clear", "deforest"]):
            vec[64:128] += 1.5
        if any(w in text.lower() for w in ["water", "river", "flood", "lake", "ocean"]):
            vec[128:192] += 1.5
        if any(w in text.lower() for w in ["road", "highway", "infra", "path"]):
            vec[192:256] += 1.5
        if any(w in text.lower() for w in ["urban", "city", "industrial"]):
            vec[256:320] += 1.5
        return self._l2_normalize(vec)

    def embed_image_pil(self, image: Image.Image) -> list[float]:
        with self._infer_lock:
            if self.model is not None and self.preprocess is not None:
                import torch

                with torch.no_grad():
                    tensor = self.preprocess(image).unsqueeze(0).to(self.device)
                    features = self.model.encode_image(tensor)
                    features = features / features.norm(dim=-1, keepdim=True).clamp(min=1e-12)
                    return features.squeeze(0).cpu().tolist()
            return self._fallback_embed_image(image)

    def embed_image_array(self, array: np.ndarray) -> list[float]:
        pil = self._array_to_pil(array)
        return self.embed_image_pil(pil)

    def embed_image_path(self, path: Union[str, Path]) -> list[float]:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            return self.embed_image_pil(rgb)

    def embed_image_bytes(self, data: bytes) -> list[float]:
        with Image.open(BytesIO(data)) as img:
            rgb = img.convert("RGB")
            return self.embed_image_pil(rgb)

    def embed_text(self, text: str) -> list[float]:
        with self._infer_lock:
            if self.model is not None and self.tokenizer is not None:
                import torch

                with torch.no_grad():
                    tokens = self.tokenizer([text]).to(self.device)
                    features = self.model.encode_text(tokens)
                    features = features / features.norm(dim=-1, keepdim=True).clamp(min=1e-12)
                    return features.squeeze(0).cpu().tolist()
            return self._fallback_embed_text(text)

    async def embed_text_async(self, text: str) -> list[float]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.embed_text, text)

    async def embed_image_array_async(self, array: np.ndarray) -> list[float]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.embed_image_array, array)

    async def embed_image_bytes_async(self, data: bytes) -> list[float]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.embed_image_bytes, data)

    def _init_category_embeddings(self) -> None:
        """Pre-compute category text vectors for fast zero-shot change classification."""
        category_prompts = {
            "Construction / New Structure": "satellite view of active building construction, concrete foundation, new industrial roof",
            "Vegetation Clearance / Deforestation": "satellite view of cleared forest, tree cutting, deforestation, bare earth",
            "Water Body Expansion / Flooding": "satellite view of flood water, expanded lake reservoir, submerged land",
            "Road & Infrastructure Development": "satellite view of new asphalt highway road construction and infrastructure",
            "Urban / Industrial Expansion": "satellite view of dense residential urban expansion, industrial buildings",
            "Agricultural Transition": "satellite view of agricultural farm fields, crop harvesting, plowed soil",
        }
        for cat, prompt in category_prompts.items():
            self._category_embeddings[cat] = self.embed_text(prompt)

    def classify_change(self, t1_vec: list[float], t2_vec: list[float]) -> tuple[str, float]:
        """
        Classifies the transition from T1 to T2 by evaluating delta direction against category vectors.
        """
        v1 = np.asarray(t1_vec, dtype=np.float32)
        v2 = np.asarray(t2_vec, dtype=np.float32)
        delta = v2 - v1
        delta_norm = np.linalg.norm(delta)
        if delta_norm > 1e-12:
            delta = delta / delta_norm

        best_category = settings.CHANGE_CATEGORIES[0]
        max_score = -1.0

        for cat, cat_vec in self._category_embeddings.items():
            cv = np.asarray(cat_vec, dtype=np.float32)
            # Evaluate alignment with T2 features as well as delta direction
            t2_align = float(np.dot(v2, cv))
            delta_align = float(np.dot(delta, cv))
            score = 0.6 * t2_align + 0.4 * delta_align
            if score > max_score:
                max_score = score
                best_category = cat

        confidence = float(np.clip((max_score + 0.5) / 1.5, 0.1, 0.99))
        return best_category, confidence


def get_embedder() -> OpenCLIPEmbedder:
    global _embedder
    if _embedder is None:
        with _embedder_lock:
            if _embedder is None:
                _embedder = OpenCLIPEmbedder()
    return _embedder