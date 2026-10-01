import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Satellite, 
  ArrowLeftRight, 
  Activity, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Maximize2, 
  Sliders, 
  Clock, 
  Search, 
  Sparkles, 
  Filter, 
  Compass, 
  Scan, 
  ShieldCheck, 
  ChevronRight, 
  Radio, 
  Check, 
  X, 
  AlertCircle, 
  Laptop, 
  Terminal, 
  Cpu, 
  FileText, 
  BookOpen, 
  HelpCircle 
} from 'lucide-react';

type SpectralTab = 'true-color' | 'false-color-ir' | 'ndvi' | 'ndbi' | 'ndwi' | 'diff-heatmap';

export const SolutionSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SpectralTab>('true-color');
  const [activeStage, setActiveStage] = useState<number>(0);

  // Spectral filter presets to accurately emulate satellite band composites
  const getFilterStyle = (tab: SpectralTab, isT2: boolean = false) => {
    switch (tab) {
      case 'false-color-ir':
        return 'hue-rotate(95deg) saturate(1.85) contrast(1.15)';
      case 'ndvi':
        return 'contrast(1.4) saturate(2.2) brightness(0.92) hue-rotate(-20deg)';
      case 'ndbi':
        return 'contrast(1.5) saturate(0.6) brightness(1.05) hue-rotate(180deg)';
      case 'ndwi':
        return 'contrast(1.4) saturate(2.4) hue-rotate(200deg)';
      case 'diff-heatmap':
        return isT2
          ? 'contrast(1.6) saturate(2.0) hue-rotate(45deg)'
          : 'contrast(1.1) brightness(0.9)';
      case 'true-color':
      default:
        return 'contrast(1.1) brightness(0.98) saturate(1.05)';
    }
  };

  const spectralTabs: { id: SpectralTab; label: string; tag: string }[] = [
    { id: 'true-color', label: 'True Color', tag: 'B04, B03, B02' },
    { id: 'false-color-ir', label: 'False Color IR', tag: 'B08, B04, B03' },
    { id: 'ndvi', label: 'NDVI', tag: '(B08-B04)/(B08+B04)' },
    { id: 'ndbi', label: 'NDBI', tag: '(B11-B08)/(B11+B08)' },
    { id: 'ndwi', label: 'NDWI', tag: '(B03-B08)/(B03+B08)' },
    { id: 'diff-heatmap', label: 'Difference Heatmap', tag: 'Pixel Drift Δ' },
  ];

  const whatWeBuiltPoints = [
    {
      title: 'Semantic Query Retrieval',
      desc: 'Allows analysts to enter plain language queries ("newly built structures near a river") and receive matching tiles based on visual meaning rather than rigid coordinate boxes.',
      tag: 'RemoteCLIP + Qdrant'
    },
    {
      title: 'Noise-Decoupled Change Detection',
      desc: 'Separates physical ground truth transitions from seasonal phenology (Dec vs Jun) and illumination angles through histogram matching and learned feature gating.',
      tag: 'Histogram Matching'
    },
    {
      title: 'Total Factor Transparency',
      desc: 'If the system reports a 24% confidence level, the analyst inspects the exact seven features, cloud contamination, and seasonal weights that produced that number.',
      tag: 'Explainable Gating'
    },
    {
      title: 'Structured Review Workflow',
      desc: 'Every action (Confirm, Reject, Flag) is timestamped and written into a persistent local SQLite audit log that is never overwritten, exportable as a provenance record.',
      tag: 'SQLite Audit Trail'
    },
    {
      title: '100% Offline Architecture',
      desc: 'Once imagery is staged locally, the entire runtime executes on a single consumer laptop with zero internet connection or third-party cloud API dependencies.',
      tag: 'Air-Gapped Sovereign'
    },
    {
      title: 'Precision-Over-Recall Discipline',
      desc: 'Quality screening happens first, raw drift second, and learned Random Forest confidence third. Spurious alerts are suppressed before reaching the analyst.',
      tag: 'High Signal-to-Noise'
    }
  ];

  const pipelineStages = [
    {
      step: '01',
      title: 'ANALYST INPUT MODALITY',
      tag: 'Multi-Modal Entry',
      summary: 'Analyst enters a plain language query, uploads an image crop, or selects a map AOI.',
      detail: 'The interface accepts natural language ("airport runway tarmac expansion"), visual image patches for spatial similarity search, or geographic filters without assuming prior knowledge of coordinates.',
      tech: 'FastAPI / React / Leaflet'
    },
    {
      step: '02',
      title: 'SEMANTIC SEARCH ENGINE',
      tag: 'Zero Cloud Calls',
      summary: 'RemoteCLIP converts queries into 512-D vectors, searched against embedded Qdrant.',
      detail: 'All weights load locally from disk via open_clip. Text and image queries map into the same 512-D space. Results are rank-ordered and deduplicated by deterministic tile IDs.',
      tech: 'RemoteCLIP ViT-B/32 + Qdrant Embedded'
    },
    {
      step: '03',
      title: 'INGESTION & DETERMINISTIC TILING',
      tag: 'Safe Incremental Updates',
      summary: 'Sentinel-2 scenes partitioned into 256x256 tiles with deterministic hashing.',
      detail: 'Each tile receives an invariant ID so that re-ingesting a scene updates existing data rather than creating duplicates. Metadata is stored in a local SQLite catalog.',
      tech: 'Rasterio / GDAL / SQLite'
    },
    {
      step: '04',
      title: 'FOUR-STEP CHANGE DETECTION',
      tag: 'Noise Elimination',
      summary: 'Cloud check > Histogram matching > RemoteCLIP drift > Random Forest.',
      detail: '1) Cloud/shadow check: if contamination > 15%, interval is suppressed with explicit reason. 2) Histogram matching normalizes lighting/seasons. 3) RemoteCLIP drift: 1 - cosine similarity. 4) Random Forest confidence scoring.',
      tech: '4-Step Sequential Pipeline'
    },
    {
      step: '05',
      title: 'MULTI-DATE EVALUATION',
      tag: 'Earliest Observation Logic',
      summary: 'Consecutive pairs + full span evaluated with transparent null handling.',
      detail: 'For three or more dates, every consecutive pair is evaluated individually, along with the full span as fallback. The earliest unsuppressed threshold crossing is reported. If nothing meets criteria, reports "no change detected within confidence threshold".',
      tech: 'Pairwise Temporal Traversal'
    },
    {
      step: '06',
      title: 'EVIDENCE PANEL & SPECTRAL INDICES',
      tag: 'Deterministic Summaries',
      summary: 'Full comparison suite with fixed, auditable threshold text descriptions.',
      detail: 'Provides True Color, False Color IR, NDVI, NDBI, NDWI, and difference heatmap. Summaries use deterministic thresholds (e.g. NDVI change < 0.1 is always "no significant vegetation change"), avoiding hallucinatory text.',
      tech: 'Multispectral Band Math'
    },
    {
      step: '07',
      title: 'REVIEW QUEUE & PROVENANCE EXPORT',
      tag: 'Full Decision Provenance',
      summary: 'Ranked queue with confirm/reject/flag actions logged into SQLite.',
      detail: 'Detections that pass screening enter a review queue. Analysts confirm, reject, or flag entries. Exportable provenance records include source scene paths, 7 RF feature values, confidence, spectral metrics, and analyst remarks.',
      tech: 'Local SQLite Audit Log'
    }
  ];

  return (
    <section id="solution" className="relative py-24 sm:py-32 bg-[#030712] border-t border-slate-800/80 overflow-hidden select-none">
      {/* Background Reticle Grid */}
      <div className="absolute inset-0 reticle-grid opacity-15 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[850px] h-[380px] bg-cyan-950/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-12 sm:mb-16"
        >
          <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400 tracking-widest uppercase mb-3">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>SOVEREIGN OFFLINE-FIRST AI · SIH 2026 PS SIH26227</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-[1.08] text-balance">
            ANTARIKSH DRISHTI
          </h2>

          <p className="mt-2 text-xl sm:text-2xl font-display font-semibold text-cyan-300/90 leading-snug">
            WHAT WE BUILT &amp; HOW THE PIPELINE ACTUALLY WORKS
          </p>

          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-2xl">
            A fully functioning, transparent intelligence pipeline designed for the Ministry of Defence and Indian Army (DGIS). Built to separate genuine physical alterations from seasonal and atmospheric noise, running 100% offline on a single laptop.
          </p>
        </motion.div>

        {/* ========================================================
            WHAT WE BUILT — SIX CORE PILLARS
        ======================================================== */}
        <div className="mb-16">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-widest uppercase mb-5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>CORE ARCHITECTURAL PILLARS (WHAT WE BUILT)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {whatWeBuiltPoints.map((pt, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#040711]/90 border border-white/[0.08] hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      0{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {pt.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-display font-bold text-white mb-2">
                    {pt.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {pt.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            MAIN SOLUTION VISUAL:
            MULTI-SPECTRAL CHANGE DECOMPOSITION WORKSPACE
        ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-cyan-500/30 bg-[#040711]/95 backdrop-blur-xl shadow-[0_0_50px_rgba(6,182,212,0.18)] overflow-hidden mb-16"
        >
          
          {/* Top Metadata Header Panel */}
          <div className="p-4 sm:p-6 bg-slate-950/90 border-b border-cyan-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                <span>MULTI-SPECTRAL CHANGE DECOMPOSITION</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300">6-BAND SENTINEL-2 (REAL B02-B11)</span>
              </div>

              <div className="text-xs sm:text-sm font-mono text-slate-200 flex flex-wrap items-center gap-1.5 font-bold">
                <span className="text-cyan-300">mumbai_2023-12-08_s2_r256_c256_2023-12-08</span>
                <span className="text-slate-500">→</span>
                <span className="text-emerald-400">mumbai_2024-12-17_s2_r256_c256_2024-12-17</span>
              </div>
            </div>

            {/* Coordinates, Dates & Platform Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-slate-500">COORDINATES: </span>
                <span className="text-white font-semibold">19.0874° N, 72.8653° E</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <span className="text-slate-500">OBSERVATION DATES: </span>
                <span className="text-cyan-300 font-semibold">2023-12-08 (T1) → 2024-12-17 (T2)</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-semibold">
                <span>SENSOR: Sentinel-2 MSI</span>
              </div>
            </div>
          </div>

          {/* Interactive Spectral Tabs Bar */}
          <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              {spectralTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[9px] text-slate-400 font-normal hidden md:inline">
                      ({tab.tag})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-mono text-slate-400 hidden lg:block whitespace-nowrap pl-2">
              ACTIVE FILTER: <span className="text-cyan-400 font-bold uppercase">{activeTab.replace('-', ' ')}</span>
            </div>
          </div>

          {/* Two-Panel Satellite Comparison Canvas */}
          <div className="p-4 sm:p-6 bg-slate-950/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 relative">
              
              {/* T1 BEFORE PANEL */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                {/* Header Tag */}
                <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-white font-bold">T1 BEFORE</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-300">2023-12-08</span>
                  </div>
                  <span className="text-[10px] text-slate-400">BASELINE SCENE</span>
                </div>

                {/* Satellite Imagery Viewport */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                  <img
                    src="/assets/images/sat_urban_2018_1790758135248.jpg"
                    alt="T1 Baseline Satellite Imagery"
                    className="w-full h-full object-cover transition-all duration-500"
                    style={{ filter: getFilterStyle(activeTab, false) }}
                  />

                  {/* Corner Target Marks */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

                  {/* Bottom Telemetry Chip */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300">
                    S2B · 10m · SUN ELEV: 48.2°
                  </div>
                </div>
              </div>

              {/* T2 AFTER PANEL */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                {/* Header Tag */}
                <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white font-bold">T2 AFTER</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-emerald-400">2024-12-17</span>
                  </div>
                  <span className="text-[10px] text-slate-400">SURVEILLANCE PASS</span>
                </div>

                {/* Satellite Imagery Viewport */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                  <img
                    src="/assets/images/sat_urban_2024_1790758146670.jpg"
                    alt="T2 Target Satellite Imagery"
                    className="w-full h-full object-cover transition-all duration-500"
                    style={{ filter: getFilterStyle(activeTab, true) }}
                  />

                  {/* Corner Target Marks */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400/80 pointer-events-none" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400/80 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400/80 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400/80 pointer-events-none" />

                  {/* Bottom Telemetry Chip */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300">
                    S2A · 10m · SUN ELEV: 49.1°
                  </div>
                </div>
              </div>

              {/* Central Divider Indicator */}
              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none items-center justify-center">
                <div className="px-2.5 py-1.5 rounded-full bg-slate-950/90 border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-[10px] font-mono text-cyan-300 font-bold flex items-center gap-1.5 whitespace-nowrap">
                  <span>←</span>
                  <span>TEMPORAL DELTA</span>
                  <span>→</span>
                </div>
              </div>

            </div>
          </div>

          {/* SPECTRAL CHANGE DECOMPOSITION INDICATORS */}
          <div className="p-4 sm:p-6 bg-slate-950/90 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>SPECTRAL CHANGE DECOMPOSITION (DETERMINISTIC THRESHOLD REPORTING)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* CARD 1: VEGETATION */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-emerald-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="font-bold text-white tracking-wide">VEGETATION</span>
                    <span className="text-emerald-400 font-bold font-mono">Δ +0.0050</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 mb-2">
                    T1: 0.1355 → T2: 0.1405
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    No significant vegetation change detected.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>STABLE CANOPY BIOMASS</span>
                </div>
              </div>

              {/* CARD 2: INFRASTRUCTURE */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="font-bold text-white tracking-wide">INFRASTRUCTURE</span>
                    <span className="text-cyan-400 font-bold font-mono">Δ -0.0302</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 mb-2">
                    T1: 0.0402 → T2: 0.0100
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Built-up index decreased slightly by 3.0% — minor surface alteration observed.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>SURFACE ALTERATION</span>
                </div>
              </div>

              {/* CARD 3: WATER */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-sky-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="font-bold text-white tracking-wide">WATER</span>
                    <span className="text-sky-400 font-bold font-mono">Δ -0.0120</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 mb-2">
                    T1: -0.1690 → T2: -0.1810
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    No significant water-extent change detected.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-sky-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>HYDROLOGICAL EQUILIBRIUM</span>
                </div>
              </div>

              {/* CARD 4: ATMOSPHERE */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-purple-500/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="font-bold text-white tracking-wide">ATMOSPHERE</span>
                    <span className="text-emerald-400 font-bold font-mono">0.0% CONTAM</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 mb-1">
                    Cloud &amp; Shadow Screening
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Cloud/shadow contamination: 0.0% (T1) → 0.0% (T2).
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>PASSES 15% SCREENING LIMIT</span>
                </div>
              </div>

            </div>
          </div>

        </motion.div>

        {/* ========================================================
            THE PIPELINE, STEP BY STEP (7 OPERATIONAL STAGES)
        ======================================================== */}
        <div className="mb-16">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-widest uppercase mb-6">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>THE 7-STAGE PIPELINE (STEP BY STEP)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {pipelineStages.map((st, idx) => {
              const isActive = activeStage === idx;
              return (
                <div
                  key={st.step}
                  onClick={() => setActiveStage(idx)}
                  className={`p-5 sm:p-6 rounded-2xl cursor-pointer transition-all duration-200 border flex flex-col justify-between group ${
                    isActive
                      ? 'bg-[#04091a] border-cyan-400/80 shadow-[0_0_24px_rgba(6,182,212,0.18)]'
                      : 'bg-[#040711]/90 border-white/[0.08] hover:border-cyan-500/40 hover:bg-slate-900/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          STAGE {st.step}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {st.tag}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-display font-bold text-white mb-2 group-hover:text-cyan-200 transition-colors">
                      {st.title}
                    </h3>

                    <p className="text-xs text-slate-300 font-sans mb-3 leading-snug font-medium">
                      {st.summary}
                    </p>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans mb-4">
                      {st.detail}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 text-[10px] font-mono text-cyan-400 flex items-center justify-between">
                    <span>{st.tech}</span>
                    <span className="text-slate-500 group-hover:text-white transition-colors flex items-center gap-1">
                      <span>Inspect</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
