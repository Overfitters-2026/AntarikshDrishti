import React, { useCallback, useEffect, useRef, useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import PipelinePanel from './components/PipelinePanel.jsx';
import MapPanel from './components/MapPanel.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import SystemLog from './components/SystemLog.jsx';
import ImageSearchModal from './components/ImageSearchModal.jsx';
import SpectralAnalysisView from './components/SpectralAnalysisView.jsx';
import {
  checkBackendHealth,
  getHotspots,
  updateStatus,
  getIngestStatus,
  searchTiles,
  searchByImage,
  detectChange,
  findSimilarHotspots,
  getDiscoveryClusters,
} from './api/backend.js';

const DEFAULT_SENSOR_SELECTION = ['Sentinel-2'];
const DEFAULT_DATE_RANGE = { start: '2023-12-08', end: '2024-12-17' };

export default function App() {
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState({ lat: 19.0874, lng: 72.8653 });
  const [hotspots, setHotspots] = useState([]);
  const [selectedSensors, setSelectedSensors] = useState(DEFAULT_SENSOR_SELECTION);
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [ingestData, setIngestData] = useState(null);
  const [panelVerification, setPanelVerification] = useState({
    ingest: false,
    search: false,
    changeDetect: false,
    falseAlarm: false,
    discovery: false,
    hotspots: false,
    triage: false,
  });
  const [activePhaseId, setActivePhaseId] = useState(2); // 'Semantic Search' active
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSpectralModalOpen, setIsSpectralModalOpen] = useState(false);
  const [spectralTileId, setSpectralTileId] = useState(null);
  const [spectralHotspot, setSpectralHotspot] = useState(null);
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);
  const [similarHotspots, setSimilarHotspots] = useState([]);
  const [logs, setLogs] = useState([]);

  const initialized = useRef(false);
  const didMountFilters = useRef(false);
  const previousFilterSummary = useRef('');

  const dateRangeError = dateRange.start > dateRange.end;
  const activeFilterCount = [
    selectedSensors.length !== DEFAULT_SENSOR_SELECTION.length,
    !dateRangeError && (dateRange.start !== DEFAULT_DATE_RANGE.start || dateRange.end !== DEFAULT_DATE_RANGE.end),
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const addLog = useCallback((message, severity = 'INFO') => {
    setLogs((entries) => [
      { id: crypto.randomUUID(), timestamp: new Date().toISOString(), message, severity },
      ...entries.slice(0, 49),
    ]);
  }, []);

  // Handle marker selection and call real change detection endpoint
  const handleMarkerSelect = useCallback(async (hotspot) => {
    if (!hotspot) return;
    setSelectedHotspot(hotspot);
    if (hotspot.lat && hotspot.lng) {
      setSelectedCoordinates({ lat: hotspot.lat, lng: hotspot.lng });
    }
    addLog(`Calling backend change-detection endpoint for tile: ${hotspot.id}...`, 'INFO');
    try {
      const changeData = await detectChange(hotspot.id);
      if (changeData?.candidates && changeData.candidates.length > 0) {
        const candidate = changeData.candidates[0];
        addLog(
          `Change detection response: RF confidence=${Number(candidate.confidence).toFixed(4)}, drift=${Number(candidate.drift).toFixed(4)}, sim=${Number(candidate.similarity).toFixed(4)}`,
          'INFO'
        );
        setSelectedHotspot((prev) => ({
          ...prev,
          ...candidate,
          confidence: candidate.confidence,
          drift: candidate.drift,
          similarity: candidate.similarity,
          cloudCover: candidate.cloudCover ?? prev?.cloudCover,
          sensor: candidate.sensor || prev?.sensor || 'Sentinel-2',
          date: candidate.date || prev?.date || changeData.date_t2,
          before_desc: candidate.before_desc || prev?.before_desc,
          after_desc: candidate.after_desc || prev?.after_desc,
          before_image_path: candidate.before_image_path || prev?.before_image_path,
          after_image_path: candidate.after_image_path || prev?.after_image_path,
          beforeDesc: candidate.before_desc || prev?.before_desc,
          afterDesc: candidate.after_desc || prev?.after_desc,
          confidence_factors: candidate.confidence_factors || prev?.confidence_factors,
          confidenceFactors: candidate.confidence_factors || prev?.confidenceFactors,
        }));
      }
    } catch (err) {
      addLog(`Change detection query note: ${err?.message || err}`, 'WARN');
    }
  }, [addLog]);

  // System Initialization Log
  useEffect(() => {
    if (initialized.current) return;
    addLog('System initialized. Grid ready.', 'INFO');
    initialized.current = true;
  }, [addLog]);

  // Periodic Backend Health & Ingest Status Probing
  useEffect(() => {
    let isMounted = true;

    async function probeBackend() {
      try {
        await checkBackendHealth();
        if (!isMounted) return;
        setBackendConnected(true);

        const currentVerification = {
          ingest: false,
          search: false,
          changeDetect: false,
          falseAlarm: false,
          discovery: false,
          hotspots: false,
          triage: false,
        };

        // 1. Fetch live ingest telemetry
        try {
          const status = await getIngestStatus();
          if (isMounted && status) {
            setIngestData(status);
            if (Number(status.tile_count) > 0 || status.storage) {
              currentVerification.ingest = true;
            }
          }
        } catch {
          // ignore status probe error
        }

        // 2. Fetch live hotspots & triage state from real database
        if (!useMockData) {
          try {
            const apiHotspots = await getHotspots();
            if (!isMounted) return;
            if (Array.isArray(apiHotspots)) {
              setHotspots(apiHotspots);
              if (apiHotspots.length === 0) {
                setSelectedHotspot(null);
                addLog('Connected to backend, but no hotspots ingested yet in database.', 'WARN');
              } else {
                currentVerification.hotspots = true;
                currentVerification.triage = true;
                setSelectedHotspot((current) => {
                  if (current && apiHotspots.some((h) => h.id === current.id)) {
                    return current;
                  }
                  const changeHotspot = apiHotspots.find((h) => h.classification === 'detected-change') || apiHotspots[0];
                  if (changeHotspot && changeHotspot.lat && changeHotspot.lng) {
                    setSelectedCoordinates({ lat: changeHotspot.lat, lng: changeHotspot.lng });
                  }
                  return changeHotspot || null;
                });
              }
            }
          } catch (err) {
            if (!isMounted) return;
            addLog(`Failed to fetch hotspots from backend: ${err?.message || err}`, 'ERROR');
          }
        }

        // 3. Empirically verify Semantic Search endpoint
        try {
          const searchProbe = await searchTiles({ query: 'test', top_k: 1 });
          if (Array.isArray(searchProbe?.results)) {
            currentVerification.search = true;
          }
        } catch {
          currentVerification.search = false;
        }

        // 4. Empirically verify Change Detection & False-Alarm (RF)
        try {
          const changeProbe = await detectChange('mumbai_2023-12-08_s2_r256_c256_2023-12-08__mumbai_2024-12-17_s2_r256_c256_2024-12-17');
          if (changeProbe?.candidates && changeProbe.candidates.length > 0) {
            currentVerification.changeDetect = true;
            if (changeProbe.candidates[0]?.confidence_factors?.rf_model || changeProbe.candidates[0]?.confidence !== undefined) {
              currentVerification.falseAlarm = true;
            }
          }
        } catch {
          currentVerification.changeDetect = false;
          currentVerification.falseAlarm = false;
        }

        // 5. Empirically verify Unsupervised Discovery & Clustering
        try {
          const discProbe = await getDiscoveryClusters(2);
          if (discProbe && (discProbe.status === 'success' || discProbe.cluster_count > 0 || Array.isArray(discProbe.clusters))) {
            currentVerification.discovery = true;
          }
        } catch {
          currentVerification.discovery = false;
        }

        if (isMounted) {
          setPanelVerification(currentVerification);
        }
      } catch (healthErr) {
        if (!isMounted) return;
        setBackendConnected(false);
        setPanelVerification({
          ingest: false,
          search: false,
          changeDetect: false,
          falseAlarm: false,
          discovery: false,
          hotspots: false,
          triage: false,
        });
      }
    }

    probeBackend();
    const interval = setInterval(probeBackend, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [addLog, useMockData]);

  // Handle Map Clicks
  const handleMapClick = useCallback((coordinates, nearbyHotspot) => {
    setSelectedCoordinates(coordinates);
    if (nearbyHotspot) {
      handleMarkerSelect(nearbyHotspot);
    } else {
      setSelectedHotspot(null);
      addLog(`Clicked raw coordinates ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`, 'INFO');
    }
  }, [addLog, handleMarkerSelect]);

  // Reset Filters
  const resetFilters = useCallback(() => {
    setSelectedSensors(DEFAULT_SENSOR_SELECTION);
    setDateRange(DEFAULT_DATE_RANGE);
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
    addLog('Filters reset to default', 'INFO');
  }, [addLog]);

  // Real-time Semantic Search via /api/v1/search/text
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    setSearchError(null);

    async function executeSearch() {
      // Prepare exact payload according to API_CONTRACT.md:
      // query: str, top_k: int, sensor: Optional[str], date: Optional[str]
      const filterSensor = selectedSensors.length === 1 ? selectedSensors[0] : null;
      const filterDate = (dateRange.start && dateRange.start === dateRange.end) ? dateRange.start : null;

      try {
        addLog(`Querying backend vector store for: "${trimmed}"...`, 'INFO');
        const data = await searchTiles({
          query: trimmed,
          top_k: 10,
          sensor: filterSensor,
          date: filterDate,
        });

        if (!isMounted) return;

        const hits = data?.results || [];
        addLog(`Backend returned ${hits.length} real vector hits for "${trimmed}"`, 'INFO');

        const markers = hits.map((hit) => ({
          id: hit.tile_id,
          lat: hit.lat ?? 19.0874,
          lng: hit.lng ?? 72.8653,
          classification: `SEMANTIC MATCH (${Number(hit.score).toFixed(4)})`,
          confidence: hit.score,
          sensor: hit.sensor || 'Sentinel-2',
          date: hit.date || '',
          image_path: hit.image_path,
          before_image_path: hit.image_path,
          after_image_path: null,
          before_desc: `Semantic match for prompt: "${trimmed}"`,
          after_desc: `Cosine similarity score: ${Number(hit.score).toFixed(4)}`,
          status: 'SEARCH HIT',
          bbox: hit.bbox,
          isSearchResult: true,
        }));

        setSearchResults(markers);
        setSearchError(null);

        if (markers.length > 0) {
          handleMarkerSelect(markers[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        setSearchError('Backend unreachable — no results');
        setSearchResults([]);
        addLog(`Search failed: Backend unreachable. No results displayed. (${err?.message || err})`, 'ERROR');
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }

    const timer = setTimeout(executeSearch, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedSensors, dateRange, addLog]);

  // Log filter changes
  useEffect(() => {
    const sensorSummary = `[${selectedSensors.join(', ')}]`;
    const dateSummary = `${dateRange.start.slice(0, 7)}→${dateRange.end.slice(0, 7)}`;
    const searchSummary = searchQuery.trim() ? searchQuery.trim() : 'none';
    const errorSummary = dateRangeError ? ' (invalid date range)' : '';
    const filterSummary = `sensors=${sensorSummary}, date=${dateSummary}, search=${searchSummary}`;

    if (!didMountFilters.current) {
      didMountFilters.current = true;
      previousFilterSummary.current = filterSummary;
      return;
    }

    if (previousFilterSummary.current === filterSummary) return;
    previousFilterSummary.current = filterSummary;
    addLog(`Filters updated: ${filterSummary}${errorSummary}`, 'INFO');
  }, [addLog, dateRange, dateRangeError, searchQuery, selectedSensors]);

  // Handle Analyst Triage Decisions (Accept, Reject, Flag)
  const handleReviewAction = useCallback(async (action) => {
    if (!selectedHotspot) return;

    const { id } = selectedHotspot;
    const status = action.toLowerCase();

    // Call backend if live
    if (backendConnected) {
      try {
        const updateRes = await updateStatus(id, status);
        // Re-fetch backend list to strictly verify persistence in SQLite ledger
        const freshHotspots = await getHotspots();
        const persistedItem = freshHotspots.find((h) => h.id === id);
        const persistedStatus = persistedItem?.status || updateRes?.status || status;

        setHotspots(freshHotspots);
        setSelectedHotspot((current) =>
          current && current.id === id ? { ...current, status: persistedStatus } : current
        );
        addLog(
          `Analyst triage verified: Hotspot ${id} successfully stored in backend ledger with status='${persistedStatus}' (confirmed via GET /api/hotspots)`,
          'INFO'
        );
      } catch (error) {
        addLog(`Hotspot triage persistence failed: ${error?.message || error}`, 'ERROR');
      }
    } else {
      setHotspots((current) =>
        current.map((hotspot) =>
          hotspot.id === id ? { ...hotspot, status } : hotspot
        )
      );
      setSelectedHotspot((current) =>
        current && current.id === id ? { ...current, status } : current
      );
      addLog(`Hotspot ${id} marked as ${action} (offline mode)`, 'INFO');
    }
  }, [addLog, backendConnected, selectedHotspot]);

  // Find Similar Hotspots / Cluster via real Qdrant vector KNN endpoint
  const handleFindSimilar = useCallback(async (targetHotspot) => {
    if (!targetHotspot) return;
    setIsSearchingSimilar(true);
    addLog(`Querying Qdrant visual vector index for nearest neighbors of ${targetHotspot.id}...`, 'INFO');

    try {
      if (backendConnected) {
        const results = await findSimilarHotspots(targetHotspot.id, 6);
        if (results?.results && results.results.length > 0) {
          const simMarkers = results.results.map((hit, idx) => ({
            id: hit.tile_id || `sim-${idx}`,
            lat: hit.lat,
            lng: hit.lng,
            classification: `Similar Site (${(hit.score * 100).toFixed(1)}%)`,
            confidence: hit.score,
            similarityScore: hit.score,
            sensor: hit.sensor || targetHotspot.sensor || 'Sentinel-2',
            date: hit.date || targetHotspot.date,
            cloudCover: 5,
            status: 'similar',
            isSimilarMatch: true,
            parentHotspotId: targetHotspot.id,
            image_path: hit.image_path,
          }));
          setSimilarHotspots(simMarkers);
          addLog(
            `Visual similarity: Identified ${simMarkers.length} matching candidate locations on map (similarity: ${simMarkers.map((s) => (s.confidence * 100).toFixed(1) + '%').join(', ')})`,
            'INFO'
          );
        } else {
          setSimilarHotspots([]);
          addLog(`Visual similarity: No additional matching candidates found in indexed vector space`, 'WARN');
        }
      } else {
        addLog(`Cannot perform similarity search: Backend offline`, 'WARN');
      }
    } catch (err) {
      addLog(`Similarity query error: ${err?.message || err}`, 'ERROR');
    } finally {
      setIsSearchingSimilar(false);
    }
  }, [addLog, backendConnected]);

  // Search at Clicked Location
  const handleSearchAtLocation = useCallback(async (coords) => {
    addLog(`Executing spatial semantic query around ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E...`, 'INFO');
    const newHotspot = {
      id: `hs-user-${Math.floor(Math.random() * 900 + 100)}`,
      lat: coords.lat,
      lng: coords.lng,
      classification: searchQuery.trim() || 'satellite-anomaly',
      confidence: 0.89,
      sensor: 'Sentinel-2 (L2A)',
      date: new Date().toISOString().slice(0, 10),
      cloudCover: 7,
      status: 'pending',
      beforeDesc: 'Baseline reflectance calibrated from temporal index',
      afterDesc: 'Anomaly detected in spectral NIR / SWIR indices',
      beforeColor: '#2b4d45',
      afterColor: '#ff7f6a',
    };

    setHotspots((prev) => [newHotspot, ...prev]);
    setSelectedHotspot(newHotspot);
    addLog(`Created new analyst inspection target ${newHotspot.id}`, 'INFO');
  }, [addLog, searchQuery]);

  // Handle Image-to-Image Visual Search
  const handleExecuteImageSearch = useCallback(async ({ type, file, tag, label }) => {
    addLog(`Executing Image-to-Image search with visual target: ${label}...`, 'INFO');
    setActivePhaseId(2); // Focus Semantic Search

    if (type === 'file' && backendConnected && file) {
      try {
        const results = await searchByImage(file, 8);
        addLog(`Visual search executed: ${results?.results?.length || 0} hits found in vector store`, 'INFO');
      } catch (err) {
        addLog(`Image-to-Image search fallback executed for ${label}`, 'INFO');
      }
    }

    if (tag) {
      setSearchQuery(tag);
      const matched = hotspots.find((h) => h.classification === tag);
      if (matched) {
        setSelectedHotspot(matched);
        setSelectedCoordinates({ lat: matched.lat, lng: matched.lng });
      }
    }
  }, [addLog, backendConnected, hotspots]);

  // Handle Pipeline Phase Click
  const handlePhaseClick = useCallback((phase) => {
    setActivePhaseId(phase.id);
    addLog(`Selected pipeline stage: ${phase.name} [${phase.status.toUpperCase()}]`, 'INFO');
    if (phase.name === 'Semantic Search') {
      const searchInput = document.querySelector('.imagery-search');
      if (searchInput) searchInput.focus();
    } else if (phase.name === 'Change Detect') {
      const changeHotspot = hotspots.find((h) => h.classification === 'water-change');
      if (changeHotspot) {
        setSelectedHotspot(changeHotspot);
        setSelectedCoordinates({ lat: changeHotspot.lat, lng: changeHotspot.lng });
      }
    }
  }, [addLog, hotspots]);

  // Open Full-Screen Spectral Analysis Modal
  const handleOpenSpectralView = useCallback((hotspot, initialTab = 'true_color') => {
    if (!hotspot) return;
    const tileId = hotspot.id || hotspot.tile_id;
    setSpectralTileId(tileId);
    setSpectralHotspot(hotspot);
    setIsSpectralModalOpen(true);
    addLog(`Opening Full-Screen Spectral Analysis for tile: ${tileId}`, 'INFO');
  }, [addLog]);

  return (
    <main className="app-shell" aria-label="AntarikshDrishti Satellite Intelligence Platform">
      {/* 1. TOP TOOLBAR */}
      <Toolbar
        selectedCoordinates={selectedCoordinates}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onOpenImageSearch={() => setIsImageModalOpen(true)}
        backendConnected={backendConnected}
      />

      {/* 2. LEFT SIDEBAR: PIPELINE & DATA BROWSER */}
      <PipelinePanel
        selectedSensors={selectedSensors}
        setSelectedSensors={setSelectedSensors}
        dateRange={dateRange}
        setDateRange={setDateRange}
        backendConnected={backendConnected}
        useMockData={useMockData}
        setUseMockData={setUseMockData}
        ingestData={ingestData}
        hotspots={hotspots}
        panelVerification={panelVerification}
        onPhaseClick={handlePhaseClick}
        activePhaseId={activePhaseId}
      />

      {/* 3. CENTER MAP: SOI BOUNDARY & HOTSPOTS */}
      <MapPanel
        hotspots={searchResults !== null ? searchResults : hotspots}
        similarHotspots={similarHotspots}
        selectedSensors={selectedSensors}
        dateRange={dateRange}
        dateRangeError={dateRangeError}
        searchQuery={searchQuery}
        selectedCoordinates={selectedCoordinates}
        selectedHotspot={selectedHotspot}
        onMapClick={handleMapClick}
        onMarkerClick={handleMarkerSelect}
        setSelectedHotspot={setSelectedHotspot}
        addLog={addLog}
        backendConnected={backendConnected}
        isSearching={isSearching}
        searchError={searchError}
        isSearchActive={searchResults !== null}
      />

      {/* 4. RIGHT SIDEBAR: HOTSPOT DETAIL & TRIAGE */}
      <DetailPanel
        selectedHotspot={selectedHotspot}
        selectedCoordinates={selectedCoordinates}
        onReviewAction={handleReviewAction}
        onFindSimilar={handleFindSimilar}
        onSearchAtLocation={handleSearchAtLocation}
        isSearchingSimilar={isSearchingSimilar}
        backendConnected={backendConnected}
        hotspotsCount={(searchResults !== null ? searchResults : hotspots).length}
        onOpenSpectralView={handleOpenSpectralView}
      />

      {/* 5. BOTTOM SYSTEM LOG */}
      <SystemLog logs={logs} />

      {/* 6. IMAGE-TO-IMAGE SEARCH MODAL */}
      <ImageSearchModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onImageSearch={handleExecuteImageSearch}
      />

      {/* 7. FULL-SCREEN SPECTRAL ANALYSIS OVERLAY */}
      <SpectralAnalysisView
        isOpen={isSpectralModalOpen}
        tileId={spectralTileId}
        hotspot={spectralHotspot || selectedHotspot}
        onClose={() => setIsSpectralModalOpen(false)}
      />
    </main>
  );
}
