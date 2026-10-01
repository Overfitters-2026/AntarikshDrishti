import React, { useState } from 'react';
import { Search, ArrowRight, Layers, Cpu, ShieldCheck, Sparkles, SlidersHorizontal, MapPin } from 'lucide-react';
import { SEMANTIC_QUERY_PRESETS } from '../data/imageryData';

interface HeroOverlayProps {
  onExecuteQuery: (query: string, lat: number, lng: number) => void;
  onExploreDemo: () => void;
}

export const HeroOverlay: React.FC<HeroOverlayProps> = ({
  onExecuteQuery,
  onExploreDemo
}) => {
  const [activeQueryText, setActiveQueryText] = useState<string>(
    'Show coastal port development and reclaimed mangrove zones between 2018 and 2024'
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [searchSuccess, setSearchSuccess] = useState<boolean>(false);

  const handleRunSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    setSearchSuccess(false);

    // Simulate vector embedding computation
    setTimeout(() => {
      setIsProcessing(false);
      setSearchSuccess(true);
      const matched = SEMANTIC_QUERY_PRESETS.find(p => p.query === activeQueryText) || SEMANTIC_QUERY_PRESETS[0];
      onExecuteQuery(activeQueryText, matched.lat, matched.lng);
    }, 450);
  };

  const handleSelectPreset = (presetText: string) => {
    setActiveQueryText(presetText);
    const matched = SEMANTIC_QUERY_PRESETS.find(p => p.query === presetText);
    if (matched) {
      onExecuteQuery(presetText, matched.lat, matched.lng);
    }
  };

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Mission Title, SIH Identification, Value Proposition */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Hackathon PS Header */}
          <div className="flex items-center gap-2 mb-4 text-xs font-mono text-slate-400">
            <span className="text-cyan-400 font-semibold tracking-wider uppercase">Smart India Hackathon</span>
            <span className="text-slate-600">/</span>
            <span>Problem Statement 227</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">ISRO &amp; MoES Geospatial Challenge</span>
          </div>

          {/* Main Title & Devanagari Identity */}
          <div className="space-y-1 mb-6">
            <div className="text-xs font-mono tracking-widest text-cyan-400/90 uppercase">
              अन्तरिक्ष दृष्टि &nbsp;·&nbsp; Advanced Earth Observation Intelligence
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-[1.1] text-balance">
              ANTARIKSH <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">DRISHTI</span>
            </h1>
            <p className="text-lg sm:text-xl font-medium text-slate-300 pt-2 max-w-2xl leading-relaxed">
              Semantic Retrieval and Multi-Temporal Change Analysis of Satellite Imagery.
            </p>
          </div>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed mb-8">
            Query petabytes of Earth observation imagery using natural language. Antariksh Drishti bridges multimodal vision-language embeddings with Siamese deep change detection to localize infrastructure shifts, deforestation corridors, and environmental evolution at 10-meter resolution.
          </p>

          {/* Interactive Semantic Retrieval Prompt Console */}
          <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-xl p-3 sm:p-4 shadow-2xl max-w-2xl mb-6">
            <form onSubmit={handleRunSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={activeQueryText}
                  onChange={(e) => setActiveQueryText(e.target.value)}
                  placeholder="Enter natural language query (e.g. Find mangrove depletion...)"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-70"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Vectorizing...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Vector Query</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  </>
                )}
              </button>
            </form>

            {/* Presets */}
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                <span>Sample PS-227 Semantic Queries:</span>
                {searchSuccess && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Embedding match found (98.4% cosine similarity)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SEMANTIC_QUERY_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.query)}
                    className={`text-left text-xs px-2.5 py-1 rounded transition-colors ${
                      activeQueryText === p.query
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
                    }`}
                  >
                    {p.targetRegion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action Row */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onExploreDemo}
              className="px-6 py-3 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-white/5 active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Launch Change Analyzer</span>
            </button>
            <a
              href="#solution"
              className="px-5 py-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 border border-slate-800 hover:border-slate-700 font-medium text-sm transition-all flex items-center gap-2"
            >
              <span>Explore Architecture</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Right Column: Telemetry Specs HUD Card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Corner reticle brackets */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/50" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/50" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/50" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/50" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-semibold text-slate-200 tracking-wider uppercase">
                  Telemetry &amp; Engine Core
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                CALIBRATED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-5">
              <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Embedding Dim</div>
                <div className="text-2xl font-mono font-bold text-white mt-1">768-D</div>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">Geospatial Vision-Lang</div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Vector Latency</div>
                <div className="text-2xl font-mono font-bold text-white mt-1">42<span className="text-xs font-mono text-slate-400 ml-1">MS</span></div>
                <div className="text-[11px] font-mono text-emerald-400 mt-0.5">HNSW Spatio-Temporal</div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Co-Reg Accuracy</div>
                <div className="text-2xl font-mono font-bold text-white mt-1">&lt;0.35<span className="text-xs font-mono text-slate-400 ml-1">PX</span></div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">Sub-pixel Phase Corr</div>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Ground Resolution</div>
                <div className="text-2xl font-mono font-bold text-white mt-1">10<span className="text-xs font-mono text-slate-400 ml-1">M</span></div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">0.28m PAN Pan-sharpen</div>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-400 space-y-2 border-t border-slate-800/80 font-mono">
              <div className="flex items-center justify-between">
                <span>Ingestion Constellations:</span>
                <span className="text-slate-200 font-medium">Sentinel-2A/B, Cartosat-3, Landsat-9</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cross-Modal Backbone:</span>
                <span className="text-slate-200 font-medium">Geo-CLIP + SpaceText Transformer</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Differential Engine:</span>
                <span className="text-slate-200 font-medium">Siamese SCD-Former Attention</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
