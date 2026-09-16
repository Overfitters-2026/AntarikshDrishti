import { useEffect, useState } from 'react'

function utcTime() {
  return `${new Date().toISOString().slice(11, 19)} UTC`
}

function formatCoordinateLabel(value, positiveLabel, negativeLabel) {
  const direction = value >= 0 ? positiveLabel : negativeLabel
  return `${Math.abs(value).toFixed(4)}°${direction}`
}

function Toolbar({ selectedCoordinates, searchQuery, setSearchQuery, activeFilterCount, onResetFilters }) {
  const [time, setTime] = useState(utcTime)
  const [searchDraft, setSearchDraft] = useState(searchQuery)
  const aoiText = selectedCoordinates
    ? `AOI: ${formatCoordinateLabel(selectedCoordinates.lat, 'N', 'S')}, ${formatCoordinateLabel(selectedCoordinates.lng, 'E', 'W')}`
    : 'AOI: 12.9716°N, 77.5946°E → 12.9350°N, 77.6400°E'

  useEffect(() => {
    setSearchDraft(searchQuery)
  }, [searchQuery])

  const commitSearch = () => {
    setSearchQuery(searchDraft.trim())
  }

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    commitSearch()
  }

  const handleReset = () => {
    setSearchDraft('')
    onResetFilters()
  }

  useEffect(() => {
    const intervalId = setInterval(() => setTime(utcTime()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  return (
    <header className="panel toolbar">
      <div className="app-title">
        <span>Geo Search - AI</span>
        <span className="version-badge">v0.1.0</span>
      </div>
      <div className="aoi-display data">{aoiText}</div>
      <div className="pipeline-status"><span className="status-dot" aria-hidden="true" /> IDLE</div>
      <time className="utc-clock data" dateTime={new Date().toISOString()}>{time}</time>
      <div className="toolbar-search-panel">
        <input
          className="imagery-search"
          type="search"
          placeholder="Search imagery by description..."
          aria-label="Search imagery by description"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <div className="toolbar-search-meta">
          <span className="filter-count data">Filters active: {activeFilterCount}</span>
          <button type="button" className="reset-filters" onClick={handleReset}>
            Reset Filters
          </button>
        </div>
      </div>
    </header>
  )
}

export default Toolbar
