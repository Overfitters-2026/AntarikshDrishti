"""
Hugging Face Spaces Entrypoint for AntarikshDrishti.
Runs on the free CPU tier (2 vCPU · 16 GB RAM) with Gradio SDK.
Serves the unified full-stack platform:
- Interactive React Workstation UI (at /)
- REST APIs (/api/v1)
- Multi-spectral preview layers (/storage/tiles)
- Companion Gradio interface (/gradio)
"""
import os
import sys
from pathlib import Path

# Ensure working directory is aligned with Geo_Search
ROOT_DIR = Path(__file__).resolve().parent
GEO_SEARCH_DIR = ROOT_DIR / "Geo_Search"

os.chdir(str(GEO_SEARCH_DIR))
if str(GEO_SEARCH_DIR) not in sys.path:
    sys.path.insert(0, str(GEO_SEARCH_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Import the canonical FastAPI application
from main import app as fastapi_app

# ZeroGPU watchdog integration
try:
    import spaces
    @spaces.GPU
    def _zerogpu_runner():
        """Satisfies Hugging Face ZeroGPU startup watchdog."""
        return True
    _zerogpu_runner()
except ImportError:
    pass

try:
    import gradio as gr

    # Define a clean companion Gradio interface mounted at /gradio
    with gr.Blocks(title="AntarikshDrishti - Satellite Intelligence Platform") as demo:
        gr.Markdown(
            """
            # 🛰️ AntarikshDrishti // Satellite Intelligence Platform
            ### Multi-Spectral Geospatial Semantic Search & Visual Change Intelligence
            
            - **Web Application**: Access the full interactive workstation at **[/ (Root)](/)**
            - **Interactive API Docs**: View Swagger UI at **[/docs](/docs)**
            - **Backend Status**: Operational (Online)
            """
        )
        with gr.Row():
            gr.Markdown(
                """
                ### Core Capabilities:
                1. **Zero-Shot Semantic Visual Search**: Query Sentinel-2 satellite imagery using natural language prompts or uploaded visual chips via OpenCLIP ViT-B/16.
                2. **Multi-Spectral Bi-Temporal Change Detection**: Rigorous compute of NDVI, NDBI, NDWI, and False Color IR layers across baseline and observation scenes.
                3. **Random Forest False-Alarm Filtering**: Machine learning discrimination between true land-use transformations and seasonal/atmospheric drift.
                4. **Unsupervised Geographical Clustering**: High-dimensional vector manifold clustering with OpenCLIP centroid semantic labeling.
                """
            )

    # Mount Gradio app onto FastAPI at /gradio so root / remains the custom React Workstation
    app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")
except Exception as e:
    app = fastapi_app

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Spaces exposes port 7860 by default
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
