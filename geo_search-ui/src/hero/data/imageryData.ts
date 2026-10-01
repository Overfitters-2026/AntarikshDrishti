export interface ChangeCase {
  id: string;
  name: string;
  category: string;
  coordinates: string;
  lat: number;
  lng: number;
  period: string;
  timeT1: string;
  timeT2: string;
  imageT1: string;
  imageT2: string;
  resolution: string;
  sensor: string;
  metrics: {
    areaDelta: string;
    spectralDelta: string;
    confidenceScore: string;
    classification: string;
  };
  description: string;
  featuresDetected: string[];
}

export const CHANGE_CASES: ChangeCase[] = [
  {
    id: 'urban-coastal',
    name: 'Jawaharlal Nehru Port & Coastal Wetlands',
    category: 'Infrastructure & Coastal Reclamation',
    coordinates: '18.9499° N, 72.9512° E',
    lat: 18.9499,
    lng: 72.9512,
    period: '2018 — 2024 (6-Year Window)',
    timeT1: 'March 2018',
    timeT2: 'January 2024',
    imageT1: '/assets/images/sat_urban_2018_1790758135248.jpg',
    imageT2: '/assets/images/sat_urban_2024_1790758146670.jpg',
    resolution: '10m Multispectral (Fused with 0.28m PAN)',
    sensor: 'Sentinel-2 MSI / Cartosat-3',
    metrics: {
      areaDelta: '+14.82 km²',
      spectralDelta: 'ΔNDVI -0.284',
      confidenceScore: '97.4%',
      classification: 'Built-up Expansion (Class 03)'
    },
    description: 'Detection of extensive deep-water container terminal expansion, reclaimed mangrove mudflats, and industrial rail-corridor construction across Navi Mumbai coastline.',
    featuresDetected: [
      'Reclaimed Coastal Mudflats (+3.4 km²)',
      'New Logistics Storage Yard (+5.2 km²)',
      'Deep Container Berthing Docks',
      'Loss of Mangrove Buffer (-1.9 km²)'
    ]
  },
  {
    id: 'forest-canopy',
    name: 'Western Ghats Moist Deciduous Biosphere',
    category: 'Canopy Loss & Forest Fragmentation',
    coordinates: '14.2812° N, 74.8321° E',
    lat: 14.2812,
    lng: 74.8321,
    period: '2019 — 2024 (5-Year Window)',
    timeT1: 'February 2019',
    timeT2: 'February 2024',
    imageT1: '/assets/images/sat_forest_2019_1790758160374.jpg',
    imageT2: '/assets/images/sat_forest_2024_1790758174251.jpg',
    resolution: '10m Optical / 12-day repeat',
    sensor: 'Sentinel-2 MSI / RISAT-1A SAR',
    metrics: {
      areaDelta: '-28.60 km²',
      spectralDelta: 'ΔNDVI -0.412',
      confidenceScore: '98.8%',
      classification: 'Canopy Depletion (Class 07)'
    },
    description: 'Automated semantic identification of illegal logging penetration roads, tea/rubber plantation encroachment, and severe tree canopy thinning across protected river buffer zones.',
    featuresDetected: [
      'Linear Timber Logging Corridors (42.6 km)',
      'Sub-Canopy Road Access Arteries',
      'Soil Erosion Scarring along Ridgelines',
      'Hydrological Runoff Pattern Drift'
    ]
  }
];

export interface SemanticQueryPreset {
  id: string;
  query: string;
  targetRegion: string;
  relevance: number;
  matchedEntities: string[];
  lat: number;
  lng: number;
  sensor: string;
}

export const SEMANTIC_QUERY_PRESETS: SemanticQueryPreset[] = [
  {
    id: 'q1',
    query: 'Show coastal port development and reclaimed mangrove zones between 2018 and 2024',
    targetRegion: 'Navi Mumbai Port Corridor',
    relevance: 98.4,
    matchedEntities: ['Harbor berths', 'Mudflat fill', 'Industrial logistics', 'Mangrove fringe'],
    lat: 18.9499,
    lng: 72.9512,
    sensor: 'Sentinel-2 MSI'
  },
  {
    id: 'q2',
    query: 'Detect illegal logging tracks and canopy fragmentation in protected river catchment',
    targetRegion: 'Western Ghats Sector C',
    relevance: 97.2,
    matchedEntities: ['Linear track scars', 'Bare soil transition', 'Canopy density drop'],
    lat: 14.2812,
    lng: 74.8321,
    sensor: 'Cartosat-3 / Sentinel-2'
  },
  {
    id: 'q3',
    query: 'Locate rapid glacial moraine lake volume expansion exceeding 15 hectares',
    targetRegion: 'Sikkim Cryosphere Basin',
    relevance: 95.8,
    matchedEntities: ['Supraglacial water surge', 'Moraine dam instability', 'Albedo drift'],
    lat: 27.9142,
    lng: 88.2045,
    sensor: 'RISAT-1A SAR / Landsat-9'
  },
  {
    id: 'q4',
    query: 'Find unpermitted brick kilns and sand excavation pits near riverbanks',
    targetRegion: 'Yamuna River Plain',
    relevance: 94.6,
    matchedEntities: ['Circular kiln thermal signatures', 'Alluvial excavation scars'],
    lat: 28.6139,
    lng: 77.2090,
    sensor: 'Cartosat-3 PAN'
  }
];

export interface TeamMember {
  name: string;
  role: string;
  specialization: string;
  institution: string;
  contributions: string[];
  github?: string;
  linkedin?: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Aarav V. Sharma',
    role: 'Team Lead & AI/CV Architect',
    specialization: 'Remote Sensing Multimodal Embeddings & Siamese Transformers',
    institution: 'Smart India Hackathon 2024 Team ID: SIH-PS227-849',
    contributions: [
      'Designed Geo-CLIP 768-D cross-modal contrastive vision-language encoder',
      'Developed Siamese Cross-Attention Difference Transformer (SCD-Former)',
      'Benchmark testing against EuroSAT & SpaceNet datasets'
    ]
  },
  {
    name: 'Ananya Deshmukh',
    role: 'Geospatial Systems & Cloud Engineer',
    specialization: 'Distributed Vector Indexing (HNSW) & STAC API Pipeline',
    institution: 'Smart India Hackathon 2024 Team ID: SIH-PS227-849',
    contributions: [
      'Implemented Spatio-Temporal R-Tree combined with Milvus/FAISS vector index',
      'Automated ISRO Bhuvan & Copernicus Sentinel-2 tile orthorectification pipeline',
      'Designed COG (Cloud Optimized GeoTIFF) streaming pyramid service'
    ]
  },
  {
    name: 'Rohan K. Nambiar',
    role: 'Full-Stack Visual & 3D WebGL Lead',
    specialization: 'Interactive Remote Sensing HUD, Three.js & Shader Engineering',
    institution: 'Smart India Hackathon 2024 Team ID: SIH-PS227-849',
    contributions: [
      'Engineered interactive 3D WebGL orbital Earth sphere with real sensor ground swaths',
      'Constructed dual-view synchronized bi-temporal swipe curtain & NDVI raster shader',
      'Built sub-200ms reactive geospatial telemetry console'
    ]
  },
  {
    name: 'Priyanka Sen',
    role: 'Remote Sensing & Radiometric Specialist',
    specialization: 'Atmospheric Correction (Sen2Cor) & Multi-Spectral Indices',
    institution: 'Smart India Hackathon 2024 Team ID: SIH-PS227-849',
    contributions: [
      'Implemented automated BOA (Bottom-of-Atmosphere) reflectance normalization',
      'Engineered multi-index change math (NDVI, NDWI, NDBI, SAVI, BSI)',
      'Formulated false-positive suppression for cloud occlusions and solar azimuth drift'
    ]
  }
];

export const SYSTEM_SPECS = {
  problemStatement: 'Smart India Hackathon Problem Statement 227',
  theme: 'Space Technology & Earth Observation (ISRO / MoES)',
  pipelineLatencies: {
    textEncoding: '18ms',
    vectorSearch: '24ms',
    biTemporalRegistration: '142ms',
    changeSegmentation: '86ms',
    endToEnd: '< 280ms'
  },
  supportedSensors: [
    { name: 'Sentinel-2 MSI', bands: '13 Bands (VNIR/SWIR)', resolution: '10m - 20m', cadence: '5 days' },
    { name: 'Cartosat-3', bands: 'Panchromatic + 4 Band MX', resolution: '0.28m PAN / 1.12m MX', cadence: 'On-demand' },
    { name: 'Landsat-9 OLI-2', bands: '11 Spectral Bands', resolution: '15m PAN / 30m Optical', cadence: '16 days' },
    { name: 'RISAT-1A (EOS-04)', bands: 'C-band SAR (All-weather)', resolution: '3m - 50m Modes', cadence: 'Day/Night' }
  ]
};
