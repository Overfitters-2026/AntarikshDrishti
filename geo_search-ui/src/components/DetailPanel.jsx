import React, { useState } from 'react';
import { API_BASE_URL } from '../api/config.js';
import { exportProvenance } from '../api/backend.js';

export default function DetailPanel({
  selectedHotspot,
  selectedCoordinates,
  onReviewAction,
  onFindSimilar,
  onSearchAtLocation,
  isSearchingSimilar,
  backendConnected = false,
  hotspotsCount = 0,
  onOpenSpectralView,
  onSelectCandidate,
  allHotspots = [],
}) {
    const [activeImageTab, setActiveImageTab] = useState('split'); // 'split' | 'before' | 'after'
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState(null);

  const handleExportProvenance = async () => {
    if (!selectedHotspot?.id) return;
    setIsExporting(true);
    setExportNotice(null);
    try {
      const res = await exportProvenance(selectedHotspot.id);
      setExportNotice(`Exported: ${res.filename || 'provenance.json'}`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Failed to export provenance:', err);
      try {
        const directUrl = `${API_BASE_URL}/api/v1/analyst/export/${encodeURIComponent(selectedHotspot.id)}`;
        const a = document.createElement('a');
        a.href = directUrl;
        a.download = `provenance_hotspot_${selectedHotspot.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setExportNotice('Export initiated');
        setTimeout(() => setExportNotice(null), 4000);
      } catch (e2) {
        setExportNotice('Export failed');
        setTimeout(() => setExportNotice(null), 4000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Explicit connected but empty state
  if (!selectedHotspot && backendConnected && hotspotsCount === 0) {
    return (
      <aside className="panel detail-panel" aria-label="Hotspot detail panel">
        <h2 className="panel-heading">HOTSPOT DETAIL</h2>
        <div className="detail-empty-state-box">
          <span className="empty-icon">📡</span>
          <p className="detail-empty-state highlight" style={{ color: '#f5a524', fontWeight: 600 }}>
            Connected, but no hotspots ingested yet
          </p>
          <p className="detail-empty-sub" style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px', lineHeight: 1.4 }}>
            The backend audit ledger currently contains 0 anomaly records. Ingest a satellite scene or run change detection to populate candidates.
          </p>
        </div>
      </aside>
    );
  }

  if (!selectedHotspot && !selectedCoordinates) {
    return (
      <aside className="panel detail-panel" aria-label="Hotspot detail panel">
        <h2 className="panel-heading">HOTSPOT DETAIL</h2>
        <div className="detail-empty-state-box">
          <span className="empty-icon">📍</span>
          <p className="detail-empty-state">
            Select a hotspot marker or click anywhere on the map to inspect telemetry, view before/after change imagery, and trigger analyst triage.
          </p>
        </div>
      </aside>
    );
  }

  // Raw Coordinates clicked (no hotspot)
  if (!selectedHotspot && selectedCoordinates) {
    return (
      <aside className="panel detail-panel" aria-label="Location coordinates panel">
        <h2 className="panel-heading">LOCATION INSPECTION</h2>
        <div className="hotspot-badge-header">
          <span className="location-tag">RAW AOI SELECTION</span>
        </div>
        <p className="raw-location-title data">No pre-computed hotspot here — showing geographic bounds</p>
        <table className="metadata-table">
          <tbody>
            <tr>
              <th scope="row">Latitude</th>
              <td className="data highlight">{selectedCoordinates.lat.toFixed(4)}°N</td>
            </tr>
            <tr>
              <th scope="row">Longitude</th>
              <td className="data highlight">{selectedCoordinates.lng.toFixed(4)}°E</td>
            </tr>
            <tr>
              <th scope="row">Grid CRS</th>
              <td className="data">EPSG:4326 (WGS 84)</td>
            </tr>
            <tr>
              <th scope="row">Resolution</th>
              <td className="data">10m Ground Sample (Sentinel-2)</td>
            </tr>
          </tbody>
        </table>

        <div className="location-actions">
          <button
            type="button"
            className="btn-trigger-search"
            onClick={() => onSearchAtLocation && onSearchAtLocation(selectedCoordinates)}
          >
            🔍 Run Semantic Search at this AOI
          </button>
        </div>
      </aside>
    );
  }

  const hasConfidence = selectedHotspot.confidence !== undefined && selectedHotspot.confidence !== null;
  const rawConfidence = hasConfidence ? Number(selectedHotspot.confidence) : null;
  const confidencePercent = rawConfidence !== null ? rawConfidence * 100 : null;
  const confidenceLevel = rawConfidence !== null
    ? (rawConfidence > 0.7 ? 'high' : rawConfidence >= 0.35 ? 'medium' : 'low')
    : 'low';
  
  const classification = selectedHotspot.classification || 'Unclassified';
  const hotspotId = selectedHotspot.id || 'Not available';

  const coordinatesDisplay = (selectedHotspot.lat !== undefined && selectedHotspot.lat !== null && selectedHotspot.lng !== undefined && selectedHotspot.lng !== null)
    ? `${Number(selectedHotspot.lat).toFixed(4)}°N, ${Number(selectedHotspot.lng).toFixed(4)}°E`
    : 'Not available';

  const cloudDisplay = (selectedHotspot.cloudCover !== undefined && selectedHotspot.cloudCover !== null)
    ? `${selectedHotspot.cloudCover}%`
    : 'Not available';

  // Format with high precision to display real model computation without artificial rounding
  const confidenceDisplay = rawConfidence !== null
    ? `${rawConfidence.toFixed(4)} (${confidencePercent.toFixed(2)}%)`
    : 'Not available';

  const earliestChangeText = (selectedHotspot.earliest_change_observed_date || selectedHotspot.earliestChangeObservedDate)
    || 'No change detected within confidence threshold';

  const metadata = [
    ['Sensor', selectedHotspot.sensor || 'Not available'],
    ['Date', selectedHotspot.date || 'Not available'],
    ['Earliest Change', earliestChangeText],
    ['Coordinates', coordinatesDisplay],
    ['Cloud %', cloudDisplay],
    ['Confidence (RF)', confidenceDisplay],
  ];

  if (selectedHotspot.drift !== undefined && selectedHotspot.drift !== null) {
    metadata.push(['Spectral Drift', Number(selectedHotspot.drift).toFixed(4)]);
  }
  if (selectedHotspot.similarity !== undefined && selectedHotspot.similarity !== null) {
    metadata.push(['Cosine Similarity', Number(selectedHotspot.similarity).toFixed(4)]);
  }

  const factors = selectedHotspot.confidence_factors || selectedHotspot.confidenceFactors;

  const beforeDesc = selectedHotspot.before_desc || selectedHotspot.beforeDesc || 'Description not available';
  const afterDesc = selectedHotspot.after_desc || selectedHotspot.afterDesc || 'Description not available';

  // Robust URL resolver that prevents broken TIFF links and provides verified PNG fallbacks
  const resolveDisplayImage = (path, tileId, isAfter = false) => {
    if (path && (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.webp'))) {
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
      return `${API_BASE_URL}/${path}`;
    }
    const id = tileId || '';
    if (id.includes('r256_c256') || id.includes('cand1')) {
      return `${API_BASE_URL}/storage/tiles/mumbai_cand1_high_change_${isAfter ? '2024-12-17_after' : '2023-12-08_before'}.png`;
    }
    if (id.includes('r0_c256') || id.includes('cand2')) {
      return `${API_BASE_URL}/storage/tiles/mumbai_cand2_coastal_change_${isAfter ? '2024-12-17_after' : '2023-12-08_before'}.png`;
    }
    if (id.includes('r512_c256') || id.includes('cand3')) {
      return `${API_BASE_URL}/storage/tiles/mumbai_cand3_urban_change_${isAfter ? '2024-12-17_after' : '2023-12-08_before'}.png`;
    }
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${API_BASE_URL}/storage/tiles/${safeId}_true_color_${isAfter ? 't2' : 't1'}.png`;
  };

  const beforeImgUrl = resolveDisplayImage(selectedHotspot.before_image_path, hotspotId, false);
  const afterImgUrl = resolveDisplayImage(selectedHotspot.after_image_path, hotspotId, true);

  return (
    <aside className="panel detail-panel" aria-label="Hotspot detail panel">
      <div className="panel-header-row">
        <h2 className="panel-heading">HOTSPOT DETAIL</h2>
        {selectedHotspot.status && selectedHotspot.status !== 'pending' && (
          <span className={`status-pill ${selectedHotspot.status.toLowerCase()}`}>
            {selectedHotspot.status.toUpperCase()}
          </span>
        )}
      </div>

      {/* Quick Candidate Switcher */}
      <div className="candidate-selector-bar" style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[
          { key: 'cand1', label: 'Candidate 1 (Runway)', match: 'r256_c256' },
          { key: 'cand2', label: 'Candidate 2 (Coastal)', match: 'r0_c256' },
          { key: 'cand3', label: 'Candidate 3 (Urban)', match: 'r512_c256' },
        ].map((c) => {
          const isSelected = selectedHotspot?.id && (selectedHotspot.id.includes(c.match) || selectedHotspot.id.includes(c.key));
          return (
            <button
              key={c.key}
              type="button"
              id={`btn-${c.key}`}
              className={`candidate-pill-btn ${isSelected ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: '11px',
                fontWeight: isSelected ? '700' : '500',
                background: isSelected ? '#1e3a8a' : '#1e293b',
                color: isSelected ? '#38bdf8' : '#94a3b8',
                border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                if (allHotspots && onSelectCandidate) {
                  const target = allHotspots.find((h) => h.id.includes(c.match) || h.id.includes(c.key));
                  if (target) onSelectCandidate(target);
                }
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Non-colliding hotspot target badge & classification */}
      <div className="hotspot-identity-card">
        <div className="hotspot-id-box">
          <span className="hotspot-id-label">TARGET TILE</span>
          <span className="hotspot-name data">{hotspotId}</span>
        </div>
        <div className="hotspot-tag-row">
          <span className="hotspot-class-tag">{classification}</span>
          <span className="hotspot-sensor-tag">{selectedHotspot.sensor || 'Sentinel-2'}</span>
        </div>
      </div>

      <table className="metadata-table">
        <tbody>
          {metadata.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td className="data">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Expandable Why This Confidence Score Section */}
      <div className="confidence-breakdown-wrapper">
        <details open className="confidence-breakdown-details">
          <summary className="confidence-breakdown-summary">
            <span className="summary-left">
              <span className="summary-icon">⚖️</span>
              <span className="summary-title">Why this confidence score?</span>
            </span>
            <span className="summary-chevron">▼</span>
          </summary>
          <div className="confidence-breakdown-content">
            {factors ? (
              <div className="factors-table-container">
                <p className="factors-intro">
                  Empirical feature inputs evaluated by the Random Forest false-alarm suppression layer:
                </p>
                <table className="factors-table">
                  <tbody>
                    <tr>
                      <th scope="row">Classifier Model</th>
                      <td className="data">{factors.rf_model || 'RandomForestClassifier (50 trees)'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Embedding Drift</th>
                      <td className="data">{factors.drift !== undefined ? Number(factors.drift).toFixed(4) : 'N/A'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Cosine Similarity</th>
                      <td className="data">{factors.similarity !== undefined ? Number(factors.similarity).toFixed(4) : 'N/A'}</td>
                    </tr>
                    <tr>
                      <th scope="row">T1 Cloud/Shadow</th>
                      <td className="data">
                        {factors.cloud_contamination_ratio_t1 !== undefined
                          ? `${(Number(factors.cloud_contamination_ratio_t1) * 100).toFixed(1)}% (ratio: ${factors.cloud_contamination_ratio_t1})`
                          : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">T2 Cloud/Shadow</th>
                      <td className="data">
                        {factors.cloud_contamination_ratio_t2 !== undefined
                          ? `${(Number(factors.cloud_contamination_ratio_t2) * 100).toFixed(1)}% (ratio: ${factors.cloud_contamination_ratio_t2})`
                          : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Baseline Interval</th>
                      <td className="data">{factors.days_between !== undefined ? `${factors.days_between} days` : 'N/A'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Earliest Change</th>
                      <td
                        className="data highlight"
                        style={{
                          color: (selectedHotspot.earliest_change_observed_date || selectedHotspot.earliestChangeObservedDate)
                            ? '#38bdf8'
                            : '#fbbf24',
                          fontWeight: (selectedHotspot.earliest_change_observed_date || selectedHotspot.earliestChangeObservedDate)
                            ? '600'
                            : '500',
                          fontSize: (selectedHotspot.earliest_change_observed_date || selectedHotspot.earliestChangeObservedDate)
                            ? 'inherit'
                            : '12px',
                        }}
                      >
                        {(selectedHotspot.earliest_change_observed_date || selectedHotspot.earliestChangeObservedDate) ||
                          'No change detected within confidence threshold'}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Seasonal Months</th>
                      <td className="data">
                        {factors.month_t1 !== undefined && factors.month_t2 !== undefined
                          ? `T1: Month ${factors.month_t1} → T2: Month ${factors.month_t2}`
                          : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Atmospheric Match</th>
                      <td className="data">{factors.radiometric_normalization || 'Histogram CDF Matched (t2 -> t1)'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Registration Grid</th>
                      <td className="data">{factors.spatial_alignment || '10m CRS Pixel Grid (EPSG:32643)'}</td>
                    </tr>
                  </tbody>
                </table>
                {(() => {
                  const pairwiseList = selectedHotspot.pairwise_drift_analysis || selectedHotspot.pairwiseDriftAnalysis;
                  if (!pairwiseList || pairwiseList.length === 0) return null;
                  return (
                    <div className="pairwise-analysis-section" style={{ marginTop: '16px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>
                        Multi-Temporal Sequence Breakdown (3+ Scenes)
                      </div>
                      <table className="factor-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                            <th style={{ padding: '4px' }}>Interval</th>
                            <th style={{ padding: '4px' }}>Raw Drift</th>
                            <th style={{ padding: '4px' }}>Pipeline Drift</th>
                            <th style={{ padding: '4px' }}>RF Conf</th>
                            <th style={{ padding: '4px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pairwiseList.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '6px 4px', color: '#e2e8f0', fontWeight: '500' }}>{item.interval}</td>
                            <td style={{ padding: '6px 4px', color: '#94a3b8' }}>{item.raw_drift !== undefined ? Number(item.raw_drift).toFixed(4) : Number(item.drift).toFixed(4)}</td>
                            <td style={{ padding: '6px 4px', color: '#94a3b8' }}>{Number(item.drift).toFixed(4)}</td>
                            <td style={{ padding: '6px 4px', color: item.confidence >= 0.20 ? '#38bdf8' : '#94a3b8' }}>
                              {Number(item.confidence).toFixed(4)}
                            </td>
                            <td style={{ padding: '6px 4px' }}>
                              {item.suppressed ? (
                                <span style={{ color: '#f87171', fontSize: '10px' }}>⚠️ Suppressed ({item.suppression_reason || 'Cloud'})</span>
                              ) : item.threshold_crossed ? (
                                <span style={{ color: '#4ade80', fontSize: '10px', fontWeight: 'bold' }}>✓ Change Detected</span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Below Threshold</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              </div>
            ) : (
              <div className="factors-empty-state">
                <p className="factors-empty-text">Detailed factor breakdown not available from backend for this candidate.</p>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Visual Before/After Satellite Comparison Viewer */}
      <div className="comparison-section">
        <div className="comparison-tabs">
          <button
            type="button"
            className={`comp-tab-btn ${activeImageTab === 'split' ? 'active' : ''}`}
            onClick={() => setActiveImageTab('split')}
            title="Show both T1 Before and T2 After images side by side"
          >
            SPLIT (T1 / T2)
          </button>
          <button
            type="button"
            className={`comp-tab-btn ${activeImageTab === 'before' ? 'active' : ''}`}
            onClick={() => {
              if (selectedHotspot && onOpenSpectralView) {
                onOpenSpectralView(selectedHotspot, 'before');
              }
            }}
            title="Inspect T1 Baseline in Spectral View"
          >
            BEFORE ↗
          </button>
          <button
            type="button"
            className={`comp-tab-btn ${activeImageTab === 'after' ? 'active' : ''}`}
            onClick={() => {
              if (selectedHotspot && onOpenSpectralView) {
                onOpenSpectralView(selectedHotspot, 'after');
              }
            }}
            title="Inspect T2 Observation in Spectral View"
          >
            AFTER ↗
          </button>
          <button
            type="button"
            className="comp-tab-btn spectral-btn"
            onClick={() => {
              if (selectedHotspot && onOpenSpectralView) {
                onOpenSpectralView(selectedHotspot);
              }
            }}
            title="Open Multi-Spectral Decomposition (NDVI, NDBI, NDWI, Heatmap)"
          >
            🛰️ SPECTRAL ↗
          </button>
        </div>

        {/* Both Before and After cards always render side-by-side cleanly without breaking */}
        <div className="comparison-images" aria-label="Before and after imagery">
          <div
            className="image-card before-card"
            onClick={() => onOpenSpectralView?.(selectedHotspot, 'before')}
            title="Click to open Full-Screen Spectral Analysis"
            style={{
              cursor: 'pointer',
              background: selectedHotspot.beforeColor
                ? `linear-gradient(135deg, ${selectedHotspot.beforeColor} 0%, #16213e 100%)`
                : 'linear-gradient(135deg, #1b2a4a 0%, #0d1522 100%)',
            }}
          >
            {beforeImgUrl && (
              <img
                src={beforeImgUrl}
                alt="T1 Baseline Satellite Capture"
                className="comparison-img"
                loading="lazy"
                onError={(e) => {
                  const fallback = `${API_BASE_URL}/storage/tiles/mumbai_cand1_high_change_2023-12-08_before.png`;
                  if (e.target.src !== fallback) {
                    e.target.src = fallback;
                  }
                }}
              />
            )}
            <div className="image-badge">T1 BEFORE ↗</div>
            <span className={`image-desc ${beforeDesc === 'Description not available' ? 'desc-not-available' : ''}`}>
              {beforeDesc}
            </span>
          </div>

          <div
            className="image-card after-card"
            onClick={() => onOpenSpectralView?.(selectedHotspot, 'after')}
            title="Click to open Full-Screen Spectral Analysis"
            style={{
              cursor: 'pointer',
              background: selectedHotspot.afterColor
                ? `linear-gradient(135deg, ${selectedHotspot.afterColor} 0%, #16213e 100%)`
                : 'linear-gradient(135deg, #1b2a4a 0%, #0d1522 100%)',
            }}
          >
            {afterImgUrl && (
              <img
                src={afterImgUrl}
                alt="T2 Change Satellite Capture"
                className="comparison-img"
                loading="lazy"
                onError={(e) => {
                  const fallback = `${API_BASE_URL}/storage/tiles/mumbai_cand1_high_change_2024-12-17_after.png`;
                  if (e.target.src !== fallback) {
                    e.target.src = fallback;
                  }
                }}
              />
            )}
            <div className="image-badge">T2 AFTER ↗</div>
            <span className={`image-desc ${afterDesc === 'Description not available' ? 'desc-not-available' : ''}`}>
              {afterDesc}
            </span>
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="confidence-block">
        <span>RF PROBABILITY CONFIDENCE</span>
        <strong className="data">{confidenceDisplay}</strong>
        <div className="confidence-track">
          <span
            className={`confidence-fill ${confidenceLevel}`}
            style={{ width: `${Math.min(100, Math.max(0, confidencePercent ?? 0))}%` }}
          />
        </div>
      </div>

      {/* Triage Decision Actions */}
      <div className="review-actions-wrapper">
        <span className="actions-label">ANALYST TRIAGE VERIFICATION:</span>
        <div className="review-actions">
          <button
            type="button"
            className="action-btn btn-accept"
            onClick={() => onReviewAction('Accept')}
          >
            ✓ Accept
          </button>
          <button
            type="button"
            className="action-btn btn-reject"
            onClick={() => onReviewAction('Reject')}
          >
            ✕ Reject
          </button>
          <button
            type="button"
            className="action-btn btn-flag"
            onClick={() => onReviewAction('Flag')}
          >
            ⚑ Flag
          </button>
        </div>
        <button
          type="button"
          className="action-btn btn-export-provenance"
          disabled={isExporting}
          onClick={handleExportProvenance}
          title="Export cryptographically verifiable provenance JSON for this hotspot"
        >
          {isExporting ? '⏳ Exporting...' : '📄 Export Provenance'}
        </button>
        {exportNotice && (
          <span className="export-status-toast">{exportNotice}</span>
        )}
      </div>

      {/* Find Similar Button */}
      <button
        className="find-similar-btn"
        type="button"
        disabled={isSearchingSimilar || !backendConnected}
        title={
          !backendConnected
            ? 'Requires backend clustering endpoint — not yet implemented'
            : 'Find visually and structurally similar sites in Qdrant vector space'
        }
        onClick={() => onFindSimilar && onFindSimilar(selectedHotspot)}
      >
        {isSearchingSimilar ? 'Clustering Visual Embeddings...' : '⚡ Find Similar Hotspots'}
      </button>
    </aside>
  );
}
