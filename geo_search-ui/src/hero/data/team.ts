export interface TeamMember {
  name: string;
  role: string;
  contribution: string;
  technologies: string[];
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Aarav V. Sharma',
    role: 'AI & Computer Vision Architecture',
    contribution: 'Designed cross-modal vision-language retrieval encoders and Siamese cross-attention difference networks for Earth observation scenes.',
    technologies: ['PyTorch', 'Geo-CLIP', 'Transformers', 'ONNX']
  },
  {
    name: 'Ananya Deshmukh',
    role: 'Geospatial Systems & Data Pipelines',
    contribution: 'Engineered spatio-temporal catalog indexing, automated satellite swath orthorectification, and Cloud-Optimized GeoTIFF streaming.',
    technologies: ['STAC API', 'GDAL', 'Vector Indexing (HNSW)', 'Cloud GeoTIFF']
  },
  {
    name: 'Rohan K. Nambiar',
    role: 'Full-Stack & WebGL Engineering',
    contribution: 'Developed interactive 3D WebGL orbital Earth systems, dual-view bi-temporal swipe curtain shaders, and reactive mission consoles.',
    technologies: ['TypeScript', 'React', 'Three.js', 'Tailwind CSS']
  },
  {
    name: 'Priyanka Sen',
    role: 'Remote Sensing & Radiometric Science',
    contribution: 'Implemented atmospheric reflectance normalization, multispectral band arithmetic, and phenology false-positive filtering.',
    technologies: ['Sentinel-2 MSI', 'Cartosat-3', 'Sen2Cor', 'Spectral Math']
  }
];
