export interface TeamMember {
  name: string;
  role: string;
  contribution: string;
  technologies: string[];
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Gupta Dharmesh',
    role: 'Team Leader & GenAI Developer',
    contribution: 'Led end-to-end architecture and system orchestration, integrating multi-modal GenAI foundation models, cross-modal vision-language retrieval encoders, and mission-critical offline inference workflows.',
    technologies: ['Team Lead', 'GenAI', 'RemoteCLIP', 'PyTorch', 'System Architecture']
  },
  {
    name: 'Prasad Rohit Kumar',
    role: 'Backend Developer',
    contribution: 'Engineered high-performance asynchronous FastAPI microservices, geospatial query orchestration, vector similarity index retrieval, and deterministic temporal change detection pipelines.',
    technologies: ['FastAPI', 'Python', 'Qdrant Vector DB', 'SQLite', 'AsyncIO']
  },
  {
    name: 'Halai Harshini Naran',
    role: 'AIML Engineer',
    contribution: 'Developed learned change verification algorithms, Random Forest false-alarm suppression with 7 radiometric features, and multi-temporal anomaly scoring models.',
    technologies: ['Scikit-Learn', 'Machine Learning', 'Random Forest', 'Feature Eng.', 'NumPy']
  },
  {
    name: 'Goswami Mayur',
    role: 'Frontend Developer',
    contribution: 'Built interactive geospatial Leaflet map viewers, bi-temporal inspection consoles, dynamic layer controls, and real-time mission telemetry dashboards.',
    technologies: ['React', 'TypeScript', 'Leaflet', 'Tailwind CSS', 'Vite']
  },
  {
    name: 'Singh Nikita',
    role: 'Frontend Developer',
    contribution: 'Crafted high-fidelity reactive UI components, visual spectral analysis inspectors, responsive interactive sliders, and analyst triage reporting interfaces.',
    technologies: ['React', 'JavaScript', 'Tailwind CSS', 'UI/UX', 'Motion']
  },
  {
    name: 'Chauhan Henil',
    role: 'Backend Developer & Python Developer',
    contribution: 'Implemented satellite data ingestion pipelines, Cloud-Optimized GeoTIFF processing, spectral indices calculation (NDVI/NDBI/NDWI), and raster orthorectification.',
    technologies: ['Python', 'Rasterio', 'GDAL', 'Spectral Math', 'REST APIs']
  }
];
