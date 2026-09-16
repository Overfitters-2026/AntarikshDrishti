import { useCallback, useEffect, useRef, useState } from 'react'
import Toolbar from './components/Toolbar.jsx'
import PipelinePanel from './components/PipelinePanel.jsx'
import MapPanel from './components/MapPanel.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import SystemLog from './components/SystemLog.jsx'
import { getHotspots, updateStatus } from './api/backend.js'
import { mockHotspots } from './data/mockData.js'

const DEFAULT_SENSOR_SELECTION = ['Sentinel-2', 'Sentinel-1', 'Landsat', 'Bhuvan']
const DEFAULT_DATE_RANGE = { start: '2024-01-01', end: '2026-01-01' }

function isCorsError(error) {
  return error?.code === 'ERR_CORS' || /cors/i.test(error?.message ?? '')
}

function App() {
  const [selectedHotspot, setSelectedHotspot] = useState(null)
  const [selectedCoordinates, setSelectedCoordinates] = useState(null)
  const [hotspots, setHotspots] = useState(mockHotspots)
  const [selectedSensors, setSelectedSensors] = useState(DEFAULT_SENSOR_SELECTION)
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE)
  const [searchQuery, setSearchQuery] = useState('')
  const [backendConnected, setBackendConnected] = useState(false)
  const [logs, setLogs] = useState([])
  const initialized = useRef(false)
  const backendRequested = useRef(false)
  const didMountFilters = useRef(false)
  const previousFilterSummary = useRef('')

  const dateRangeError = dateRange.start > dateRange.end
  const activeFilterCount = [
    selectedSensors.length !== DEFAULT_SENSOR_SELECTION.length,
    !dateRangeError && (dateRange.start !== DEFAULT_DATE_RANGE.start || dateRange.end !== DEFAULT_DATE_RANGE.end),
    searchQuery.trim().length > 0,
  ].filter(Boolean).length

  const addLog = useCallback((message, severity = 'INFO') => {
    setLogs((entries) => [
      { id: crypto.randomUUID(), timestamp: new Date().toISOString(), message, severity },
      ...entries,
    ])
  }, [])

  useEffect(() => {
    if (initialized.current) return
    addLog('System initialized', 'INFO')
    initialized.current = true
  }, [addLog])

  const handleMapClick = useCallback((coordinates, nearbyHotspot) => {
    setSelectedCoordinates(coordinates)
    setSelectedHotspot(nearbyHotspot ?? null)
    if (nearbyHotspot) {
      addLog(`Selected hotspot ${nearbyHotspot.id} near clicked coordinates`, 'INFO')
    } else {
      addLog(`Clicked raw coordinates ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`, 'INFO')
    }
  }, [addLog])

  const resetFilters = useCallback(() => {
    setSelectedSensors(DEFAULT_SENSOR_SELECTION)
    setDateRange(DEFAULT_DATE_RANGE)
    setSearchQuery('')
  }, [])

  useEffect(() => {
    const sensorSummary = `[${selectedSensors.join(', ')}]`
    const dateSummary = `${dateRange.start.slice(0, 7)}→${dateRange.end.slice(0, 7)}`
    const searchSummary = searchQuery.trim() ? searchQuery.trim() : 'none'
    const errorSummary = dateRangeError ? ' (invalid date range)' : ''
    const filterSummary = `sensors=${sensorSummary}, date=${dateSummary}, search=${searchSummary}`

    if (!didMountFilters.current) {
      didMountFilters.current = true
      previousFilterSummary.current = filterSummary
      return
    }

    if (previousFilterSummary.current === filterSummary) return
    previousFilterSummary.current = filterSummary
    addLog(`Filters updated: ${filterSummary}${errorSummary}`, 'INFO')
  }, [addLog, dateRange, dateRangeError, searchQuery, selectedSensors])

  useEffect(() => {
    if (backendRequested.current) return
    backendRequested.current = true

    async function loadHotspots() {
      try {
        const apiHotspots = await getHotspots()
        setHotspots(apiHotspots)
        setBackendConnected(true)
        addLog(`Loaded ${apiHotspots.length} hotspots from API`, 'INFO')
      } catch (error) {
        setBackendConnected(false)
        if (isCorsError(error)) addLog('CORS blocked — check backend config', 'WARN')
        else addLog('Backend unreachable — using mock data', 'WARN')
      }
    }

    loadHotspots()
  }, [addLog])

  const handleReviewAction = useCallback(async (action) => {
    if (!selectedHotspot) return

    const { id } = selectedHotspot
    const applyLocalStatus = () => {
      const status = action.toLowerCase()
      setHotspots((current) => current.map((hotspot) => (
        hotspot.id === id ? { ...hotspot, status } : hotspot
      )))
      setSelectedHotspot((current) => current ? { ...current, status } : current)
    }

    if (backendConnected && (action === 'Accept' || action === 'Reject')) {
      try {
        await updateStatus(id, action.toLowerCase())
      } catch (error) {
        setBackendConnected(false)
        if (isCorsError(error)) addLog('CORS blocked — check backend config', 'WARN')
        else addLog('Backend unreachable — using mock data', 'WARN')
      }
    }

    applyLocalStatus()
    addLog(`Hotspot ${id} marked as ${action}`, 'INFO')
  }, [addLog, backendConnected, selectedHotspot])

  return (
    <main className="app-shell" aria-label="Geo Search UI">
      <Toolbar
        selectedCoordinates={selectedCoordinates}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
      />
      <PipelinePanel
        selectedSensors={selectedSensors}
        setSelectedSensors={setSelectedSensors}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      <MapPanel
        hotspots={hotspots}
        selectedSensors={selectedSensors}
        dateRange={dateRange}
        dateRangeError={dateRangeError}
        searchQuery={searchQuery}
        selectedCoordinates={selectedCoordinates}
        onMapClick={handleMapClick}
        setSelectedHotspot={setSelectedHotspot}
        addLog={addLog}
      />
      <DetailPanel
        selectedHotspot={selectedHotspot}
        selectedCoordinates={selectedCoordinates}
        onReviewAction={handleReviewAction}
      />
      <SystemLog logs={logs} />
    </main>
  )
}

export default App
