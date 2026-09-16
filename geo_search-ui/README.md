# GeoSentry-AI

Dark-themed React dashboard for reviewing geospatial hotspot detections across India.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Setup and run

```powershell
npm install
npm run dev
```

Open `http://localhost:5174`.

The development server is configured for port 5174. The UI works immediately with included mock hotspots, pipeline data, and data-browser metrics.

## Optional backend

When available, the UI requests `/api/hotspots` on startup and uses the returned hotspot array. Accept and Reject actions are sent to `POST /api/hotspots/{id}/status`.

In local development, Vite proxies `/api` to `http://localhost:8002`, so the frontend can talk to the backend without a hardcoded host. If you need to point at a different backend, set `VITE_API_BASE_URL` before running `npm run dev`.

If the backend is unavailable, the app remains usable with mock hotspots and records a warning in the System Log.

## Available commands

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```
