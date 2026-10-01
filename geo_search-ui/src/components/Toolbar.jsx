import React, { useEffect, useState } from 'react';
import { setApiBaseUrl, resetApiBaseUrl, API_BASE_URL } from '../api/config.js';

function utcTime() {
  return `${new Date().toISOString().slice(11, 19)} UTC`;
}

function formatCoordinateLabel(value, positiveLabel, negativeLabel) {
  const direction = value >= 0 ? positiveLabel : negativeLabel;
  return `${Math.abs(value).toFixed(4)}°${direction}`;
}

const PRESET_QUERIES = [
  { id: 'water', label: 'WATER', query: 'water body lake reservoir drainage' },
  { id: 'construction', label: 'CONSTRUCTION', query: 'urban construction concrete foundations' },
  { id: 'vegetation', label: 'VEGETATION', query: 'forest clearance agriculture vegetation canopy' },
  { id: 'road', label: 'ROAD', query: 'road network transport highway corridor' },
];

export default function Toolbar({
  selectedCoordinates,
  searchQuery,
  setSearchQuery,
  activeFilterCount,
  onResetFilters,
  onOpenImageSearch,
  backendConnected,
  onBackToLanding,
}) {
  const [time, setTime] = useState(utcTime);
  const [searchDraft, setSearchDraft] = useState(searchQuery);

  const aoiText = selectedCoordinates
    ? `AOI: ${formatCoordinateLabel(selectedCoordinates.lat, 'N', 'S')}, ${formatCoordinateLabel(selectedCoordinates.lng, 'E', 'W')}`
    : 'AOI: 19.0760°N, 72.8777°E (Mumbai Basin)';

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const commitSearch = () => {
    setSearchQuery(searchDraft.trim());
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitSearch();
    }
  };

  const handlePresetClick = (preset) => {
    setSearchDraft(preset.query);
    setSearchQuery(preset.query);
  };

  const handleReset = () => {
    setSearchDraft('');
    onResetFilters();
  };

  useEffect(() => {
    const intervalId = setInterval(() => setTime(utcTime()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="panel toolbar">
      {/* Title & AOI */}
      <div className="toolbar-branding">
        <div className="app-title">
          <span className="brand-glow">ANTARIKSHDRISHTI</span>
          <span className="brand-sub">// SATELLITE INTELLIGENCE</span>
          <span className="version-badge">v1.4.0</span>
        </div>
        <div className="aoi-display data" title="Current Area of Interest (AOI)">
          {aoiText}
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="mission-landing-link"
              title="Return to Antariksh Drishti Hero & Mission Landing Page"
              style={{
                marginLeft: '8px',
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: '500',
                fontFamily: 'monospace',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              🌐 Mission Landing
            </button>
          )}
        </div>
      </div>

      {/* Main Text Semantic Search Box */}
      <div className="toolbar-search-panel">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="imagery-search"
            type="search"
            placeholder="Search imagery by text prompt (e.g. 'urban encroachment near Bangalore', 'reservoir drainage')..."
            aria-label="Search imagery by text prompt"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchDraft && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearchDraft('');
                setSearchQuery('');
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Preset Chips */}
        <div className="preset-chips-row">
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-chip ${searchQuery.toLowerCase().includes(preset.id) ? 'active' : ''}`}
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Controls: Image-to-Image Search & Status Badge */}
      <div className="toolbar-actions">
        {/* IMG-TO-IMG SEARCH Button */}
        <button
          type="button"
          className="img-to-img-btn"
          onClick={onOpenImageSearch}
          title="Perform Visual Feature Similarity Search using reference satellite crop"
        >
          <span className="btn-icon">📷</span>
          <span>IMG-TO-IMG SEARCH</span>
        </button>

        {/* Backend Connectivity Status Badge */}
        <div
          className={`sys-status-badge ${backendConnected ? 'connected' : 'offline'}`}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const current = localStorage.getItem('geosentry_api_url') || '';
            const input = window.prompt(
              'Backend API URL (leave blank to use local proxy at localhost:8000):',
              current
            );
            if (input === null) return; // user pressed Cancel
            if (!input.trim()) {
              resetApiBaseUrl(); // clear stale URL → reload using Vite proxy
            } else {
              setApiBaseUrl(input.trim());
            }
          }}
          title={
            backendConnected
              ? 'FastAPI process responding (Online). Click to change backend URL.'
              : 'Backend server offline/unreachable. Click to connect your Render or live API URL!'
          }
        >
          <span className="status-dot" aria-hidden="true" />
          <span>{backendConnected ? 'SERVER: ONLINE' : 'SERVER: OFFLINE (CLICK TO CONNECT)'}</span>
        </div>

        {/* UTC Clock */}
        <time className="utc-clock data" dateTime={new Date().toISOString()} title="Current UTC Zulu Time">
          {time}
        </time>

        {/* Reset Filters Button */}
        <button
          type="button"
          className={`reset-filters-btn ${activeFilterCount > 0 ? 'has-active' : ''}`}
          onClick={handleReset}
          title="Reset active query and sensor filters"
        >
          Reset ({activeFilterCount})
        </button>
      </div>
    </header>
  );
}
