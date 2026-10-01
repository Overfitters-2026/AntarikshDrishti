import React from 'react';
import { motion, MotionValue } from 'motion/react';
import { ArrowRight, ChevronRight, Scan, Satellite, Radio, Shield, CheckCircle2 } from 'lucide-react';

interface HeroContentProps {
  frame1Opacity: MotionValue<number>;
  frame1Y: MotionValue<number>;
  frame4Opacity: MotionValue<number>;
  frame4Y: MotionValue<number>;
  frame5Opacity: MotionValue<number>;
  frame5Y: MotionValue<number>;
  onNavigateApp?: () => void;
  onExploreSolution?: () => void;
}

export const HeroContent: React.FC<HeroContentProps> = ({
  frame1Opacity,
  frame1Y,
  frame4Opacity,
  frame4Y,
  frame5Opacity,
  frame5Y,
  onNavigateApp,
  onExploreSolution
}) => {
  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateApp) {
      onNavigateApp();
    } else {
      window.location.href = 'http://localhost:5174/';
    }
  };

  const handleScrollToProblem = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('problem');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between">
      {/* FRAME 1: INITIAL HERO VIEWPORT */}
      <motion.div
        style={{ opacity: frame1Opacity, y: frame1Y }}
        className="pt-24 sm:pt-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-mono text-cyan-400 tracking-[0.25em] uppercase mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>MINISTRY OF DEFENCE · INDIAN ARMY (DGIS)</span>
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-display font-extrabold text-white tracking-tight leading-[0.92] select-none text-balance">
          ANTARIKSH DRISHTI
        </h1>

        <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] sm:text-xs tracking-wider uppercase shadow-lg">
          <span className="font-bold text-white">TEAM OVERFITTER</span>
          <span className="text-slate-600">·</span>
          <span>SIH 2026</span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-400 font-semibold">PS SIH26227</span>
        </div>

        <p className="mt-4 max-w-2xl text-sm sm:text-base lg:text-lg text-slate-300 font-sans leading-relaxed text-balance">
          Sovereign, offline-first AI for satellite imagery search and change analysis. Natural language retrieval, learned false-alarm suppression, and complete audit provenance running entirely on consumer hardware.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 pointer-events-auto">
          <a
            href="http://localhost:5174/"
            onClick={handlePrimaryClick}
            className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:shadow-[0_0_36px_rgba(6,182,212,0.6)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4 text-slate-950" />
            <span>OPEN ANALYST CONSOLE</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </a>

          <a
            href="#problem"
            onClick={handleScrollToProblem}
            className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-cyan-500/40 text-xs font-mono tracking-wider uppercase transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Inspect Problem &amp; Architecture</span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
          </a>
        </div>

        {/* Operational Highlights Badges */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800">
            <Shield className="w-3 h-3 text-cyan-400" />
            100% Offline Runtime
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Precision-Over-Recall Gating
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800">
            <Satellite className="w-3 h-3 text-cyan-400" />
            Survey of India Geometries
          </span>
        </div>
      </motion.div>

      {/* FRAME 4: EARTH ON RIGHT, LEFT STORYTELLING */}
      <motion.div
        style={{ opacity: frame4Opacity, y: frame4Y }}
        className="absolute inset-0 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex items-center"
      >
        <div className="w-full lg:w-1/2 text-left space-y-4 pr-0 lg:pr-8">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider uppercase">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <span>THE REAL RECONNAISSANCE CHALLENGE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight leading-tight">
            SEARCH SHOULD HELP YOU FIND THE LOCATION, NOT ASSUME YOU ALREADY FOUND IT
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
            Satellite archives grow faster than human review can manage. Current search forces analysts to supply exact coordinates, timestamps, and sensor IDs—none of which describes what is actually on the ground. Antariksh Drishti maps plain-language intent into 512-D RemoteCLIP embeddings, surfacing target facilities across uncataloged terrain in milliseconds.
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Embedded Qdrant In-Process</span>
            </div>
            <span>|</span>
            <div>Zero Cloud Calls · Local Weights</div>
          </div>
        </div>
      </motion.div>

      {/* FRAME 5: DESCENT INTO TARGET REGION */}
      <motion.div
        style={{ opacity: frame5Opacity, y: frame5Y }}
        className="absolute inset-0 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex items-center justify-end"
      >
        <div className="w-full lg:w-1/2 text-right space-y-4 pl-0 lg:pl-8">
          <div className="flex items-center justify-end gap-2 text-xs font-mono text-cyan-400 tracking-wider uppercase">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>PRECISION OVER RECALL · VERIFIED GROUND TRUTH</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight leading-tight">
            FROM SATELLITE DRIFT TO TRUSTED INSIGHT
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
            A system that flags every pixel difference as change creates noise that analysts distrust. We decouple raw visual drift from learned confidence via histogram normalization and a 7-feature Random Forest, explaining exactly why an observation was confirmed or suppressed.
          </p>

          <div className="pt-2 text-xs font-mono text-cyan-400">
            TESTED ON CONSUMER HARDWARE · RYZEN 5 / RTX 3050 6GB
          </div>
        </div>
      </motion.div>

      {/* Bottom Scroll Indicator */}
      <div className="pb-8 text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        <span>ANTARIKSH DRISHTI · SOVEREIGN OFFLINE AI FOR SATELLITE INTELLIGENCE</span>
      </div>
    </div>
  );
};
