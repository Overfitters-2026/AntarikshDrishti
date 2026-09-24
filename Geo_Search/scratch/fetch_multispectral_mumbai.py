import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform
from rasterio.enums import Resampling
import pystac_client
import planetary_computer

RAW_DIR = Path("storage/raw_geotiff")
RAW_DIR.mkdir(parents=True, exist_ok=True)

T1_SCENE_ID = "S2A_MSIL2A_20231208T054221_R005_T43QBB_20231208T101227"
T2_SCENE_ID = "S2B_MSIL2A_20241217T054139_R005_T43QBB_20241217T074201"

MUMBAI_LNG = 72.8777
MUMBAI_LAT = 19.0760
WINDOW_SIZE = 1024  # 1024x1024 px = 10.24km x 10.24km

BANDS = ["B02", "B03", "B04", "B08", "B11", "SCL"]

def fetch_multispectral_scene(catalog, scene_id: str, out_path: Path):
    print(f"\n[FETCH] Processing multi-spectral Sentinel-2 scene: {scene_id}...")
    item = catalog.get_collection("sentinel-2-l2a").get_item(scene_id)
    signed_item = planetary_computer.sign(item)
    
    # Reference 10m band for spatial alignment
    ref_asset = signed_item.assets["B04"]
    with rasterio.open(ref_asset.href) as ref_src:
        xs, ys = transform("EPSG:4326", ref_src.crs, [MUMBAI_LNG], [MUMBAI_LAT])
        center_row, center_col = ref_src.index(xs[0], ys[0])
        row_off = max(0, min(center_row - (WINDOW_SIZE // 2), ref_src.height - WINDOW_SIZE))
        col_off = max(0, min(center_col - (WINDOW_SIZE // 2), ref_src.width - WINDOW_SIZE))
        ref_window = Window(col_off, row_off, WINDOW_SIZE, WINDOW_SIZE)
        win_transform = rasterio.windows.transform(ref_window, ref_src.transform)
        ref_crs = ref_src.crs
        
        # Get bounding box in CRS
        bounds = rasterio.windows.bounds(ref_window, ref_src.transform)

    stacked_data = np.zeros((len(BANDS), WINDOW_SIZE, WINDOW_SIZE), dtype=np.uint16)
    
    for idx, band_name in enumerate(BANDS):
        asset = signed_item.assets[band_name]
        print(f"  -> Fetching band {band_name} ({asset.title or ''})...")
        with rasterio.open(asset.href) as src:
            # Transform bounds to source CRS if different
            # For S2 L2A within same granule, CRS is identical UTM 43N
            inv_window = rasterio.windows.from_bounds(*bounds, src.transform)
            # Read window with resampling if resolution is 20m (e.g. B11, SCL)
            resampling = Resampling.nearest if band_name == "SCL" else Resampling.bilinear
            data = src.read(
                1,
                window=inv_window,
                out_shape=(WINDOW_SIZE, WINDOW_SIZE),
                resampling=resampling
            )
            stacked_data[idx] = data.astype(np.uint16)
            print(f"     Loaded {band_name}: min={data.min()}, max={data.max()}, mean={data.mean():.1f}")

    profile = {
        "driver": "GTiff",
        "height": WINDOW_SIZE,
        "width": WINDOW_SIZE,
        "count": len(BANDS),
        "dtype": "uint16",
        "crs": ref_crs,
        "transform": win_transform,
        "compress": "deflate",
    }
    
    with rasterio.open(out_path, "w", **profile) as dst:
        dst.write(stacked_data)
        for i, band_name in enumerate(BANDS, 1):
            dst.set_band_description(i, band_name)
            
    print(f"[SAVED] {out_path} ({out_path.stat().st_size / (1024*1024):.2f} MB, {len(BANDS)} bands)")
    return out_path

def main():
    print("=== CONNECTING TO PLANETARY COMPUTER STAC FOR MULTI-SPECTRAL BANDS ===")
    catalog = pystac_client.Client.open(
        "https://planetarycomputer.microsoft.com/api/stac/v1",
        modifier=planetary_computer.sign_inplace
    )
    
    t1_out = RAW_DIR / "mumbai_2023-12-08_s2_multispectral.tif"
    t2_out = RAW_DIR / "mumbai_2024-12-17_s2_multispectral.tif"
    
    fetch_multispectral_scene(catalog, T1_SCENE_ID, t1_out)
    fetch_multispectral_scene(catalog, T2_SCENE_ID, t2_out)
    print("\n[SUCCESS] Both T1 and T2 multi-spectral scenes generated.")

if __name__ == "__main__":
    main()
