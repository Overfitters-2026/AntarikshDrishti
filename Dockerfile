# ============================================================
# Stage 1: Build Frontend (Vite + React)
# ============================================================
FROM node:20-slim AS frontend-builder
WORKDIR /app/geo_search-ui

COPY geo_search-ui/package*.json ./
RUN npm ci

COPY geo_search-ui/ ./
RUN npm run build

# ============================================================
# Stage 2: Python Backend + Inference Engine
# ============================================================
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000

# Install essential native libraries for rasterio and pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (CPU-optimized PyTorch & OpenCLIP)
COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code & pre-computed databases/storage
COPY Geo_Search/ ./Geo_Search/
COPY app/ ./app/
COPY main.py .
COPY storage/ ./storage/
COPY data/ ./data/

# Copy built frontend assets from Stage 1 into geo_search-ui/dist
COPY --from=frontend-builder /app/geo_search-ui/dist ./geo_search-ui/dist

# Expose port (default 8000, compatible with PORT env var)
EXPOSE 8000

# Launch unified server serving both API and Frontend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
