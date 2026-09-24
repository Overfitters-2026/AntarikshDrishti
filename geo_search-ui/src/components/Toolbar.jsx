import React, { useEffect, useState } from 'react';
import { setApiBaseUrl, API_BASE_URL } from '../api/config.js';

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
            const current = localStorage.getItem('geosentry_api_url') || (API_BASE_URL !== 'http://127.0.0.1:8000' ? API_BASE_URL : '');
            const input = window.prompt('Connect to Backend API URL (e.g. https://your-app.onrender.com):', current);
            if (input !== null) {
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
