import React, { useEffect } from 'react';
import { 
  X, 
  Award, 
  FileCode, 
  CheckCircle, 
  Database, 
  Layers, 
  Cpu, 
  ArrowUpRight, 
  ShieldCheck, 
  Laptop, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  ExternalLink 
} from 'lucide-react';

interface SpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpecsModal: React.FC<SpecsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-slate-950 border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
                SMART INDIA HACKATHON 2026 · PS SIH26227
              </div>
              <h3 className="text-lg font-display font-bold text-white">
                ANTARIKSH DRISHTI · OFFICIAL DEFENCE SUBMISSION DOSSIER
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono text-slate-300">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">PROJECT CODENAME</span>
              <span className="text-cyan-300 font-bold text-sm">ANTARIKSH DRISHTI</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">TEAM IDENTITY</span>
              <span className="text-white font-bold">Team Overfitter (ID: 128900)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">TARGET MINISTRY</span>
              <span className="text-emerald-400 font-bold">Ministry of Defence, Indian Army (DGIS)</span>
            </div>
          </div>

          {/* Links Ribbon */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">OFFICIAL LINKS:</span>
            <a 
              href="https://antariksh-drishti.vercel.app" 
              target="_blank" 
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Live Web Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">|</span>
            <a 
              href="https://youtu.be/YgThi9Bg4AU?si=_p9UxIB1x_ffawRA" 
              target="_blank" 
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Video Demonstration</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">|</span>
            <a 
              href="https://github.com/Overfitters-2026/AntarikshDrishti" 
              target="_blank" 
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Source Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Mapping to the 6 Core Capabilities */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>MAPPING TO PROBLEM STATEMENT'S CORE CAPABILITIES</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-bold">1. Semantic Retrieval</span>
                <p className="text-[11px] text-slate-400 mt-1">Natural language query vectorization via RemoteCLIP ViT-B/32, compared via cosine similarity in an embedded Qdrant index. Ranked and deduplicated by deterministic tile IDs.</p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-bold">2. Multi-Temporal Change</span>
                <p className="text-[11px] text-slate-400 mt-1">Pairwise drift evaluation across consecutive dates plus full span fallback. Identifies earliest valid threshold crossing with explicit null reporting.</p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-bold">3. False-Alarm Suppression</span>
                <p className="text-[11px] text-slate-400 mt-1">Prioritizes precision over recall: cloud/shadow checks (&gt;15% suppresses interval), histogram matching for lighting normalization, and a 7-feature Random Forest model.</p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-bold">4. Discovery &amp; Clustering</span>
                <p className="text-[11px] text-slate-400 mt-1">K-means with 2D PCA projection over tile embeddings. Clusters automatically labeled against fixed land-cover descriptions with numeric similarity readouts.</p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-bold">5. Analyst Workflow &amp; Audit</span>
                <p className="text-[11px] text-slate-400 mt-1">Ranked review queue supporting Confirm, Reject, and Flag actions. Every action is timestamped and saved into an immutable local SQLite audit log.</p>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-bold">6. Offline &amp; Sovereignty Mandate</span>
                <p className="text-[11px] text-slate-400 mt-1">Zero cloud calls during execution. Verified with network interface physically disabled. Utilizes official Survey of India boundary cartography.</p>
              </div>
            </div>
          </div>

          {/* What We Actually Measured */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>WHAT WE ACTUALLY MEASURED (TEST HARNESS)</span>
            </div>

            <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
              <p>
                <strong>Demonstration Area:</strong> Mumbai, covering roughly 105 sq km at 10m resolution, using three cloud-screened Sentinel-2 dates: <strong>2023-12-08</strong>, <strong>2024-05-16</strong>, and <strong>2024-12-17</strong>.
              </p>
              <p>
                <strong>Date Selection Rigor:</strong> We reviewed all seven Sentinel-2 passes for June 2024 and found every pass had &gt;35% cloud contamination due to monsoon. To keep evaluation clean, we selected a pre-monsoon May pass with &lt;1% contamination.
              </p>
              <p>
                <strong>Hardware Benchmark:</strong> Standard laptop (AMD Ryzen 5 8645HS, NVIDIA RTX 3050 6GB VRAM, ~15GB DDR5 RAM). No cloud assistance or remote compute employed.
              </p>
            </div>
          </div>

          {/* What A Judge Could Live-Check */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>WHAT AN EVALUATION JUDGE CAN LIVE-CHECK</span>
            </div>

            <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-400">
              <li>Execute a natural-language search to verify returned tiles are semantically relevant, not merely geographically adjacent.</li>
              <li>Select a tile, trigger change detection, and observe raw drift, post-screening drift, and RF confidence as three distinct inspectable numbers.</li>
              <li>Select an interval with heavy cloud haze to confirm the system suppresses the result with an explicit explanation rather than guessing.</li>
              <li>Reject a candidate change, export its provenance record, and verify the rejection was permanently recorded in SQLite.</li>
              <li>Disconnect the network interface and execute the entire workflow offline.</li>
            </ul>
          </div>

          {/* Transparent Disclosures / What We Haven't Done Yet */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>TRANSPARENT TECHNICAL DISCLOSURES (WHAT IS NOT YET DONE)</span>
            </div>

            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1.5 text-[11px] text-amber-200/80">
              <p>• Demo is restricted to one urban region (Mumbai) using Sentinel-2 L2A optical rasters.</p>
              <p>• Random Forest model is trained on a hand-labeled demonstration dataset; large-scale independent validation is ongoing.</p>
              <p>• Detection operates at the tile level (256x256) rather than pixel level. Pixel localization via a lightweight Siamese network is a declared roadmap goal.</p>
              <p>• National scaling will require index sharding and scheduled batch embedding, which are planned for future phases.</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">ANTARIKSH DRISHTI · CONFIDENTIAL EVALUATION DOSSIER</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
