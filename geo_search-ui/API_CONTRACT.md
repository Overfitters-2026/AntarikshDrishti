# GeoSentry AI — API Contract Verification & Status Audit

**Audit Date**: 2026-09-22  
**Platform**: GeoSentry AI Frontend / FastAPI Backend Interface  
**Reference Specification**: SIH Problem Statement 26227 / Geospatial Intelligence Backend  

---

## 1. Environment & Backend Source Audit

A full inspection across the container environment verified:
- **Python Backend Directory (`app/api/*.py`, `app/core/database.py`, `app/ml/`)**: Not present in the frontend container filesystem.
- **Service Port Status**: Port `8000` is currently bound to the container runtime supervisor daemon (`/app/control-plane-api/control-plane-api`), while the React+Vite frontend runs on Port `3000`.
- **Target Backend Base URL**: `http://127.0.0.1:8000` (configurable via `VITE_API_BASE_URL`).

---

## 2. Endpoint Contract Verification & Alignment Table

| Frontend Caller | Intended Module | HTTP Method & Route | Request Shape | Expected Response Fields | Status / Alignment Check |
|---|---|---|---|---|---|
| `searchTiles(query, top_k)` | `app/api/search.py` | `POST /api/v1/search/text` | `{"query": string, "top_k": number}` | Array of tiles or `{"results": [...]}` with `tile_id`/`id`, `lat`/`latitude`, `lng`/`longitude`, `score`, `label`, `sensor`, `date` | **Aligned**: Normalized in `MapPanel.jsx` and `DetailPanel.jsx` to consume both snake_case and standard geodetic coordinates. Wrapped in offline handling. |
| `detectChange(tileId)` | `app/api/change.py` | `POST /api/v1/change/detect` | `{"tile_id": string}` | `{"change_type": string, "confidence": float, "before_image": string, "after_image": string, "diff_image": string, "before_date": string, "after_date": string, "sensor": string, "changed_area_sqm": float}` | **Aligned**: Consumes exact `tile_id` payload. `DetailPanel.jsx` handles base64 data URIs and asset URLs without placeholders. |
| `submitAnalystDecision(tileId, decision, notes)` | `app/api/analyst.py` | `PATCH /api/v1/review/queue/{tile_id}` *(with fallback to `POST /api/v1/analyst/decision`)* | `{"decision": "accept" \| "reject" \| "flag", "status": "accept" \| "reject" \| "flag", "notes": string, "reviewed_at": ISO8601}` | `{"status": "success", "event_id": string, "decision": string}` | **Aligned**: Dual-routed to match REST queue patch or decision endpoint. Logs confirmed response into `SystemLog.jsx`. |
| `getIngestStatus()` | `app/api/ingest.py` | `GET /api/v1/ingest/status` | None | `{"tile_count": number, "sensors": list, "date_range": string, "storage": string}` | **Marked NOT YET IMPLEMENTED / OFFLINE**: No fabricated data is shown in `PipelinePanel.jsx`. |
| `checkBackendHealth()` | `main.py` | `GET /health` or `GET /api/health` | None | `{"status": "healthy" \| "ok"}` | **Aligned**: Heartbeat probe every 15s to switch between online telemetry and honest offline state. |

---

## 3. Discrepancies & Fixes Applied

1. **Strict Offline Transparency**:
   - Replaced all fallback assumptions with `BackendOfflineError`.
   - Prevented any mock tile generation or fake confidence scores.
   - Panels now display `"No data — backend offline"` when the backend is unreachable.

2. **Field Name Normalization**:
   - **Coordinates**: Safely accommodates both `{lat, lng}` and `{latitude, longitude}`.
   - **Imagery**: Detects both base64 payload strings and relative/absolute image paths.
   - **Identifiers**: Consistently prioritizes `tile_id` over `id`.
