/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProblemSection } from './components/ProblemSection';
import { SolutionSection } from './components/SolutionSection';
import { WorkflowSection } from './components/WorkflowSection';
import { TeamSection } from './components/TeamSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { SpecsModal } from './components/SpecsModal';
import { AppWorkspace } from './components/AppWorkspace';

export default function App() {
  const [isSpecsOpen, setIsSpecsOpen] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToSolution = () => {
    const el = document.getElementById('solution');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToDemo = () => {
    const el = document.getElementById('demo');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const openMainTool = () => {
    window.location.href = 'http://localhost:5174/';
  };

  // If on /app route, render the Antariksh Drishti App Console
  if (currentPath === '/app') {
    return <AppWorkspace onBackToLanding={() => navigateTo('/')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Precision Top Navigation */}
      <Navbar
        onOpenDemo={openMainTool}
        onOpenSpecs={() => setIsSpecsOpen(true)}
      />

      {/* Main Content Sections */}
      <main>
        {/* Section 1 & 2: Main 100vh Hero with 60-70% Earth & Exact Required Copy */}
        <Hero
          onNavigateApp={openMainTool}
          onExploreSolution={handleScrollToSolution}
        />

        {/* Section 3: Problem Statement (SIH PS 227) */}
        <ProblemSection />

        {/* Section 4: Solution Architecture (Geo-CLIP + SCD-Former) */}
        <SolutionSection />

        {/* Section 5: Workflow Pipeline (How It Works) */}
        <WorkflowSection />

        {/* Section 7: Team / Developers */}
        <TeamSection />

        {/* Section 8: Evaluation Inquiries / Contact */}
        <ContactSection onNavigateApp={openMainTool} />
      </main>

      {/* Footer */}
      <Footer />

      {/* SIH-227 Official Specification Modal */}
      <SpecsModal
        isOpen={isSpecsOpen}
        onClose={() => setIsSpecsOpen(false)}
      />
    </div>
  );
}
