import { RefObject } from 'react';
import { useScroll, useTransform, useSpring, MotionValue } from 'motion/react';

export interface EarthScrollValues {
  scrollProgress: MotionValue<number>;
  earthScale: MotionValue<number>;
  earthX: MotionValue<number>;
  earthY: MotionValue<number>;
  earthOpacity: MotionValue<number>;
  studioTransitionOpacity: MotionValue<number>;
  // Text opacities and offsets for story stages
  frame1Opacity: MotionValue<number>;
  frame1Y: MotionValue<number>;
  frame4Opacity: MotionValue<number>;
  frame4Y: MotionValue<number>;
  frame5Opacity: MotionValue<number>;
  frame5Y: MotionValue<number>;
}

export interface UseEarthScrollOptions {
  targetRef?: RefObject<HTMLElement | null>;
  offset?: [string, string];
}

/**
 * Hook governing scroll-driven Earth transformation:
 * - STAGE 1: INTRO (Earth scale 1.15, centered horizontally, lower portion extending below viewport)
 * - STAGE 2: EARTH RISES (Earth moves upward, typography fades)
 * - STAGE 3: EARTH DOMINATES (Earth scale ~1.35-1.5, covers viewport)
 * - STAGE 4: EARTH MOVES TO RIGHT (Earth scale ~0.70, moves right, Text on Left)
 * - STAGE 5: EARTH APPROACH & TEXT CHANGES ("FROM NATURAL LANGUAGE TO EARTH INSIGHT")
 * - STAGE 6: FULL-SCREEN EARTH STUDIO TRANSITION (Crossfades into satellite observation)
 * 
 * Note: Earth's continuous rotational loop is completely independent of scroll!
 */
export function useEarthScroll(options: UseEarthScrollOptions = {}): EarthScrollValues {
  const { targetRef, offset = ['start start', 'end start'] } = options;

  const { scrollYProgress } = useScroll(
    targetRef ? { target: targetRef, offset: offset as any } : {}
  );

  // Smooth aerospace inertia using spring physics
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 26,
    mass: 0.4,
    restDelta: 0.0004
  });

  // Earth Scale:
  // 0.00: 1.15 (huge initial presence)
  // 0.18: 1.15 (fully emerged)
  // 0.34: 1.45 (Earth dominates, covers majority of viewport)
  // 0.52: 0.70 (settles onto right side, 45-55% width)
  // 0.72: 0.72 (holds right composition)
  // 0.88: 1.15 (approaching camera)
  // 1.00: 1.45 (diving to surface)
  const earthScale = useTransform(
    smoothProgress,
    [0.0, 0.18, 0.34, 0.52, 0.72, 0.88, 1.0],
    [1.15, 1.18, 1.45, 0.70, 0.72, 1.15, 1.45]
  );

  // Earth X position in 3D world space:
  // Centered (0) initially and during domination -> Moves to the RIGHT (1.4) during Frame 4 & 5
  const earthX = useTransform(
    smoothProgress,
    [0.0, 0.34, 0.50, 0.72, 0.88, 1.0],
    [0, 0, 1.35, 1.35, 0.6, 0]
  );

  // Earth Y position in 3D world space:
  // -1.35 at start (Earth partially emerging at bottom) -> rises smoothly to 0 at 0.18
  const earthY = useTransform(
    smoothProgress,
    [0.0, 0.18, 0.34, 1.0],
    [-1.35, 0, 0, 0]
  );

  // 3D Earth Opacity (crossfades to full-screen Earth Studio at late scroll stage)
  const earthOpacity = useTransform(
    smoothProgress,
    [0.0, 0.82, 0.92, 1.0],
    [1, 1, 0.35, 0]
  );

  // Full-screen Earth Studio Transition Opacity
  const studioTransitionOpacity = useTransform(
    smoothProgress,
    [0.0, 0.82, 0.92, 1.0],
    [0, 0, 0.70, 1]
  );

  // Frame 1: Top Hero Typography ("THE BLUE PLANET / EARTH / ANTARIKSH DRISHTI")
  const frame1Opacity = useTransform(smoothProgress, [0.0, 0.12, 0.20], [1, 1, 0]);
  const frame1Y = useTransform(smoothProgress, [0.0, 0.20], [0, -50]);

  // Frame 4: Left Text ("THE EARTH OBSERVATION CHALLENGE / UNDERSTANDING OUR PLANET...")
  const frame4Opacity = useTransform(smoothProgress, [0.42, 0.48, 0.60, 0.65], [0, 1, 1, 0]);
  const frame4Y = useTransform(smoothProgress, [0.42, 0.48, 0.60, 0.65], [40, 0, 0, -40]);

  // Frame 5: Left Text ("THE ANTARIKSH DRISHTI APPROACH / FROM NATURAL LANGUAGE...")
  const frame5Opacity = useTransform(smoothProgress, [0.65, 0.70, 0.80, 0.85], [0, 1, 1, 0]);
  const frame5Y = useTransform(smoothProgress, [0.65, 0.70, 0.80, 0.85], [40, 0, 0, -40]);

  return {
    scrollProgress: smoothProgress,
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
  };
}
