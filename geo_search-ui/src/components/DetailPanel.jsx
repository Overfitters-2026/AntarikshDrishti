function DetailPanel({ selectedHotspot, selectedCoordinates, onReviewAction }) {
  if (!selectedHotspot && !selectedCoordinates) {
    return (
      <aside className="panel detail-panel">
        <p className="detail-empty-state">Select a hotspot on the map to view details</p>
      </aside>
    )
  }

  if (!selectedHotspot && selectedCoordinates) {
    return (
      <aside className="panel detail-panel">
        <h2 className="panel-heading">LOCATION</h2>
        <p className="raw-location-title data">No hotspot at this location — showing raw coordinates</p>
        <table className="metadata-table">
          <tbody>
            <tr><th scope="row">Latitude</th><td className="data">{selectedCoordinates.lat.toFixed(4)}°N</td></tr>
            <tr><th scope="row">Longitude</th><td className="data">{selectedCoordinates.lng.toFixed(4)}°E</td></tr>
          </tbody>
        </table>
        <p className="raw-location-note">
          This could trigger a new on-demand search in the real backend.
        </p>
      </aside>
    )
  }

  const confidencePercent = Math.round(selectedHotspot.confidence * 100)
  const confidenceLevel = confidencePercent > 70 ? 'high' : confidencePercent >= 40 ? 'medium' : 'low'
  const metadata = [
    ['Sensor', selectedHotspot.sensor],
    ['Date', selectedHotspot.date],
    ['Coordinates', `${selectedHotspot.lat.toFixed(4)}, ${selectedHotspot.lng.toFixed(4)}`],
    ['Cloud %', `${selectedHotspot.cloudCover}%`],
    ['Confidence', `${confidencePercent}%`],
  ]
  const logAction = (action) => {
    console.log(`${action} hotspot:`, selectedHotspot.id)
    onReviewAction(action)
  }

  return (
    <aside className="panel detail-panel">
      <h2 className="panel-heading">HOTSPOT DETAIL</h2>
      <p className="hotspot-id data">{selectedHotspot.id} · {selectedHotspot.classification}</p>
      <table className="metadata-table">
        <tbody>
          {metadata.map(([label, value]) => (
            <tr key={label}><th scope="row">{label}</th><td className="data">{value}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="comparison-images" aria-label="Before and after imagery">
        <div>BEFORE</div>
        <div>AFTER</div>
      </div>
      <div className="confidence-block">
        <span>CONFIDENCE</span><strong className="data">{confidencePercent}%</strong>
        <div className="confidence-track"><span className={`confidence-fill ${confidenceLevel}`} style={{ width: `${confidencePercent}%` }} /></div>
      </div>
      <div className="review-actions">
        <button type="button" onClick={() => logAction('Accept')}>Accept</button>
        <button type="button" onClick={() => logAction('Reject')}>Reject</button>
        <button type="button" onClick={() => logAction('Flag')}>Flag</button>
      </div>
      <span className="find-similar-tooltip" title="Coming soon">
        <button className="find-similar" type="button" disabled>Find Similar</button>
      </span>
    </aside>
  )
}

export default DetailPanel
