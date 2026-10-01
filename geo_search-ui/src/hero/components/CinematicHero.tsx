import React, { useRef } from 'react';
import { useEarthScroll } from '../hooks/useEarthScroll';
import { EarthScene } from './EarthScene';
import { EarthStudioTransition } from './EarthStudioTransition';
import { HeroContent } from './HeroContent';

interface CinematicHeroProps {
  onNavigateApp?: () => void;
  onExploreSolution?: () => void;
}

/**
 * Cinematic 320vh Hero Experience:
 * - Full-screen 3D Spherical Earth Globe (Three.js / React Three Fiber)
 * - Continuous, uninterrupted planetary rotation (completely independent of scroll)
 * - Photorealistic satellite surface texture (NASA-style day map)
 * - Subtle atmospheric Rayleigh limb scattering
 * - Smooth scroll-driven positioning and scaling
 * - Full-screen Google Earth Studio transition layer during late camera descent
 * - Precision geospatial text storytelling
 */
export const CinematicHero: React.FC<CinematicHeroProps> = ({
  onNavigateApp,
  onExploreSolution
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Hook managing scroll-driven scale, positions, and crossfades
  const {
    scrollProgress,
    earthScale,
    earthX,
    earthY,
    earthOpacity,
    studioTransitionOpacity,
    frame1Opacity,
    frame1Y,
    frame4Opacity,
    frame4Y,
    frame5Opacity,
    frame5Y
  } = useEarthScroll({
    targetRef: containerRef,
    offset: ['start start', 'end start']
  });

  return (
    <div
      ref={containerRef}
      id="hero"
      className="relative w-full h-[320vh] bg-[#030712]"
    >
      {/* Pinned 100vh Viewport Window */}
      <div className="sticky top-0 w-full h-screen min-h-[640px] max-h-[1100px] overflow-hidden select-none">
        
        {/* Background Subtle Space Ambient & Radial Vignette */}
        <div className="absolute inset-0 reticle-grid opacity-15 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#030712]/30 to-[#030712] pointer-events-none z-0" />

        {/* 
          1. REAL 3D SPHERICAL EARTH SCENE (THREE.JS / REACT THREE FIBER)
          - Occupies the full viewport (never a small rectangular box)
          - Continuous, uninterrupted eastward planetary rotation (independent of scroll)
          - Realistic sun lighting, photographic satellite texture, subtle atmosphere
        */}
        <EarthScene
          scaleValue={earthScale}
          xValue={earthX}
          yValue={earthY}
          opacityValue={earthOpacity}
        />

        {/* 
          2. FULL-SCREEN GOOGLE EARTH STUDIO SATELLITE TRANSITION
          - Crossfades smoothly during late-stage descent (scrollProgress > 0.82)
          - Seamless transition from planetary orbit to high-resolution India imagery
        */}
        <EarthStudioTransition
          opacity={studioTransitionOpacity}
        />

        {/* 
          3. PRECISION GEOSPATIAL STORYTELLING OVERLAYS
        */}
        <HeroContent
          frame1Opacity={frame1Opacity}
          frame1Y={frame1Y}
          frame4Opacity={frame4Opacity}
          frame4Y={frame4Y}
          frame5Opacity={frame5Opacity}
          frame5Y={frame5Y}
          onNavigateApp={onNavigateApp}
          onExploreSolution={onExploreSolution}
        />

      </div>
    </div>
  );
};
