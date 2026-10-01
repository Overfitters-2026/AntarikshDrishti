import React from 'react';

interface EarthCloudsProps {
  radius?: number;
  rotationSpeed?: number;
  cloudTextureUrl?: string;
}

/**
 * Cloud layer component.
 * As instructed, if a photorealistic transparent cloud map is not present,
 * we deliberately disable artificial clouds rather than rendering fake blurry shapes.
 */
export const EarthClouds: React.FC<EarthCloudsProps> = () => {
  // Disabled until authentic NASA cloud map asset (/assets/earth/earth_clouds.png) is supplied
  return null;
};
