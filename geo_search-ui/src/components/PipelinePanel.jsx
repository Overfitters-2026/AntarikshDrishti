import { mockPipelineStatus } from '../data/mockData.js'
import { useEffect, useState } from 'react'

const statusIcons = {
  done: '■',
  running: '▶',
  pending: '○',
}

const sensorOptions = ['Sentinel-2', 'Sentinel-1', 'Landsat', 'Bhuvan']

function PipelinePanel({ selectedSensors, setSelectedSensors, dateRange, setDateRange }) {
  const [dateDraft, setDateDraft] = useState(dateRange)
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    setDateDraft(dateRange)
    setDateError('')
  }, [dateRange.start, dateRange.end])

  const toggleSensor = (sensor) => {
    setSelectedSensors((current) => (
      current.includes(sensor)
        ? current.filter((item) => item !== sensor)
        : [...current, sensor]
    ))
  }

  const commitDateDraft = (nextDraft) => {
    const hasValidBounds = nextDraft.start && nextDraft.end && nextDraft.start <= nextDraft.end
    setDateDraft(nextDraft)

    if (!hasValidBounds) {
      setDateError('Invalid range')
      return
    }

    setDateError('')
    setDateRange(nextDraft)
  }

  const handleDateChange = (field, value) => {
    commitDateDraft({ ...dateDraft, [field]: value })
  }

  return (
    <aside className="panel pipeline-panel">
      <span className="mock-data-badge">MOCK DATA</span>
      <h2 className="panel-heading">PIPELINE</h2>
      <ol className="pipeline-list">
        {mockPipelineStatus.map((phase) => (
          <li className="pipeline-row" key={phase.id}>
            <span className={`phase-icon ${phase.status}`} aria-hidden="true">{statusIcons[phase.status]}</span>
            <span>{phase.name}</span>
          </li>
        ))}
      </ol>
      <section className="data-browser" aria-label="Data browser">
        <h2 className="panel-heading">DATA BROWSER</h2>
        <dl className="data-browser-grid">
          <div className="data-browser-box data-browser-static"><dt>Tiles</dt><dd>1,240</dd></div>
          <div className="data-browser-box data-browser-sensors">
            <dt>Sensors</dt>
            <dd>
              <div className="sensor-list">
                {sensorOptions.map((sensor) => (
                  <label className="sensor-option sensor-option-inline" key={sensor}>
                    <input
                      className="sensor-checkbox-input"
                      type="checkbox"
                      checked={selectedSensors.includes(sensor)}
                      onChange={() => toggleSensor(sensor)}
                    />
                    <span className="sensor-label">{sensor}</span>
                  </label>
                ))}
              </div>
            </dd>
          </div>
          <div className="data-browser-box date-range-group">
            <dt>Date range</dt>
            <dd>
              <div className="date-input-row">
                <label className="date-input-group" htmlFor="start-date">
                  <span>Start</span>
                  <input
                    id="start-date"
                    type="date"
                    value={dateDraft.start}
                    onChange={(event) => handleDateChange('start', event.target.value)}
                  />
                </label>
                <span className="date-range-separator" aria-hidden="true">→</span>
                <label className="date-input-group" htmlFor="end-date">
                  <span>End</span>
                  <input
                    id="end-date"
                    type="date"
                    value={dateDraft.end}
                    onChange={(event) => handleDateChange('end', event.target.value)}
                  />
                </label>
              </div>
              {dateError ? <div className="date-range-error" role="alert">Invalid range</div> : null}
            </dd>
          </div>
          <div className="data-browser-box data-browser-static"><dt>Storage</dt><dd>3.2 GB</dd></div>
        </dl>
      </section>
    </aside>
  )
}

export default PipelinePanel
