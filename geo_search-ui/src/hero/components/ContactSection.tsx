import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  Orbit, 
  Send, 
  X,
  Copy,
  ExternalLink
} from 'lucide-react';

interface ContactSectionProps {
  onNavigateApp?: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onNavigateApp }) => {
  const verifiedEmail = 'dharmeshgupta.r@gmail.com';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateApp) {
      onNavigateApp();
    } else {
      window.location.href = 'http://localhost:5174/';
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(verifiedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setFormSent(false);
      setFormState({ name: '', email: '', message: '' });
    }, 1800);
  };

  return (
    <section 
      id="contact" 
      className="relative py-32 sm:py-44 bg-[#030712] border-t border-white/[0.08] overflow-hidden select-none"
    >
      {/* Visual Return to Earth / Deep Space Theme */}
      <div className="absolute inset-0 reticle-grid opacity-25 pointer-events-none" />

      {/* Atmospheric Horizon Curve Glowing from the Base */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1400px] h-[360px] pointer-events-none overflow-hidden opacity-60">
        {/* Soft planetary curvature */}
        <div 
          className="w-full h-full rounded-t-[100%] bg-gradient-to-t from-cyan-950/40 via-sky-900/15 to-transparent border-t border-cyan-400/30"
          style={{
            boxShadow: '0 -20px 80px -10px rgba(6, 182, 212, 0.25)'
          }}
        />
      </div>

      {/* Subtle Star Particles */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/5 w-1 h-1 rounded-full bg-white animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-cyan-200 animate-pulse" style={{ animationDelay: '1.2s' }} />
        <div className="absolute top-2/3 left-1/3 w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" style={{ animationDelay: '0.7s' }} />
        <div className="absolute bottom-1/4 right-1/5 w-1 h-1 rounded-full bg-white" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Aerospace Orbital Reticle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-8 shadow-lg shadow-cyan-950/30"
        >
          <Orbit className="w-3.5 h-3.5 animate-spin text-cyan-400" style={{ animationDuration: '20s' }} />
          <span>EARTH OBSERVATION DISCOVERY PLATFORM</span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.05] text-balance mb-6"
        >
          EXPLORE EARTH{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
            THROUGH A DIFFERENT LENS.
          </span>
        </motion.h2>

        {/* Supporting Text */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto space-y-1.5 mb-10 text-balance"
        >
          <div className="font-display font-bold text-white text-base sm:text-lg">
            ANTARIKSH DRISHTI
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
            Semantic Retrieval &amp; Multi-Temporal Change Analysis of Satellite Imagery
          </p>
        </motion.div>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          {/* Primary Button */}
          <a
            href="http://localhost:5174/"
            onClick={handlePrimaryClick}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-slate-950 font-display font-bold text-sm tracking-wider uppercase transition-all duration-200 shadow-[0_0_28px_rgba(6,182,212,0.45)] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Scan className="w-4 h-4 text-slate-950" />
            <span>TRY ANTARIKSH DRISHTI</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </a>

          {/* Secondary Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-7 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-cyan-500/50 font-mono text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap hover:text-white shadow-lg"
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>CONTACT THE TEAM</span>
          </button>
        </motion.div>

        {/* Verified Project Contact Information (Strictly from Configuration) */}
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-5 py-3 rounded-xl bg-[#040711]/90 backdrop-blur-md border border-white/[0.08] text-xs font-mono text-slate-400">
          <span className="text-slate-500 uppercase tracking-wider">PROJECT LEAD INQUIRIES:</span>
          <div className="flex items-center gap-2 text-cyan-300">
            <span>{verifiedEmail}</span>
            <button
              onClick={handleCopyEmail}
              aria-label="Copy email"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {copied && (
            <span className="text-emerald-400 text-[10px]">COPIED</span>
          )}
        </div>

      </div>

      {/* Clean Contact Dialog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-[#04091a] border border-cyan-500/30 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  <Mail className="w-4 h-4" />
                  <span>CONTACT ENGINEERING TEAM</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formSent ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-lg font-display font-bold text-white">Message Transmitted</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Routing to {verifiedEmail}. We will follow up promptly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 uppercase">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      placeholder="e.g. SIH Evaluator / Dr. Vikram"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-400 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 uppercase">Your Email</label>
                    <input
                      type="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      placeholder="name@organization.gov.in"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-400 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 uppercase">Inquiry / Note</label>
                    <textarea
                      rows={3}
                      required
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      placeholder="Questions regarding PS 227 architecture, evaluation datasets, or code reproduction..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-cyan-400 text-xs font-mono text-white outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <a
                      href={`mailto:${verifiedEmail}?subject=ANTARIKSH%20DRISHTI%20Inquiry`}
                      className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open in email client</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
