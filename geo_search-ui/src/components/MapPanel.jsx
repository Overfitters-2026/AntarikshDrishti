import React, { useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, GeoJSON, useMapEvents, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import indiaBoundaryData from '../data/india_boundary_clean.json';

const hotspotColors = {
  construction: '#ff7f6a',
  'water-change': '#4ea5ff',
  clearance: '#f5a524',
  road: '#a778f2',
};

const BASEMAPS = {
  osm: {
    name: 'OSM STANDARD',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'SATELLITE (ESRI)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Earthstar Geographics',
  },
  dark: {
    name: 'DARK (CARTO VOYAGER)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
};

const normalizeSensor = (sensor) => (sensor ?? '').toLowerCase();

function matchesSensorFilter(hotspotSensor, selectedSensors) {
  const normalizedHotspotSensor = normalizeSensor(hotspotSensor);
  return selectedSensors.some((sensor) => {
    const normalizedSelectedSensor = normalizeSensor(sensor);
    if (!normalizedSelectedSensor) return false;
    if (normalizedHotspotSensor === normalizedSelectedSensor) return true;
    if (normalizedSelectedSensor === 'landsat') {
      return normalizedHotspotSensor.startsWith('landsat');
    }
    if (normalizedSelectedSensor === 'sentinel-2') {
      return normalizedHotspotSensor.startsWith('sentinel-2');
    }
    if (normalizedSelectedSensor === 'sentinel-1') {
      return normalizedHotspotSensor.startsWith('sentinel-1');
    }
    return normalizedHotspotSensor.includes(normalizedSelectedSensor);
  });
}

function isWithinDateRange(dateValue, dateRange) {
  if (!dateValue) return true;
  return dateValue >= dateRange.start && dateValue <= dateRange.end;
}

function findNearestHotspot(clickCoordinates, hotspots, threshold = 0.5) {
  let nearestHotspot = null;
  let nearestDistance = threshold;

  for (const hotspot of hotspots) {
    const deltaLat = hotspot.lat - clickCoordinates.lat;
    const deltaLng = hotspot.lng - clickCoordinates.lng;
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
    if (distance <= nearestDistance) {
      nearestHotspot = hotspot;
      nearestDistance = distance;
    }
  }

  return nearestHotspot;
}

function MapClickLayer({ onMapClick, onMarkerClick, visibleHotspots }) {
  useMapEvents({
    click(event) {
      const coordinates = { lat: event.latlng.lat, lng: event.latlng.lng };
      const nearbyHotspot = findNearestHotspot(coordinates, visibleHotspots);
      onMapClick(coordinates, nearbyHotspot);
      if (nearbyHotspot && onMarkerClick) {
        onMarkerClick(nearbyHotspot);
      }
    },
  });

  return null;
}

function matchesSearchFilter(hotspotClassification, searchQuery) {
  if (!searchQuery.trim()) return true;
  const q = searchQuery.trim().toLowerCase();
  return (
    hotspotClassification.toLowerCase().includes(q) ||
    q.includes(hotspotClassification.toLowerCase())
  );
}

export default function MapPanel({
  hotspots,
  similarHotspots = [],
  selectedSensors,
  dateRange,
  dateRangeError,
  searchQuery,
  selectedCoordinates,
  selectedHotspot,
  onMapClick,
  onMarkerClick,
  setSelectedHotspot,
  addLog,
  backendConnected = false,
  isSearching = false,
  searchError = null,
  isSearchActive = false,
}) {
  const [activeBasemapKey, setActiveBasemapKey] = useState('osm'); // 'osm' | 'satellite' | 'dark'
  const [showSoiBoundary, setShowSoiBoundary] = useState(true);

  // If backend error occurred, show 0 markers
  // If search is active, the markers are computed directly from the backend response
  const visibleHotspots = searchError
    ? []
    : isSearchActive
    ? hotspots
    : hotspots.filter((hotspot) => {
        const sensorMatches = matchesSensorFilter(hotspot.sensor, selectedSensors);
        if (!sensorMatches) return false;
        if (dateRangeError) return true;
        return isWithinDateRange(hotspot.date, dateRange);
      });

  const toggleBasemap = () => {
    const keys = Object.keys(BASEMAPS);
    const nextIndex = (keys.indexOf(activeBasemapKey) + 1) % keys.length;
    setActiveBasemapKey(keys[nextIndex]);
  };

  const activeBasemap = BASEMAPS[activeBasemapKey];

  return (
    <section className="panel map-panel" aria-label="Satellite map view">
      {/* Map Control Bar Overlay */}
      <div className="map-overlay-header">
        <div className="map-results-count">
          {searchError ? (
            <span>MAP PANEL // <strong style={{ color: '#ef4444' }}>BACKEND UNREACHABLE — NO RESULTS</strong></span>
          ) : isSearching ? (
            <span>MAP PANEL // <strong className="highlight">SEARCHING VECTOR STORE...</strong></span>
          ) : isSearchActive ? (
            visibleHotspots.length === 0 ? (
              <span>MAP PANEL // <strong style={{ color: '#f5a524' }}>0 SEMANTIC MATCHES FOUND</strong></span>
            ) : (
              <>MAP PANEL // <strong className="highlight">{visibleHotspots.length} SEMANTIC SEARCH RESULTS</strong></>
            )
          ) : backendConnected && hotspots.length === 0 ? (
            <span>MAP PANEL // <strong style={{ color: '#f5a524' }}>CONNECTED (0 HOTSPOTS INGESTED YET)</strong></span>
          ) : (
            <>MAP PANEL // <strong className="highlight">{visibleHotspots.length} HOTSPOTS</strong></>
          )}
        </div>

        <div className="map-toggles">
          <button
            type="button"
            className={`map-toggle-btn ${showSoiBoundary ? 'active' : ''}`}
            onClick={() => setShowSoiBoundary(!showSoiBoundary)}
            title="Toggle Official Survey of India (SOI) boundary vector overlay"
          >
            SOI BOUNDARY: {showSoiBoundary ? 'ON (OFFICIAL)' : 'OFF'}
          </button>

          <button
            type="button"
            className="map-toggle-btn basemap-switcher"
            onClick={toggleBasemap}
            title="Cycle between OpenStreetMap, ESRI Satellite, and Carto Dark"
          >
            BASE: {activeBasemap.name}
          </button>
        </div>
      </div>

      <MapContainer
        center={[22.5, 78.96]}
        zoom={5}
        scrollWheelZoom
        className="india-map"
      >
        <MapClickLayer onMapClick={onMapClick} onMarkerClick={onMarkerClick} visibleHotspots={visibleHotspots} />
        
        {/* Clean Basemap without API key watermarks */}
        <TileLayer
          key={activeBasemapKey}
          attribution={activeBasemap.attribution}
          url={activeBasemap.url}
          maxZoom={18}
        />

        {/* Survey of India Official Boundary Vector Layer */}
        {showSoiBoundary && (
          <GeoJSON
            data={indiaBoundaryData}
            style={{
              color: '#f5a524',
              weight: 2.2,
              opacity: 0.9,
              fillColor: '#f5a524',
              fillOpacity: 0.03,
              dashArray: '2, 1',
            }}
          />
        )}

        {/* Clicked Coordinates Reticle / Target */}
        {selectedCoordinates && (
          <CircleMarker
            center={[selectedCoordinates.lat, selectedCoordinates.lng]}
            radius={14}
            pathOptions={{
              color: '#20c9b5',
              dashArray: '4 4',
              fillColor: '#20c9b5',
              fillOpacity: 0.15,
              weight: 2,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <span className="coordinate-tooltip">
                {selectedCoordinates.lat.toFixed(4)}°N, {selectedCoordinates.lng.toFixed(4)}°E
              </span>
            </Tooltip>
          </CircleMarker>
        )}

        {/* Hotspot Markers */}
        {visibleHotspots.map((hotspot) => {
          const isSelected = selectedHotspot?.id === hotspot.id;
          const markerColor = hotspot.isSearchResult
            ? '#38bdf8'
            : (hotspotColors[hotspot.classification] || '#ff7f6a');

          return (
            <React.Fragment key={hotspot.id}>
              {/* Outer pulsing ring for selected hotspot */}
              {isSelected && (
                <CircleMarker
                  center={[hotspot.lat, hotspot.lng]}
                  radius={18}
                  pathOptions={{
                    color: '#20c9b5',
                    fillColor: '#20c9b5',
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: '4 3',
                  }}
                />
              )}

              <CircleMarker
                center={[hotspot.lat, hotspot.lng]}
                radius={isSelected ? 10 : 8}
                pathOptions={{
                  color: isSelected ? '#ffffff' : markerColor,
                  fillColor: markerColor,
                  fillOpacity: 0.85,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (onMarkerClick) {
                      onMarkerClick(hotspot);
                    } else {
                      setSelectedHotspot(hotspot);
                    }
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  <div className="hotspot-map-tooltip">
                    <strong>{hotspot.id}</strong>: {hotspot.classification}
                    <br />
                    <span>{hotspot.sensor} · {hotspot.date}</span>
                    <br />
                    <span className="tooltip-conf">
                      Confidence: {hotspot.confidence !== undefined ? Number(hotspot.confidence).toFixed(4) : 'N/A'}
                    </span>
                  </div>
                </Tooltip>
              </CircleMarker>
            </React.Fragment>
          );
        })}

        {/* Similar Location Markers (Dashed Ring Marker Style for Vector KNN matches) */}
        {similarHotspots.map((sim) => {
          if (sim.lat === undefined || sim.lng === undefined || sim.lat === null || sim.lng === null) return null;
          const isSelected = selectedHotspot?.id === sim.id;
          return (
            <React.Fragment key={sim.id}>
              {/* Outer Dashed Ring Highlight */}
              <CircleMarker
                center={[sim.lat, sim.lng]}
                radius={20}
                pathOptions={{
                  color: '#c084fc',
                  fillColor: '#c084fc',
                  fillOpacity: 0.18,
                  weight: 2.5,
                  dashArray: '5 5',
                }}
              />
              {/* Inner Core Point */}
              <CircleMarker
                center={[sim.lat, sim.lng]}
                radius={isSelected ? 10 : 8}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#9333ea',
                  fillOpacity: 0.95,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => {
                    if (onMarkerClick) {
                      onMarkerClick(sim);
                    } else {
                      setSelectedHotspot(sim);
                    }
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]}>
                  <div className="hotspot-map-tooltip">
                    <span style={{ color: '#c084fc', fontWeight: 'bold' }}>⚡ SIMILAR VISUAL SITE (KNN)</span>
                    <br />
                    <span>Cosine Similarity: <strong>{((sim.similarityScore || sim.confidence || 0) * 100).toFixed(1)}%</strong></span>
                    <br />
                    <span>ID: {sim.id}</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </section>
  );
}
