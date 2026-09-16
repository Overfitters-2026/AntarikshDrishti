import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const hotspotColors = {
  construction: '#ff7f6a',
  'water-change': '#4ea5ff',
  clearance: '#f5a524',
  road: '#a778f2',
}

const normalizeSensor = (sensor) => (sensor ?? '').toLowerCase()

function matchesSensorFilter(hotspotSensor, selectedSensors) {
  const normalizedHotspotSensor = normalizeSensor(hotspotSensor)
  return selectedSensors.some((sensor) => {
    const normalizedSelectedSensor = normalizeSensor(sensor)
    if (!normalizedSelectedSensor) return false
    if (normalizedHotspotSensor === normalizedSelectedSensor) return true
    if (normalizedSelectedSensor === 'landsat') {
      return normalizedHotspotSensor.startsWith('landsat')
    }
    if (normalizedSelectedSensor === 'sentinel-2') {
      return normalizedHotspotSensor.startsWith('sentinel-2')
    }
    if (normalizedSelectedSensor === 'sentinel-1') {
      return normalizedHotspotSensor.startsWith('sentinel-1')
    }
    return normalizedHotspotSensor.includes(normalizedSelectedSensor)
  })
}

function isWithinDateRange(dateValue, dateRange) {
  if (!dateValue) return true
  return dateValue >= dateRange.start && dateValue <= dateRange.end
}

function findNearestHotspot(clickCoordinates, hotspots, threshold = 0.05) {
  let nearestHotspot = null
  let nearestDistance = threshold

  for (const hotspot of hotspots) {
    const deltaLat = hotspot.lat - clickCoordinates.lat
    const deltaLng = hotspot.lng - clickCoordinates.lng
    const distance = Math.sqrt((deltaLat * deltaLat) + (deltaLng * deltaLng))
    if (distance <= nearestDistance) {
      nearestHotspot = hotspot
      nearestDistance = distance
    }
  }

  return nearestHotspot
}

function MapClickLayer({ onMapClick, visibleHotspots }) {
  useMapEvents({
    click(event) {
      const coordinates = { lat: event.latlng.lat, lng: event.latlng.lng }
      const nearbyHotspot = findNearestHotspot(coordinates, visibleHotspots)
      onMapClick(coordinates, nearbyHotspot)
    },
  })

  return null
}

function matchesSearchFilter(hotspotClassification, searchQuery) {
  if (!searchQuery.trim()) return true
  return hotspotClassification.toLowerCase().includes(searchQuery.trim().toLowerCase())
}

function MapPanel({ hotspots, selectedSensors, dateRange, dateRangeError, searchQuery, selectedCoordinates, onMapClick, setSelectedHotspot, addLog }) {
  const visibleHotspots = hotspots.filter((hotspot) => {
    const sensorMatches = matchesSensorFilter(hotspot.sensor, selectedSensors)
    if (!sensorMatches) return false
    if (dateRangeError) return true
    if (!isWithinDateRange(hotspot.date, dateRange)) return false
    return matchesSearchFilter(hotspot.classification, searchQuery)
  })

  return (
    <section className="panel map-panel" aria-label="Map view">
      <MapContainer center={[22, 79]} zoom={5} scrollWheelZoom className="india-map">
        <MapClickLayer onMapClick={onMapClick} visibleHotspots={visibleHotspots} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {selectedCoordinates ? (
          <CircleMarker
            center={[selectedCoordinates.lat, selectedCoordinates.lng]}
            radius={13}
            pathOptions={{
              color: '#20c9b5',
              dashArray: '6 6',
              fillColor: '#20c9b5',
              fillOpacity: 0.05,
              weight: 2,
            }}
          />
        ) : null}
        {visibleHotspots.map((hotspot) => {
          const markerColor = hotspotColors[hotspot.classification] || '#7ea0b7'

          return (
            <CircleMarker
              key={hotspot.id}
              center={[hotspot.lat, hotspot.lng]}
              radius={8}
              pathOptions={{
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.8,
                weight: 2,
              }}
              eventHandlers={{
                click: () => {
                  console.log('Clicked hotspot:', hotspot.id)
                  setSelectedHotspot(hotspot)
                },
              }}
            />
          )
        })}
      </MapContainer>
    </section>
  )
}

export default MapPanel
