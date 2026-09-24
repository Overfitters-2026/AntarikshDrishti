---
title: AntarikshDrishti - Satellite Intelligence Platform
emoji: 🛰️
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: mit
short_description: Multi-Spectral Satellite Semantic Search & Change Intelligence
---

# AntarikshDrishti

Offline-first AI platform for semantic satellite image search, unsupervised discovery, multi-temporal change detection, and analyst review for **Smart India Hackathon Problem Statement 26227**.

---

## 🚀 Quick Start Demo (100% Offline)

### 1. Activate Environment & Dependencies

```powershell
# Windows PowerShell
.\venv\Scripts\Activate.ps1
```

### 2. Seed Multi-Temporal Scenario Dataset

Generates synthetic baseline ($T_1$) and multi-temporal observation ($T_2$) GeoTIFFs (with **Construction**, **Deforestation/Clearance**, and **Water Body Expansion** changes), ingests tiles into local Qdrant, and runs change classification:

```powershell
.\venv\Scripts\python.exe demo_seed.py
```

### 3. Launch the Platform Server & UI

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000/** in your browser to access the complete interactive GIS dashboard.

---

## 🛰️ Core Deliverables & Architecture

```
PS---SIH26227/
├── app/
│   ├── api/
│   │   ├── change.py        # Multi-temporal change pipeline with geo-intersection
│   │   ├── review.py        # Analyst review queue & tamper-evident provenance
│   │   ├── search.py        # Vector similarity semantic text & visual search
│   │   ├── discovery.py     # Unsupervised clustering & 2D manifold projection
│   │   ├── tiles.py         # Dynamic tile chip preview PNG serving
│   │   └── ingest.py        # GeoTIFF spatial ingestion & tiling
│   ├── core/
│   │   ├── config.py        # App settings & model checkpoint hashes
│   │   └── database.py      # Async SQLAlchemy ORM for review queue & provenance
│   ├── ml/
│   │   ├── change_detector.py # Radiometric matching, spectral analysis & classification
│   │   └── embedder.py      # Offline VLM/RemoteCLIP feature extractor & zero-shot classifier
│   └── services/
│       ├── cloud_mask.py    # Multi-band QA/cloud/shadow & NDVI filtering
│       ├── discovery.py     # Pure NumPy PCA & K-Means embedding clustering
│       ├── normalizer.py    # Per-band histogram matching
│       ├── qdrant_store.py  # Local embedded vector database wrapper
│       └── tiler.py         # Windowed tiling, IoU bounding box & contrast stretching
├── frontend/
│   ├── index.html           # Dark-mode GIS dashboard layout
│   ├── style.css            # Glassmorphism theme, split viewer & confidence meters
│   ├── app.js               # Client-side map engine, swipe viewer & API integration
│   ├── leaflet.css          # Offline Leaflet styling
│   └── leaflet.js           # Offline map support
├── storage/
│   ├── raw_geotiff/         # Multi-temporal GeoTIFF scenes
│   ├── tiles/               # Cached RGB PNG preview chips
│   ├── models/              # Local offline model weights
│   └── qdrant_db/           # Local vector indices
├── demo_seed.py             # Deterministic scenario generator & pipeline seeder
├── test_pipeline.py         # Automated end-to-end integration test suite
└── main.py                  # FastAPI entry point mounting static UI at /
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the full interactive Web Dashboard |
| `POST` | `/api/v1/search/text` | Natural language semantic tile search |
| `POST` | `/api/v1/change/detect` | Multi-temporal change detection & classification |
| `GET` | `/api/v1/review/queue` | Analyst review queue with tamper-evident provenance |
| `PATCH` | `/api/v1/review/queue/{event_id}` | Confirm, reject, or annotate review items |
| `GET` | `/api/v1/discovery/cluster` | Unsupervised tile clustering & 2D PCA projection |
| `GET` | `/api/v1/tiles/{tile_id}/preview.png` | Streams contrast-stretched RGB tile chip |
| `GET` | `/health` | Health check & offline engine status |
