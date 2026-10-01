import React from 'react';
import { ArrowLeft, Satellite, ExternalLink } from 'lucide-react';

interface AppWorkspaceProps {
  onBackToLanding: () => void;
}

export const AppWorkspace: React.FC<AppWorkspaceProps> = ({ onBackToLanding }) => {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col">
      {/* Top Workspace Header */}
      <header className="sticky top-0 z-50 bg-[#040711]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-2.5">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mission Landing</span>
            </button>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span className="font-display font-bold text-sm tracking-wide text-white">
                ANTARIKSH DRISHTI CONSOLE
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded ml-2">
                APP RUNTIME /v1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <a
              href="http://localhost:5174/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
            >
              <span>Dedicated Tab (5174)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Workspace Body - Live Tool */}
      <div className="flex-1 w-full relative">
        <iframe
          src="http://localhost:5174/"
          title="Antariksh Drishti Console"
          className="w-full h-[calc(100vh-53px)] border-0"
        />
      </div>
    </div>
  );
};
