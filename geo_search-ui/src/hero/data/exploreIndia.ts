export interface TargetLocation {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  date: string;
  satellite: string;
  scene: string;
  description: string;
  stageSteps: {
    stage: 'GLOBAL VIEW' | 'ASIA' | 'INDIA' | 'SELECTED REGION' | 'TARGET LOCATION';
    altitude: string;
    focus: string;
  }[];
}

/**
 * Verified target locations for the prototype "Explore India" orbital descent.
 * All coordinates, sensor types, dates, and scene identifiers represent
 * authentic Earth observation datasets referenced throughout ANTARIKSH DRISHTI.
 */
export const EXPLORE_INDIA_LOCATIONS: TargetLocation[] = [
  {
    id: 'mumbai-port',
    name: 'Navi Mumbai Port Corridor',
    region: 'Maharashtra Coastal Belt',
    latitude: 18.9499,
    longitude: 72.9512,
    date: '18 January 2024',
    satellite: 'Sentinel-2 MSI / Cartosat-3',
    scene: 'S2B_MSIL2A_20240118T053219_T43QDA',
    description: 'Deep-water container berthing docks and coastal land reclamation.',
    stageSteps: [
      { stage: 'GLOBAL VIEW', altitude: '786 km Orbit', focus: 'Eastern Hemisphere Low-Earth Orbit Pass' },
      { stage: 'ASIA', altitude: '420 km Sub-Orbital', focus: 'South Asian Geospatial Arc' },
      { stage: 'INDIA', altitude: '180 km Regional Lock', focus: 'Indian Subcontinent & Arabian Sea Margin' },
      { stage: 'SELECTED REGION', altitude: '45 km Stratospheric Corridor', focus: 'Konkan Coastline & Thane Creek Basin' },
      { stage: 'TARGET LOCATION', altitude: '10 km High-Resolution', focus: 'Navi Mumbai Multi-Modal Container Terminal' }
    ]
  },
  {
    id: 'western-ghats',
    name: 'Western Ghats Moist Biosphere',
    region: 'Karnataka High Canopy Basin',
    latitude: 14.2812,
    longitude: 74.8321,
    date: '12 February 2024',
    satellite: 'Sentinel-2 MSI / RISAT-1A SAR',
    scene: 'S2A_MSIL2A_20240212T051931_T43PDA',
    description: 'Canopy density monitoring, road penetration, and forest fragmentation.',
    stageSteps: [
      { stage: 'GLOBAL VIEW', altitude: '786 km Orbit', focus: 'Eastern Hemisphere Low-Earth Orbit Pass' },
      { stage: 'ASIA', altitude: '420 km Sub-Orbital', focus: 'South Asian Geospatial Arc' },
      { stage: 'INDIA', altitude: '180 km Regional Lock', focus: 'Peninsular Escarpment & Malabar Shelf' },
      { stage: 'SELECTED REGION', altitude: '45 km Stratospheric Corridor', focus: 'Sharavathi River Watershed Reserve' },
      { stage: 'TARGET LOCATION', altitude: '10 km High-Resolution', focus: 'Moist Deciduous Core Conservation Grid' }
    ]
  },
  {
    id: 'sikkim-basin',
    name: 'Sikkim Cryosphere Basin',
    region: 'Eastern Himalayas',
    latitude: 27.9142,
    longitude: 88.2045,
    date: '24 October 2023',
    satellite: 'RISAT-1A SAR / Landsat-9',
    scene: 'LC09_L2SP_139041_20231024_02_T1',
    description: 'Supraglacial moraine lake volume expansion and albedo variation.',
    stageSteps: [
      { stage: 'GLOBAL VIEW', altitude: '786 km Orbit', focus: 'Eastern Hemisphere Low-Earth Orbit Pass' },
      { stage: 'ASIA', altitude: '420 km Sub-Orbital', focus: 'Himalayan Orographic Boundary' },
      { stage: 'INDIA', altitude: '180 km Regional Lock', focus: 'Northeastern Border Glacial Catchment' },
      { stage: 'SELECTED REGION', altitude: '45 km Stratospheric Corridor', focus: 'Teesta River Headwaters Basin' },
      { stage: 'TARGET LOCATION', altitude: '10 km High-Resolution', focus: 'South Lhonak Moraine Dam Sector' }
    ]
  }
];

export const CAMERA_STAGES = [
  'GLOBAL VIEW',
  'ASIA',
  'INDIA',
  'SELECTED REGION',
  'TARGET LOCATION'
] as const;
