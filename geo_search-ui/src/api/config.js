/**
 * GeoSentry-AI API Configuration
 * 
 * Host and port configuration for FastAPI backend.
 * Default Uvicorn ASGI port confirmed from main.py & README is 127.0.0.1:8000.
 * Allows runtime local override via window.__GEOSENTRY_API_URL__ or localStorage.
 */
function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('geosentry_api_url');
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/+$/, '');
    }
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
}

export const API_BASE_URL = getApiBaseUrl();

export function setApiBaseUrl(newUrl) {
  if (typeof window !== 'undefined') {
    if (newUrl) {
      localStorage.setItem('geosentry_api_url', newUrl.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('geosentry_api_url');
    }
    window.location.reload();
  }
}
