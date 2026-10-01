import axios from 'axios';
import { API_BASE_URL } from './config.js';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

/**
 * Health check to verify backend liveness
 */
export async function checkBackendHealth() {
  try {
    const { data } = await client.get('/health', { timeout: 3000 });
    return data;
  } catch (err) {
    try {
      const fallback = await client.get('/api/health', { timeout: 3000 });
      return fallback.data;
    } catch {
      throw err;
    }
  }
}

/**
 * Fetch live hotspots from /api/hotspots
 */
export async function getHotspots() {
  const { data } = await client.get('/api/hotspots');
  if (!Array.isArray(data)) throw new Error('Invalid hotspots response');
  return data;
}

/**
 * Update hotspot status (Accept/Reject/Flag)
 */
export async function updateStatus(id, status) {
  const { data } = await client.post(`/api/hotspots/${id}/status`, { status });
  return data;
}

/**
 * Fetch Ingestion & Reproducibility metrics
 */
export async function getIngestStatus() {
  const { data } = await client.get('/api/v1/ingest/status');
  return data;
}

/**
 * Text semantic search
 */
export async function searchTiles(queryOrParams, top_k = 10) {
  let payload;
  if (typeof queryOrParams === 'object' && queryOrParams !== null) {
    payload = {
      query: queryOrParams.query,
      top_k: Number(queryOrParams.top_k || top_k || 10),
    };
    if (queryOrParams.date) payload.date = queryOrParams.date;
    if (queryOrParams.sensor) payload.sensor = queryOrParams.sensor;
  } else {
    payload = {
      query: String(queryOrParams),
      top_k: Number(top_k),
    };
  }

  const { data } = await client.post('/api/v1/search/text', payload);
  return data;
}

/**
 * Image-to-image visual similarity search
 */
export async function searchByImage(fileOrPayload, top_k = 10) {
  if (fileOrPayload instanceof File || fileOrPayload instanceof Blob) {
    const formData = new FormData();
    formData.append('file', fileOrPayload);
    formData.append('top_k', top_k.toString());
    const { data } = await client.post('/api/v1/search/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } else {
    const { data } = await client.post('/api/v1/search/image', {
      ...fileOrPayload,
      top_k,
    });
    return data;
  }
}

/**
 * Change detection
 */
export async function detectChange(tileId) {
  const { data } = await client.post('/api/v1/change/detect', { tile_id: tileId });
  return data;
}

/**
 * Visual clustering / similarity search for a specific hotspot/tile
 */
export async function findSimilarHotspots(tileId, top_k = 6) {
  const { data } = await client.post('/api/v1/search/similar-tile', {
    tile_id: tileId,
    top_k,
    exclude_self: true,
  });
  return data;
}

/**
 * Unsupervised discovery & clustering
 */
export async function getDiscoveryClusters(num_clusters = 5, method = 'kmeans') {
  const { data } = await client.get('/api/v1/discovery/cluster', {
    params: { num_clusters, method },
  });
  return data;
}

/**
 * Multi-spectral change analysis (True Color, False Color IR, NDVI, NDBI, NDWI, Atmosphere)
 */
export async function getSpectralAnalysis(tileId) {
  const { data } = await client.get(`/api/v1/change/spectral/${encodeURIComponent(tileId)}`, {
    timeout: 30000,
  });
  return data;
}




/**
 * Export full provenance document for a reviewed hotspot (downloadable JSON)
 */
export async function exportProvenance(itemId) {
  const url = `/api/v1/analyst/export/${encodeURIComponent(itemId)}`;
  const response = await client.get(url, {
    responseType: 'blob',
    timeout: 30000,
  });

  // Extract filename from Content-Disposition header if available
  let filename = `provenance_hotspot_${itemId}.json`;
  const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
  if (disposition) {
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  // Trigger browser download
  const blob = new Blob([response.data], { type: 'application/json' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  }, 200);

  return { success: true, filename };
}
