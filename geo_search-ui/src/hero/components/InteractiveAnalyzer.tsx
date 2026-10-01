import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CHANGE_CASES, ChangeCase } from '../data/imageryData';
import { 
  Sliders, 
  Layers, 
  MapPin, 
  Maximize2, 
  Minimize2, 
  Scan, 
  Activity, 
  ArrowLeftRight, 
  Search, 
  Check, 
  ShieldAlert, 
  Download,
  Eye,
  Satellite,
  Compass
} from 'lucide-react';

export const InteractiveAnalyzer: React.FC = () => {
  const [activeCaseId, setActiveCaseId] = useState<string>('urban-coastal');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'true-color' | 'false-color' | 'change-mask' | 'ndvi'>('true-color');
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [queryInput, setQueryInput] = useState<string>('');
  const [queryFeedback, setQueryFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeCase = CHANGE_CASES.find(c => c.id === activeCaseId) || CHANGE_CASES[0];

  // Mouse / Touch drag logic for split comparison slider
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleTouchStart = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging, handleMove]);

  // Handle live semantic query in analyzer
  const handleRunLocalQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    setQueryFeedback(`Semantic vector aligned: 3 change clusters identified with 98.4% cosine similarity for "${queryInput.slice(0, 32)}..."`);
    setTimeout(() => setQueryFeedback(null), 5000);
  };

  // Filter styles based on viewMode
  const getFilterStyleT1 = () => {
    switch (viewMode) {
      case 'false-color':
        return 'hue-rotate(90deg) saturate(1.8) contrast(1.1)';
      case 'ndvi':
        return 'contrast(1.4) saturate(2.2) brightness(0.9)';
      default:
        return 'none';
    }
  };

  const getFilterStyleT2 = () => {
    switch (viewMode) {
      case 'false-color':
        return 'hue-rotate(90deg) saturate(1.8) contrast(1.1)';
      case 'ndvi':
        return 'contrast(1.4) saturate(2.2) brightness(0.9)';
      case 'change-mask':
        return 'contrast(1.3) saturate(1.2)';
      default:
        return 'none';
    }
  };

  return (
    <section id="demo" className="relative py-24 sm:py-32 bg-[#030712] border-t border-slate-800/80 overflow-hidden select-none">
      {/* Background Reticle Grid */}
      <div className="absolute inset-0 reticle-grid opacity-15 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 uppercase mb-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span>INTERACTIVE SATELLITE VIEW · BI-TEMPORAL RECONCILIATION</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              Jawaharlal Nehru Port &amp; Coastal Wetlands
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl font-sans">
              Drag the bi-temporal split curtain to compare co-registered optical passes. Inspect automated change detection bounding boxes, spectral index drift, and semantic feature tags.
            </p>
          </div>

          {/* AOI Case Selector Segmented Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto self-start md:self-auto">
            {CHANGE_CASES.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCaseId(c.id);
                  setSliderPosition(50);
                }}
                className={`px-4 py-2 text-xs font-mono font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeCaseId === c.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {c.category}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================
            FULL-WIDTH SATELLITE MAP VIEWPORT
        ======================================================== */}
        <div className={`bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden ${isFullScreen ? 'fixed inset-4 z-50 overflow-y-auto' : ''}`}>
          
          {/* Top Control Bar */}
          <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            {/* Location & Coordinates Telemetry */}
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
              <span className="font-semibold text-white tracking-wide">{activeCase.name}</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300 font-bold">{activeCase.coordinates}</span>
            </div>

            {/* View Modes (True Color RGB / NIR False Color / SCD-Former Diff / NDVI Spectrum) */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('true-color')}
                className={`px-3 py-1 rounded transition-colors text-xs font-mono ${
                  viewMode === 'true-color'
                    ? 'bg-slate-800 text-cyan-300 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                True Color RGB
              </button>
              <button
                onClick={() => setViewMode('false-color')}
                className={`px-3 py-1 rounded transition-colors text-xs font-mono ${
                  viewMode === 'false-color'
                    ? 'bg-slate-800 text-cyan-300 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                NIR False Color
              </button>
              <button
                onClick={() => setViewMode('change-mask')}
                className={`px-3 py-1 rounded transition-colors text-xs font-mono ${
                  viewMode === 'change-mask'
                    ? 'bg-slate-800 text-cyan-300 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SCD-Former Diff
              </button>
              <button
                onClick={() => setViewMode('ndvi')}
                className={`px-3 py-1 rounded transition-colors text-xs font-mono ${
                  viewMode === 'ndvi'
                    ? 'bg-slate-800 text-cyan-300 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                NDVI Spectrum
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 text-xs font-mono ${
                  showBoundingBoxes
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Detection Boxes</span>
              </button>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 rounded bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Satellite Split Canvas Viewport */}
          <div
            ref={containerRef}
            className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-950 overflow-hidden cursor-ew-resize select-none"
            onMouseMove={(e) => {
              if (isDragging) handleMove(e.clientX);
            }}
          >
            {/* Background Image: T2 CURRENT */}
            <div className="absolute inset-0">
              <img
                src={activeCase.imageT2}
                alt={`${activeCase.name} in ${activeCase.timeT2}`}
                className="w-full h-full object-cover"
                style={{ filter: getFilterStyleT2() }}
              />
            </div>

            {/* Foreground Image: T1 BASELINE (Clipped to Slider Percentage) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <div
                className="absolute inset-0"
                style={{ width: containerRef.current?.clientWidth || '100%', height: '100%' }}
              >
                <img
                  src={activeCase.imageT1}
                  alt={`${activeCase.name} in ${activeCase.timeT1}`}
                  className="w-full h-full object-cover"
                  style={{ filter: getFilterStyleT1() }}
                />
              </div>
            </div>

            {/* Realistic Change-Detection Bounding Boxes (Section 6 requirement) */}
            {showBoundingBoxes && (
              <div className="absolute inset-0 pointer-events-none">
                {activeCaseId === 'urban-coastal' ? (
                  <>
                    <div className="absolute top-[38%] left-[58%] w-36 h-28 border-2 border-cyan-400 bg-cyan-500/10 rounded-sm">
                      <div className="absolute -top-6 left-0 bg-slate-950/90 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                        Terminal Berth Expansion (+3.4 km²)
                      </div>
                    </div>
                    <div className="absolute bottom-[22%] left-[42%] w-44 h-24 border-2 border-amber-400 bg-amber-500/10 rounded-sm">
                      <div className="absolute -top-6 left-0 bg-slate-950/90 text-amber-300 border border-amber-500/50 text-[10px] font-mono px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                        Reclaimed Mudflat Basin (-1.9 km² Mangrove)
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-[28%] left-[32%] w-48 h-32 border-2 border-rose-500 bg-rose-500/10 rounded-sm">
                      <div className="absolute -top-6 left-0 bg-slate-950/90 text-rose-300 border border-rose-500/50 text-[10px] font-mono px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                        Canopy Clear-cut Scar (-18.4 km²)
                      </div>
                    </div>
                    <div className="absolute bottom-[35%] right-[24%] w-32 h-20 border-2 border-cyan-400 bg-cyan-500/10 rounded-sm">
                      <div className="absolute -top-6 left-0 bg-slate-950/90 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                        Access Road Penetration (14.2 km)
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Split Curtain Line & Grab Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 cursor-ew-resize z-20 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center shadow-xl">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Bottom-left: T₁ BASELINE: March 2018 */}
            <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
              <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-200 shadow-xl">
                <span className="text-cyan-400 font-bold">T₁ BASELINE:</span> March 2018
              </div>
            </div>

            {/* Bottom-right: T₂ CURRENT: January 2024 */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
              <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-200 shadow-xl">
                <span className="text-emerald-400 font-bold">T₂ CURRENT:</span> January 2024
              </div>
            </div>

            {/* Center Top Instruction */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-3 py-1 rounded-full text-[11px] font-mono text-slate-300 flex items-center gap-2">
                <span>DRAG SLIDER TO REVEAL TEMPORAL DELTA</span>
                <span className="text-cyan-400 font-bold">({sliderPosition.toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 7: ANALYTICS CARDS
              Under the satellite comparison viewport
          ======================================================== */}
          <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              
              {/* CARD 1: NET FOOTPRINT DELTA */}
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl font-mono">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">NET FOOTPRINT DELTA</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1.5">+14.82 km²</div>
                <div className="text-[11px] text-slate-500 mt-1">2018 → 2024 (6-Year Window)</div>
              </div>

              {/* CARD 2: SPECTRAL DRIFT */}
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl font-mono">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">SPECTRAL DRIFT</div>
                <div className="text-2xl font-bold text-white mt-1.5">ΔNDVI -0.284</div>
                <div className="text-[11px] text-slate-500 mt-1">Vegetation &amp; Canopy Loss</div>
              </div>

              {/* CARD 3: MODEL CONFIDENCE */}
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl font-mono">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">MODEL CONFIDENCE</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1.5">97.4%</div>
                <div className="text-[11px] text-slate-500 mt-1">SCD-Former Verification</div>
              </div>

              {/* CARD 4: SENSOR RESOLUTION */}
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl font-mono">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">SENSOR RESOLUTION</div>
                <div className="text-2xl font-bold text-white mt-1.5">10m / 0.28m</div>
                <div className="text-[11px] text-slate-500 mt-1">Sentinel-2 MSI / Cartosat-3</div>
              </div>

            </div>

            {/* ========================================================
                SECTION 8: SEMANTIC SEARCH
                Below the satellite interface
            ======================================================== */}
            <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-4 sm:p-5 shadow-lg">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>SEMANTIC RETRIEVAL CONSOLE · NATURAL LANGUAGE QUERY VECTOR</span>
              </div>

              <form onSubmit={handleRunLocalQuery} className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder='Test semantic search within this AOI (e.g. "Identify logistics container docks built after 2020")...'
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-display font-bold text-xs tracking-wider uppercase rounded-xl shadow-md shadow-cyan-500/20 whitespace-nowrap active:scale-95 transition-all"
                >
                  LOCATE SEMANTIC VECTOR
                </button>
              </form>

              {queryFeedback && (
                <div className="mt-3 p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{queryFeedback}</span>
                </div>
              )}

              {/* Detected Features Tag List */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Classified Semantic Features:</span>
                {activeCase.featuresDetected.map((feat, idx) => (
                  <span
                    key={idx}
                    className="text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
