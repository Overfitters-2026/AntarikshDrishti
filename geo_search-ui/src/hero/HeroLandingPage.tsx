/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import './index.css';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProblemSection } from './components/ProblemSection';
import { SolutionSection } from './components/SolutionSection';
import { WorkflowSection } from './components/WorkflowSection';
import { TeamSection } from './components/TeamSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { SpecsModal } from './components/SpecsModal';

interface HeroLandingPageProps {
  onOpenConsole: () => void;
}

export default function HeroLandingPage({ onOpenConsole }: HeroLandingPageProps) {
  const [isSpecsOpen, setIsSpecsOpen] = useState<boolean>(false);

  const handleScrollToSolution = () => {
    const el = document.getElementById('solution');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Precision Top Navigation */}
      <Navbar
        onOpenDemo={onOpenConsole}
        onOpenSpecs={() => setIsSpecsOpen(true)}
      />

      {/* Main Content Sections */}
      <main>
        {/* Section 1 & 2: Main 100vh Hero with 60-70% Earth & Exact Required Copy */}
        <Hero
          onNavigateApp={onOpenConsole}
          onExploreSolution={handleScrollToSolution}
        />

        {/* Section 3: Problem Statement (SIH PS 227) */}
        <ProblemSection />

        {/* Section 4: Solution Architecture (Geo-CLIP + SCD-Former) */}
        <SolutionSection />

        {/* Section 5: Workflow Pipeline (How It Works) */}
        <WorkflowSection />

        {/* Section 6: Team / Developers */}
        <TeamSection />

        {/* Section 7: Evaluation Inquiries / Contact */}
        <ContactSection onNavigateApp={onOpenConsole} />
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
