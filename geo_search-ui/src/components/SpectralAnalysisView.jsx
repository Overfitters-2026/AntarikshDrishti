import React, { useState, useEffect } from 'react';
import { getSpectralAnalysis } from '../api/backend.js';
import { API_BASE_URL } from '../api/config.js';

const TAB_DEFS = [
  { key: 'true_color', label: 'True Color', subtitle: 'B04 · B03 · B02 (Natural RGB)' },
  { key: 'false_color_ir', label: 'False Color IR', subtitle: 'B08 · B04 · B03 (NIR/CIR - Vegetation)' },
  { key: 'ndvi', label: 'NDVI', subtitle: 'Vegetation Index (RdYlGn Colormap)' },
  { key: 'ndbi', label: 'NDBI', subtitle: 'Built-Up Index (Viridis Colormap)' },
  { key: 'ndwi', label: 'NDWI', subtitle: 'Water Index (YlGnBu Colormap)' },
  { key: 'pixel_difference_heatmap', label: 'Difference Heatmap', subtitle: '|T2 - T1| Radiometric Delta (Magma)' },
];

function formatImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
}

export default function SpectralAnalysisView({ isOpen, tileId, hotspot, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('true_color');

  useEffect(() => {
    if (!isOpen || !tileId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getSpectralAnalysis(tileId)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);

        // Determine initial active tab based on what backend returned
        const layers = res.spectral_layers || {};
        const availableTabs = TAB_DEFS.filter((t) => layers[t.key]);
        if (availableTabs.length > 0) {
          setActiveTab(availableTabs[0].key);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Spectral analysis error:', err);
        setError('Spectral analysis not available for this tile');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tileId]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Metadata items
  const displayId = data?.tile_id || tileId || hotspot?.id || 'Unknown Tile';
  const coordsStr = hotspot?.lat && hotspot?.lng
    ? `${Number(hotspot.lat).toFixed(4)}° N, ${Number(hotspot.lng).toFixed(4)}° E`
    : '19.0877° N, 72.8896° E';
  const datePairStr = '2023-12-08 (T1) → 2024-12-17 (T2)';
  const sensorStr = hotspot?.sensor || 'Sentinel-2 L2A (10m Multi-Spectral)';
  const isMultispectral = data?.mode === 'multispectral';

  // Available tabs returned by backend
  const layers = data?.spectral_layers || {};
  const availableTabs = TAB_DEFS.filter((t) => layers[t.key]);
  const activeLayer = layers[activeTab];

  return (
    <div className="spectral-modal-backdrop" onClick={onClose}>
      <div
        className="spectral-modal-window"
        role="dialog"
        aria-modal="true"
        aria-label="Spectral Analysis View"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. TOP HEADER & METADATA BAR */}
        <header className="spectral-header">
          <div className="spectral-header-left">
            <div className="spectral-badge-row">
              <span className="spectral-chip primary">🛰️ MULTI-SPECTRAL CHANGE DECOMPOSITION</span>
              <span className={`spectral-chip ${isMultispectral ? 'success' : 'warning'}`}>
                {isMultispectral ? '6-BAND SENTINEL-2 (REAL B02-B11)' : 'RGB VISUAL DELTA (STEP 2B)'}
              </span>
            </div>
            <h1 className="spectral-title">{displayId}</h1>
            <div className="spectral-meta-bar">
              <span className="meta-item">
                <span className="meta-label">COORDINATES:</span>
                <span className="meta-val data">{coordsStr}</span>
              </span>
              <span className="meta-divider">|</span>
              <span className="meta-item">
                <span className="meta-label">OBSERVATION DATES:</span>
                <span className="meta-val data">{datePairStr}</span>
              </span>
              <span className="meta-divider">|</span>
              <span className="meta-item">
                <span className="meta-label">SENSOR PLATFORM:</span>
                <span className="meta-val data">{sensorStr}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            className="spectral-close-btn"
            onClick={onClose}
            aria-label="Close Spectral Analysis"
            title="Return to Detail Panel (Esc)"
          >
            ✕ CLOSE
          </button>
        </header>

        {/* PROMINENT AMBER LIMITED MODE BANNER (STEP 2B) */}
        {!loading && !error && data && data.mode === 'rgb_visual_only' && (
          <div className="spectral-limited-banner" role="alert">
            <div className="banner-left">
              <span className="banner-icon">⚠️</span>
              <div className="banner-text-block">
                <strong className="banner-title">Limited Mode:</strong>
                <span className="banner-desc">
                  This tile pair has only 3-band RGB imagery. Vegetation/infrastructure/water indices require multi-band data and are not shown.
                </span>
              </div>
            </div>
            <span className="banner-tag">STEP 2B VISUAL ONLY</span>
          </div>
        )}

        {/* 2. LOADING STATE */}
        {loading && (
          <div className="spectral-loading-state">
            <div className="spectral-spinner" />
            <p className="spectral-loading-text">
              Reading multi-band raster windows and computing spectral indices (NDVI, NDBI, NDWI)...
            </p>
            <span className="spectral-loading-subtext">
              Rasterio extracting B02, B03, B04, B08, B11 & SCL from local GeoTIFF archives.
            </span>
          </div>
        )}

        {/* 3. ERROR / FALLBACK STATE */}
        {!loading && error && (
          <div className="spectral-error-state">
            <div className="spectral-error-icon">⚠️</div>
            <h2 className="spectral-error-heading">Spectral analysis not available for this tile</h2>
            <p className="spectral-error-sub">
              The requested tile window ({displayId}) could not be resolved from the multi-spectral Sentinel-2 archive.
            </p>
            <div className="spectral-error-hint">
              <strong>Tip:</strong> Select one of the verified Mumbai candidate hotspots (e.g. airport runway, coastal reclamation, or urban development) to inspect full 6-band multi-spectral decompositions.
            </div>
            <button type="button" className="btn-return" onClick={onClose}>
              Return to Detail Panel
            </button>
          </div>
        )}

        {/* 4. SUCCESS CONTENT */}
        {!loading && !error && data && (
          <div className="spectral-content-body">
            {/* TAB STRIP: Only show tabs for layers returned by backend */}
            <nav className="spectral-tab-strip" aria-label="Spectral layers">
              {availableTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const layer = layers[tab.key];
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`spectral-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <span className="tab-label-main">{tab.label}</span>
                    {layer?.change !== undefined && (
                      <span className={`tab-change-pill ${layer.change >= 0 ? 'pos' : 'neg'}`}>
                        {layer.change >= 0 ? `+${layer.change.toFixed(4)}` : layer.change.toFixed(4)}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* MAIN AREA: SIDE-BY-SIDE BEFORE / AFTER OR HEATMAP */}
            <section className="spectral-main-view" aria-label="Active spectral layer comparison">
              {activeLayer && activeLayer.t1_url && activeLayer.t2_url ? (
                <div className="spectral-comparison-grid">
                  {/* BEFORE CARD */}
                  <div className="spectral-card before-card">
                    <div className="spectral-card-header">
                      <div className="card-badge before">T1 BEFORE</div>
                      <span className="card-date data">2023-12-08</span>
                      {activeLayer.t1_mean !== undefined && (
                        <span className="card-stat data">
                          Mean: <strong>{Number(activeLayer.t1_mean).toFixed(4)}</strong>
                        </span>
                      )}
                    </div>
                    <div className="spectral-img-wrapper">
                      <img
                        src={formatImageUrl(activeLayer.t1_url)}
                        alt={`T1 Baseline ${activeTab}`}
                        className="spectral-raster-img"
                      />
                    </div>
                    <div className="spectral-card-footer">
                      <span className="footer-spec">Baseline Reference Capture</span>
                    </div>
                  </div>

                  {/* CENTER DELTA INDICATOR */}
                  <div className="spectral-delta-divider">
                    <div className="delta-arrow">➔</div>
                    {activeLayer.change !== undefined && (
                      <div className={`delta-badge ${activeLayer.change >= 0 ? 'pos' : 'neg'}`}>
                        <span className="delta-label">REAL CHANGE</span>
                        <span className="delta-num">
                          {activeLayer.change >= 0 ? `+${activeLayer.change.toFixed(4)}` : activeLayer.change.toFixed(4)}
                        </span>
                        <span className="delta-pct">
                          ({(activeLayer.change * 100).toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AFTER CARD */}
                  <div className="spectral-card after-card">
                    <div className="spectral-card-header">
                      <div className="card-badge after">T2 AFTER</div>
                      <span className="card-date data">2024-12-17</span>
                      {activeLayer.t2_mean !== undefined && (
                        <span className="card-stat data">
                          Mean: <strong>{Number(activeLayer.t2_mean).toFixed(4)}</strong>
                        </span>
                      )}
                    </div>
                    <div className="spectral-img-wrapper">
                      <img
                        src={formatImageUrl(activeLayer.t2_url)}
                        alt={`T2 Observation ${activeTab}`}
                        className="spectral-raster-img"
                      />
                    </div>
                    <div className="spectral-card-footer">
                      <span className="footer-spec">Resampled 10m Ground Resolution</span>
                    </div>
                  </div>
                </div>
              ) : activeLayer && activeLayer.url ? (
                /* DIFFERENCE HEATMAP SINGLE VIEW */
                <div className="spectral-heatmap-container">
                  <div className="spectral-card heatmap-card">
                    <div className="spectral-card-header">
                      <div className="card-badge diff">PIXEL RADIOMETRIC DELTA</div>
                      <span className="card-stat data">
                        Mean: <strong>{activeLayer.mean_diff_intensity}</strong> | Max: <strong>{activeLayer.max_diff_intensity}</strong>
                      </span>
                    </div>
                    <div className="spectral-img-wrapper heatmap-wrapper">
                      <img
                        src={formatImageUrl(activeLayer.url)}
                        alt="Radiometric absolute difference heatmap"
                        className="spectral-raster-img"
                      />
                    </div>
                    <div className="spectral-card-footer">
                      <span className="footer-spec">{activeLayer.description || 'Normalized absolute pixel difference |T2 - T1| with Magma colormap'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="spectral-empty-layer">No imagery available for this spectral layer.</div>
              )}
            </section>

            {/* BOTTOM PANEL: FOUR WRITTEN SUMMARY CATEGORIES */}
            <footer className="spectral-bottom-panel" aria-label="Written change summaries">
              <h2 className="bottom-panel-heading">SPECTRAL CHANGE DECOMPOSITION SUMMARY</h2>
              <div className="summary-categories-grid">
                {/* 1. VEGETATION */}
                <div className="summary-card veg-card">
                  <div className="summary-card-header">
                    <span className="summary-category-icon">🌿</span>
                    <span className="summary-category-name">Vegetation</span>
                    {layers.ndvi?.change !== undefined && (
                      <span className={`summary-delta-chip ${layers.ndvi.change >= 0 ? 'pos' : 'neg'}`}>
                        Δ {layers.ndvi.change >= 0 ? `+${layers.ndvi.change.toFixed(4)}` : layers.ndvi.change.toFixed(4)}
                      </span>
                    )}
                  </div>
                  {layers.ndvi?.t1_mean !== undefined && (
                    <div className="summary-means data">
                      T1: {layers.ndvi.t1_mean.toFixed(4)} → T2: {layers.ndvi.t2_mean.toFixed(4)}
                    </div>
                  )}
                  <p className="summary-sentence">
                    {data.written_summary?.vegetation || data.written_summary?.category || 'No significant vegetation change detected.'}
                  </p>
                </div>

                {/* 2. INFRASTRUCTURE */}
                <div className="summary-card infra-card">
                  <div className="summary-card-header">
                    <span className="summary-category-icon">🏗️</span>
                    <span className="summary-category-name">Infrastructure</span>
                    {layers.ndbi?.change !== undefined && (
                      <span className={`summary-delta-chip ${layers.ndbi.change >= 0 ? 'pos' : 'neg'}`}>
                        Δ {layers.ndbi.change >= 0 ? `+${layers.ndbi.change.toFixed(4)}` : layers.ndbi.change.toFixed(4)}
                      </span>
                    )}
                  </div>
                  {layers.ndbi?.t1_mean !== undefined && (
                    <div className="summary-means data">
                      T1: {layers.ndbi.t1_mean.toFixed(4)} → T2: {layers.ndbi.t2_mean.toFixed(4)}
                    </div>
                  )}
                  <p className="summary-sentence">
                    {data.written_summary?.infrastructure || 'No significant infrastructure change detected.'}
                  </p>
                </div>

                {/* 3. WATER */}
                <div className="summary-card water-card">
                  <div className="summary-card-header">
                    <span className="summary-category-icon">💧</span>
                    <span className="summary-category-name">Water</span>
                    {layers.ndwi?.change !== undefined && (
                      <span className={`summary-delta-chip ${layers.ndwi.change >= 0 ? 'pos' : 'neg'}`}>
                        Δ {layers.ndwi.change >= 0 ? `+${layers.ndwi.change.toFixed(4)}` : layers.ndwi.change.toFixed(4)}
                      </span>
                    )}
                  </div>
                  {layers.ndwi?.t1_mean !== undefined && (
                    <div className="summary-means data">
                      T1: {layers.ndwi.t1_mean.toFixed(4)} → T2: {layers.ndwi.t2_mean.toFixed(4)}
                    </div>
                  )}
                  <p className="summary-sentence">
                    {data.written_summary?.water || 'No significant water-extent change detected.'}
                  </p>
                </div>

                {/* 4. ATMOSPHERE */}
                <div className="summary-card atmo-card">
                  <div className="summary-card-header">
                    <span className="summary-category-icon">☁️</span>
                    <span className="summary-category-name">Atmosphere</span>
                    <span className="summary-delta-chip neutral">
                      SCL QA Band
                    </span>
                  </div>
                  <div className="summary-means data">
                    Cloud & Shadow Screening
                  </div>
                  <p className="summary-sentence">
                    {data.written_summary?.atmosphere || 'Atmospheric clarity within acceptable limits.'}
                  </p>
                </div>
              </div>

              {/* Scientific integrity note if present */}
              {data.written_summary?.scientific_integrity_note && (
                <div className="scientific-note">
                  ℹ️ <strong>Scientific Integrity:</strong> {data.written_summary.scientific_integrity_note}
                </div>
              )}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
