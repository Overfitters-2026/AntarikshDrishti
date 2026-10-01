import React from 'react';
import { Satellite, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#02050e] border-t border-white/[0.08] py-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Brand Identity & Problem Statement */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span className="font-display font-bold text-white tracking-wider text-sm">
                ANTARIKSH DRISHTI
              </span>
            </div>
            <span className="hidden sm:inline text-slate-600">/</span>
            <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">
              SIH — PROBLEM STATEMENT 227
            </span>
          </div>

          {/* Minimal Navigation Links */}
          <nav className="flex items-center gap-6 sm:gap-8 font-mono text-xs text-slate-400">
            <a
              href="#problem"
              className="hover:text-cyan-400 transition-colors"
            >
              Problem
            </a>
            <a
              href="#solution"
              className="hover:text-cyan-400 transition-colors"
            >
              Solution
            </a>
            <a
              href="#team"
              className="hover:text-cyan-400 transition-colors"
            >
              Developers
            </a>
            <a
              href="#contact"
              className="hover:text-cyan-400 transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Return to Orbit / Top */}
          <div className="flex items-center gap-3">
            <button
              onClick={scrollToTop}
              aria-label="Scroll back to top of orbital track"
              className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-mono text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
            >
              <span>TOP</span>
              <ArrowUp className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Minimal Copyright Ribbon */}
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <span>Semantic Retrieval &amp; Multi-Temporal Change Analysis of Satellite Imagery</span>
          <span>ISRO &amp; MoES THEMATIC TRACK</span>
        </div>
      </div>
    </footer>
  );
};
