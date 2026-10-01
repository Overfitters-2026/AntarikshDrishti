import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ArrowUpRight, Orbit, Compass, Scan, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenDemo: () => void;
  onOpenSpecs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo, onOpenSpecs }) => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll handler
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: 'About', targetId: 'hero' },
    { label: 'Problem', targetId: 'problem' },
    { label: 'Solution', targetId: 'solution' },
    { label: 'Developers', targetId: 'team' },
    { label: 'Contact', targetId: 'contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#040711]/85 backdrop-blur-md border-b border-white/[0.08] py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.6)]'
          : 'bg-transparent border-b border-transparent py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left Side: ANTARIKSH DRISHTI Logo with sophisticated typography & minimal satellite/orbit icon */}
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, 'hero')}
            className="flex items-center gap-3 group select-none cursor-pointer"
          >
            {/* Minimal satellite / orbit icon */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900/80 border border-cyan-500/30 group-hover:border-cyan-400/60 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              {/* Outer orbital trace */}
              <div className="absolute inset-0 rounded-lg border border-cyan-400/20 group-hover:rotate-45 transition-transform duration-700" />
              {/* Core satellite beacon */}
              <Orbit className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
            </div>

            {/* Typography lockup: ANTARIKSH (stronger) + DRISHTI (secondary) */}
            <div className="flex flex-col justify-center leading-none">
              <span className="font-display font-extrabold tracking-[0.18em] text-[15px] sm:text-base text-white group-hover:text-cyan-200 transition-colors">
                ANTARIKSH
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.32em] text-cyan-400/90 font-medium uppercase mt-0.5">
                DRISHTI
              </span>
            </div>
          </a>

          {/* Desktop Navigation: Right side */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6 lg:gap-8 text-xs font-mono tracking-wider text-slate-300">
              {navLinks.map((link) => (
                <a
                  key={link.targetId}
                  href={`#${link.targetId}`}
                  onClick={(e) => handleNavClick(e, link.targetId)}
                  className="relative py-1 text-slate-300 hover:text-white transition-colors duration-150 group"
                >
                  <span>{link.label}</span>
                  {/* Subtle aerospace hover underline indicator */}
                  <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-gradient-to-r from-cyan-400 to-transparent group-hover:w-full transition-all duration-200 ease-out" />
                </a>
              ))}
            </nav>

            {/* Primary CTA: "Try Antariksh Drishti" */}
            <div className="flex items-center pl-2">
              <button
                onClick={onOpenDemo}
                className="relative group px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-slate-950 font-semibold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_0_16px_rgba(6,182,212,0.3)] hover:shadow-[0_0_24px_rgba(6,182,212,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap"
              >
                <Scan className="w-3.5 h-3.5 text-slate-950 transition-transform group-hover:rotate-90 duration-300" />
                <span>Try Antariksh Drishti</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-950 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Mobile Right: Hamburger Menu Toggle Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Animated Drawer using Framer Motion */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden bg-[#040711]/95 backdrop-blur-xl border-b border-white/[0.08]"
          >
            <div className="max-w-7xl mx-auto px-4 pt-3 pb-6 space-y-4">
              {/* Telemetry ribbon inside mobile drawer */}
              <div className="flex items-center justify-between py-1 px-2 border-b border-slate-800/80 text-[10px] font-mono text-slate-400">
                <span className="text-cyan-400">SIH PS-227 COMMAND</span>
                <span>EARTH OBSERVATION</span>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col space-y-1">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.targetId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    href={`#${link.targetId}`}
                    onClick={(e) => handleNavClick(e, link.targetId)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg text-xs font-mono text-slate-200 hover:text-cyan-300 hover:bg-slate-900/60 transition-colors"
                  >
                    <span>{link.label}</span>
                    <span className="text-slate-600 text-[10px]">0{idx + 1}</span>
                  </motion.a>
                ))}
              </nav>

              {/* Mobile Primary CTA */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenDemo();
                  }}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.3)] active:scale-[0.98] transition-transform"
                >
                  <Scan className="w-4 h-4 text-slate-950" />
                  <span>Try Antariksh Drishti</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
