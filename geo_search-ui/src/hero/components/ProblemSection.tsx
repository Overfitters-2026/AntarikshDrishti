import React from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  SearchSlash, 
  Clock, 
  Layers, 
  UserCheck, 
  ArrowRight,
  Satellite,
  Compass,
  MapPin,
  Scan,
  Sun,
  CloudRain,
  ShieldAlert,
  AlertTriangle,
  ServerOff
} from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const problemCards = [
    {
      number: '01',
      title: 'EXPONENTIAL ARCHIVE GROWTH',
      tagline: 'Manual Review is Mathematically Impossible',
      summary: 'Satellite archives are growing so fast that manual human review has become an impossible operational task.',
      detail: 'Daily optical and radar constellations ingest hundreds of gigabytes of imagery per pass. An intelligence unit tracking hundreds of kilometers of frontier territory cannot manually inspect every tile before the next pass arrives.',
      icon: Database,
      telemetryHint: 'PETABYTE ARCHIVE FLOOD'
    },
    {
      number: '02',
      title: 'THE COORDINATE PARADOX',
      tagline: 'Search Assumes You Already Found It',
      summary: 'Current search methods force coordinates, dates, or sensors—none of which describes what is in the image.',
      detail: 'Right now, an analyst has to know exactly where to look before they can find anything useful. The search tool should help locate the target facility (e.g. "newly built structures near a riverbank"), not just assume you already know the coordinates.',
      icon: SearchSlash,
      telemetryHint: 'METADATA-ONLY BLINDSPOT'
    },
    {
      number: '03',
      title: 'SEASONAL PHENOLOGY SHIFTS',
      tagline: 'December vs. June Divergence',
      summary: 'A landscape naturally looks different in December than in June due to seasonal changes that have nothing to do with human activity.',
      detail: 'Cyclic vegetation bloom, harvesting cycles, and seasonal riverbed drying create massive pixel divergence between observation passes, leading naïve comparison algorithms to falsely flag hundreds of benign agricultural changes.',
      icon: Clock,
      telemetryHint: 'SEASONAL NOISE RISK'
    },
    {
      number: '04',
      title: 'ORBITAL LIGHTING & SHIFTING SHADOWS',
      tagline: 'Solar Zenith Angle Artifacts',
      summary: 'Shifting lighting and shadows, depending on when the satellite passes overhead, create false pixel differences.',
      detail: 'Differences in sun elevation between passes cast longer or shifted shadows across mountain ridgelines, urban towers, and tree lines. Raw pixel subtraction mistakes these illumination artifacts for physical ground change.',
      icon: Sun,
      telemetryHint: 'ILLUMINATION MISMATCH'
    },
    {
      number: '05',
      title: 'ATMOSPHERIC CONTAMINATION',
      tagline: 'Haze, Thin Clouds & Off-Nadir Angles',
      summary: 'Haze, thin cirrus, snow, or slight viewing angle variations make a scene look different even when nothing changed.',
      detail: 'Atmospheric moisture and off-nadir orbital perspectives distort surface reflectance values. Without automated radiometric screening, ephemeral cloud edges and haze boundaries trigger false positive alerts.',
      icon: CloudRain,
      telemetryHint: 'ATMOSPHERIC INTERFERENCE'
    },
    {
      number: '06',
      title: 'THE NOISE TRAP & SOVEREIGN MANDATE',
      tagline: 'Distrusted Alerts & Air-Gapped Need',
      summary: 'A tool that flags every pixel difference creates noise; once analysts lose trust, they revert to manual inspection.',
      detail: 'Defense applications demand 100% on-premises execution with zero cloud APIs, plus incremental ingestion without full system rebuilds. The system must tell an analyst in plain language what changed, where, and why it can be trusted.',
      icon: ServerOff,
      telemetryHint: 'ON-PREMISES DEFENSE NEED'
    }
  ];

  const handleScrollToSolution = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('solution');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="problem" className="relative py-24 sm:py-32 bg-[#030712] border-t border-slate-800/80 overflow-hidden select-none">
      {/* Background Reticle Grid & Radial Ambient Glow */}
      <div className="absolute inset-0 reticle-grid opacity-15 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[700px] h-[350px] bg-cyan-950/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================
            TOP TWO-COLUMN HERO COMPONENT OF THE PROBLEM
            LEFT: Storytelling & Problem Narrative
            RIGHT: Large Real Satellite Image with Technical HUD
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center mb-16 sm:mb-20">
          
          {/* LEFT SIDE: Heading, Subhead, Body & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-center space-y-5"
          >
            {/* Small Label */}
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>THE OPERATIONAL RECONNAISSANCE BOTTLENECK</span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-[1.08] text-balance">
              SEARCHING SATELLITE ARCHIVES SHOULD NOT REQUIRE ALREADY KNOWING WHERE TO LOOK
            </h2>

            {/* Body */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-xl">
              Satellite archives are expanding at unprecedented rates. Current search tools force defense analysts to specify exact coordinates, dates, or sensors—none of which describes what is actually on the ground. When comparing passes over time, seasonal phenology (December vs. June), shifting shadows, and atmospheric haze trigger millions of spurious pixel changes.
            </p>

            {/* Core Insight Callout */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-xs font-mono text-cyan-300">
              <span className="font-bold text-white uppercase block mb-1">THE REAL CHALLENGE:</span>
              It is not just detecting pixel differences—it is telling an analyst, in plain language, what changed, where it happened, and exactly how much they can trust that finding.
            </div>

            {/* CTA */}
            <div className="pt-2">
              <a
                href="#solution"
                onClick={handleScrollToSolution}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50 text-xs font-mono tracking-wider uppercase transition-all duration-200 group shadow-lg"
              >
                <span>Explore Solution Architecture</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>

          {/* RIGHT SIDE: Large Real Satellite Image with Technical HUD Overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-[0_0_40px_rgba(6,182,212,0.15)] group">
              
              {/* Header Ribbon */}
              <div className="bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-semibold">OBSERVATION ARCHIVE TILE · INDIA</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 text-[11px]">SCENE ID: S2B_MSIL2A_20241217T053229</span>
                </div>
                <div className="text-[11px] text-cyan-400 font-semibold hidden sm:block">
                  BAND B04-B03-B02
                </div>
              </div>

              {/* Satellite Image Frame */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-950">
                <img
                  src="/assets/images/earth_studio_orbit_india_1790759562196.jpg"
                  alt="Satellite Observation Scene over India"
                  className="w-full h-full object-cover object-center filter contrast-[1.12] brightness-[0.95]"
                />

                {/* Subtle Reticle Graticule */}
                <div className="absolute inset-0 reticle-grid opacity-25 pointer-events-none" />

                {/* Corner Precision Alignment Markers */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

                {/* Center Geospatial Marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-6 h-6 rounded-full border border-cyan-400/80 animate-ping opacity-60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Top-Right Technical HUD Overlay */}
                <div className="absolute top-4 right-4 p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-[11px] font-mono text-slate-300 space-y-1 shadow-2xl pointer-events-none">
                  <div className="text-cyan-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b border-slate-800 pb-1">
                    <Scan className="w-3 h-3 text-cyan-400" />
                    <span>SENTINEL-2</span>
                  </div>
                  <div>
                    <span className="text-slate-400">RESOLUTION: </span>
                    <span className="text-white font-semibold">10m RESOLUTION</span>
                  </div>
                  <div>
                    <span className="text-slate-400">ACQUISITION: </span>
                    <span className="text-emerald-400 font-semibold">2024-12-17</span>
                  </div>
                  <div>
                    <span className="text-slate-400">LAT: </span>
                    <span className="text-cyan-300 font-semibold">19.0874° N</span>
                  </div>
                  <div>
                    <span className="text-slate-400">LON: </span>
                    <span className="text-cyan-300 font-semibold">72.8653° E</span>
                  </div>
                </div>

                {/* Bottom Footprint Telemetry Banner */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>SWATH: 290 KM · PASS: DESCENDING 10:30 UTC</span>
                  </div>
                  <span className="text-cyan-400 font-semibold hidden sm:inline">OFFLINE STAGED LOCAL DATASET</span>
                </div>

              </div>

            </div>
          </motion.div>

        </div>

        {/* ========================================================
            SIX DETAILED PRACTICAL RECONNAISSANCE PROBLEMS
        ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-16">
          {problemCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative p-6 sm:p-7 rounded-2xl bg-[#040711]/90 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-500 group-hover:text-cyan-400/80 transition-colors">
                  {card.telemetryHint}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/40 group-hover:scale-105 transition-all">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
                        {card.number} — {card.title}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {card.tagline}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-semibold text-white mb-2 leading-snug group-hover:text-cyan-200 transition-colors">
                    {card.summary}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans mb-4">
                    {card.detail}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>PROBLEM VECTOR #{card.number}</span>
                  <span className="text-cyan-400/70 group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                    <span>Solved in Drishti</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Defense Air-Gapped Trust Mandate Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-950 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0 mt-1">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
                <span>Operational Mandate</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">100% Offline, On-Premises &amp; Incremental Ingestion</span>
              </div>
              <h4 className="text-base sm:text-lg font-display font-bold text-white">
                Eliminating noise so analysts never have to retreat to manual inspection.
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed pt-1">
                For defense applications, the system must run entirely on-premises without relying on external cloud APIs, ingesting new satellite imagery incrementally without requiring a full database rebuild. Once staged locally, Antariksh Drishti executes on a single consumer laptop with zero internet connection required.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <a
              href="#solution"
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50 text-xs font-mono tracking-wider uppercase transition-all duration-200 flex items-center gap-2 whitespace-nowrap shadow-lg"
            >
              <span>View The 8-Stage Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
