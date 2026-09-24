"""
CANONICAL ENTRYPOINT DELEGATION:
This repository consolidates all backend services under the single source of truth:
c:/Projects/PS_227/Geo_Search/

To eliminate code drift and duplicate divergence, this root main.py delegates
directly to the active FastAPI application in Geo_Search/main.py.
"""
import os
import sys
import importlib.util
from pathlib import Path

# Change working directory so all relative paths (storage/, data/) align with Geo_Search
GEO_SEARCH_DIR = Path(__file__).resolve().parent / "Geo_Search"
os.chdir(str(GEO_SEARCH_DIR))
if str(GEO_SEARCH_DIR) not in sys.path:
    sys.path.insert(0, str(GEO_SEARCH_DIR))

# Dynamically import canonical main from Geo_Search to avoid circular name collision
spec = importlib.util.spec_from_file_location("geo_search_main", GEO_SEARCH_DIR / "main.py")
geo_main = importlib.util.module_from_spec(spec)
sys.modules["geo_search_main"] = geo_main
spec.loader.exec_module(geo_main)

app = geo_main.app