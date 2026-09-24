# ==============================================================================
# Multi-Stage Production Dockerfile for AntarikshDrishti Platform
# ==============================================================================

# Stage 1: Build Frontend (Vite React UI)
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY geo_search-ui/package*.json ./
RUN npm ci
COPY geo_search-ui/ ./
RUN npm run build

# Stage 2: Python Backend with GDAL & PyTorch
FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies: GDAL, libgl (for OpenCV/PIL), curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gdal-bin \
    libgdal-dev \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY Geo_Search/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy Backend Code and storage
COPY Geo_Search/ /app/Geo_Search/
COPY storage/ /app/storage/

# Copy compiled frontend from Stage 1 into the location expected by FastAPI
COPY --from=frontend-builder /build/dist /app/geo_search-ui/dist

# Expose unified port
EXPOSE 8000

WORKDIR /app/Geo_Search

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start production ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
