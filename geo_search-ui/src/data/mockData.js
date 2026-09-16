export const mockPipelineStatus = [
  { id: 0, name: 'Setup', status: 'done' },
  { id: 1, name: 'Ingestion', status: 'done' },
  { id: 2, name: 'Semantic Search', status: 'running' },
  { id: 3, name: 'Change Detect', status: 'pending' },
  { id: 4, name: 'False-Alarm', status: 'pending' },
  { id: 5, name: 'Discovery', status: 'pending' },
  { id: 6, name: 'Dashboard', status: 'pending' },
  { id: 7, name: 'Offline Test', status: 'pending' },
]

export const mockHotspots = [
  { id: 'hs-001', lat: 28.6139, lng: 77.209, classification: 'construction', confidence: 0.94, sensor: 'Sentinel-2', date: '2025-12-14', cloudCover: 8 },
  { id: 'hs-002', lat: 19.076, lng: 72.8777, classification: 'water-change', confidence: 0.87, sensor: 'Landsat 9', date: '2025-11-28', cloudCover: 12 },
  { id: 'hs-003', lat: 17.385, lng: 78.4867, classification: 'clearance', confidence: 0.81, sensor: 'Sentinel-2', date: '2025-10-09', cloudCover: 4 },
  { id: 'hs-004', lat: 22.5726, lng: 88.3639, classification: 'road', confidence: 0.9, sensor: 'Landsat 9', date: '2025-12-02', cloudCover: 16 },
  { id: 'hs-005', lat: 12.9716, lng: 77.5946, classification: 'construction', confidence: 0.76, sensor: 'Sentinel-2', date: '2025-09-19', cloudCover: 6 },
]
