import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import rasterio
from rasterio.windows import Window
from rasterio.warp import transform
import pystac_client
import planetary_computer

RAW_DIR = Path("storage/raw_geotiff")
RAW_DIR.mkdir(parents=True, exist_ok=True)

T1_SCENE_ID = "S2A_MSIL2A_20231208T054221_R005_T43QBB_20231208T101227"
T2_SCENE_ID = "S2B_MSIL2A_20241217T054139_R005_T43QBB_20241217T074201"

T1_DATE = "2023-12-08"
T2_DATE = "2024-12-17"

T1_OUTPUT = RAW_DIR / "mumbai_2023-12-08_s2.tif"
T2_OUTPUT = RAW_DIR / "mumbai_2024-12-17_s2.tif"

# Mumbai AOI center
MUMBAI_LNG = 72.8777
MUMBAI_LAT = 19.0760
WINDOW_SIZE = 1024  # 1024x1024 pixels = 10.24km x 10.24km AOI (16 256x256 tiles per scene)

def fetch_and_clip_scene(catalog, scene_id: str, out_path: Path):
    print(f"\n[FETCH] Accessing scene: {scene_id}...")
    item = catalog.get_collection("sentinel-2-l2a").get_item(scene_id)
    signed_item = planetary_computer.sign(item)
    
    cloud_cover = signed_item.properties.get("eo:cloud_cover", 0.0)
    print(f"  * Date: {signed_item.datetime.strftime('%Y-%m-%d')} | Cloud Cover: {cloud_cover:.2f}%")
    
    url = signed_item.assets["visual"].href
    
    with rasterio.open(url) as src:
        # Transform geographic coordinates to raster CRS (UTM 43N)
        xs, ys = transform("EPSG:4326", src.crs, [MUMBAI_LNG], [MUMBAI_LAT])
        center_row, center_col = src.index(xs[0], ys[0])
        
        # Calculate window bounded within raster dimensions
        row_off = max(0, min(center_row - (WINDOW_SIZE // 2), src.height - WINDOW_SIZE))
        col_off = max(0, min(center_col - (WINDOW_SIZE // 2), src.width - WINDOW_SIZE))
        window = Window(col_off, row_off, WINDOW_SIZE, WINDOW_SIZE)
        
        # Read 3-band RGB data for this window
        data = src.read(window=window)
        win_transform = rasterio.windows.transform(window, src.transform)
        
        profile = src.profile.copy()
        profile.update({
            "height": WINDOW_SIZE,
            "width": WINDOW_SIZE,
            "transform": win_transform,
            "driver": "GTiff",
            "compress": "deflate",
        })
        
        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(data)
            
    size_kb = out_path.stat().st_size / 1024
    print(f"  [SAVED] {out_path} ({size_kb:.1f} KB) - Window ({WINDOW_SIZE}x{WINDOW_SIZE} px)")
    return out_path

def main():
    print("=== CONNECTING TO MICROSOFT PLANETARY COMPUTER STAC API ===")
    catalog = pystac_client.Client.open(
        "https://planetarycomputer.microsoft.com/api/stac/v1",
        modifier=planetary_computer.sign_inplace
    )
    
    p1 = fetch_and_clip_scene(catalog, T1_SCENE_ID, T1_OUTPUT)
    p2 = fetch_and_clip_scene(catalog, T2_SCENE_ID, T2_OUTPUT)
    
    print("\n[COMPLETE] Real Sentinel-2 scenes successfully downloaded and clipped:")
    print(f"  1. T1: {p1} ({p1.stat().st_size / 1024:.1f} KB)")
    print(f"  2. T2: {p2} ({p2.stat().st_size / 1024:.1f} KB)")

if __name__ == "__main__":
    main()
