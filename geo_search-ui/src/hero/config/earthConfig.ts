export type EarthMode = 'interactive-3d' | 'earth-studio';

export interface FlyoverTarget {
  id: string;
  name: string;
  region: string;
  coordinates: string;
  altitude: string;
  resolution: string;
  stageTitle: string;
}

export interface EarthStudioSequenceStage {
  stageNumber: number;
  label: string;
  altitude: string;
  description: string;
}

export interface EarthConfiguration {
  /**
   * Primary mode selection:
   * 'interactive-3d': Three.js procedural WebGL orbital globe
   * 'earth-studio': Google Earth Studio cinematic satellite flyover video/WebM
   */
  mode: EarthMode;
  /**
   * Path to the Google Earth Studio WebM/video asset.
   * Easily replaceable with custom renders.
   */
  videoSrc: string;
  /**
   * High-fidelity scientific fallback poster in case of network latency
   * or browser autoplay restrictions.
   */
  fallbackPoster: string;
  /**
   * The 4 key stages communicated during Earth Studio descent:
   * Orbiting Earth -> India -> Indian geographic region -> Specific target location
   */
  stages: EarthStudioSequenceStage[];
  /**
   * Pre-configured ground targets for the location-focused flyover sequence
   */
  flyoverTargets: FlyoverTarget[];
}

export const EARTH_CONFIG: EarthConfiguration = {
  mode: 'earth-studio',
  videoSrc: '/assets/earth/antrix-earth.webm',
  fallbackPoster: '/assets/images/earth_studio_orbit_india_1790759562196.jpg',
  stages: [
    {
      stageNumber: 1,
      label: 'Orbiting Earth',
      altitude: '786 km LEO',
      description: 'Sun-synchronous orbital telemetry pass over the Eastern Hemisphere.'
    },
    {
      stageNumber: 2,
      label: 'India Subcontinent',
      altitude: '240 km AOI Lock',
      description: 'Acquisition vector descending towards the Indian tectonic peninsula.'
    },
    {
      stageNumber: 3,
      label: 'Regional Sector',
      altitude: '48 km Stratosphere',
      description: 'Optical boresight isolating coastal and vegetative corridors.'
    },
    {
      stageNumber: 4,
      label: 'Target Location',
      altitude: '10 km High-Resolution',
      description: '10-meter Sentinel-2 & Cartosat-3 sub-pixel observation footprint.'
    }
  ],
  flyoverTargets: [
    {
      id: 'mumbai',
      name: 'Navi Mumbai Port Corridor',
      region: 'Maharashtra Coastal Zone',
      coordinates: '18.9499° N, 72.9512° E',
      altitude: '12.4 km',
      resolution: '0.28m PAN / 10m MSI',
      stageTitle: 'Coastal Infrastructure & Land Reclamation'
    },
    {
      id: 'ghats',
      name: 'Western Ghats Moist Biosphere',
      region: 'Karnataka High Canopy Basin',
      coordinates: '14.2812° N, 74.8321° E',
      altitude: '18.5 km',
      resolution: '10m Optical / C-Band SAR',
      stageTitle: 'Forest Canopy & Logging Road Incursion'
    },
    {
      id: 'sikkim',
      name: 'Sikkim Cryosphere Basin',
      region: 'Eastern Himalayas',
      coordinates: '27.9142° N, 88.2045° E',
      altitude: '24.0 km',
      resolution: '15m Multispectral',
      stageTitle: 'Glacial Moraine Lake Surge & Albedo'
    }
  ]
};
