import React, { useRef, useEffect } from 'react';
import { motion, MotionValue } from 'motion/react';
import { EARTH_CONFIG } from '../config/earthConfig';
import { Satellite } from 'lucide-react';

interface EarthStudioTransitionProps {
  opacity: MotionValue<number>;
  videoSrc?: string;
  fallbackPoster?: string;
}

/**
 * Full-screen cinematic Google Earth Studio / Satellite transition layer.
 * Appears ONLY during the late-stage camera descent into India (never as a small box).
 * Seamlessly cross-fades with the 3D globe to transition from planetary orbit
 * to high-resolution Earth observation data.
 * Zero circular borders or thick outline rings.
 */
export const EarthStudioTransition: React.FC<EarthStudioTransitionProps> = ({
  opacity,
  videoSrc = EARTH_CONFIG.videoSrc,
  fallbackPoster = EARTH_CONFIG.fallbackPoster
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = React.useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video && !videoError) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback gracefully handled by poster / image
        });
      }
    }
  }, [videoSrc, videoError]);

  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden"
    >
      {/* Full-Screen Cinematic Earth Satellite Transition */}
      {!videoError ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={fallbackPoster}
          loop
          autoPlay
          muted
          playsInline
          preload="metadata"
          onError={() => setVideoError(true)}
          className="w-full h-full object-cover"
          style={{
            filter: 'contrast(1.15) saturate(1.1) brightness(0.94)'
          }}
        />
      ) : (
        <img
          src={fallbackPoster}
          alt="Target Acquisition: India Escarpment"
          className="w-full h-full object-cover scale-105 transition-transform duration-1000 ease-out"
          style={{
            filter: 'contrast(1.15) saturate(1.1) brightness(0.94)'
          }}
        />
      )}

      {/* Atmospheric Space Vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#030712]/30 to-[#030712]/80" />

      {/* Minimal Orthogonal Crosshair (NO circular rings or blue borders) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-32 h-32">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/25" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/25" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
        </div>
      </div>

      {/* Bottom Telemetry HUD Ribbon */}
      <div className="absolute bottom-8 inset-x-0 max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs font-mono text-cyan-300">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 shadow-2xl">
          <Satellite className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-semibold">TARGET ACQUISITION: INDIA ESCARPMENT</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">18.9499° N, 72.9512° E</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
          <span>SENSOR: SENTINEL-2 / CARTOSAT-3</span>
        </div>
      </div>
    </motion.div>
  );
};
