import sqlite3
from pathlib import Path
import numpy as np
from PIL import Image
import rasterio
from rasterio.windows import Window

BASE_DIR = Path(__file__).resolve().parent.parent
TILES_DIR = BASE_DIR / "storage" / "tiles"
TILES_DIR.mkdir(parents=True, exist_ok=True)

T1_TIF = BASE_DIR / "storage" / "raw_geotiff" / "mumbai_2023-12-08_s2.tif"
T2_TIF = BASE_DIR / "storage" / "raw_geotiff" / "mumbai_2024-12-17_s2.tif"

candidates_coords = [
    {"name": "cand1_high_change", "row": 256, "col": 256, "conf": 0.600, "drift": 0.150},
    {"name": "cand2_coastal_change", "row": 0, "col": 256, "conf": 0.242, "drift": 0.060},
    {"name": "cand3_urban_change", "row": 512, "col": 256, "conf": 0.205, "drift": 0.051},
]

def extract_and_save():
    print("=== EXTRACTING REAL 256x256 BEFORE/AFTER TILES FOR CANDIDATES ===")
    with rasterio.open(T1_TIF) as src1, rasterio.open(T2_TIF) as src2:
        for idx, c in enumerate(candidates_coords):
            w = Window(c["col"], c["row"], 256, 256)
            
            # T1 Before
            arr1 = src1.read(window=w)
            if arr1.shape[0] >= 3:
                rgb1 = np.transpose(arr1[:3], (1, 2, 0))
            else:
                rgb1 = np.repeat(arr1[0, :, :, np.newaxis], 3, axis=2)
            if rgb1.dtype != np.uint8:
                rgb1 = np.clip(rgb1, 0, 255).astype(np.uint8)
            img1 = Image.fromarray(rgb1)
            t1_file = TILES_DIR / f"mumbai_{c['name']}_2023-12-08_before.png"
            img1.save(t1_file)

            # T2 After
            arr2 = src2.read(window=w)
            if arr2.shape[0] >= 3:
                rgb2 = np.transpose(arr2[:3], (1, 2, 0))
            else:
                rgb2 = np.repeat(arr2[0, :, :, np.newaxis], 3, axis=2)
            if rgb2.dtype != np.uint8:
                rgb2 = np.clip(rgb2, 0, 255).astype(np.uint8)
            img2 = Image.fromarray(rgb2)
            t2_file = TILES_DIR / f"mumbai_{c['name']}_2024-12-17_after.png"
            img2.save(t2_file)

            # Update paths in SQLite tile_audit
            cand_id = f"mumbai_2023-12-08_s2_r{c['row']}_c{c['col']}_2023-12-08__mumbai_2024-12-17_s2_r{c['row']}_c{c['col']}_2024-12-17"
            rel_t1 = f"/storage/tiles/mumbai_{c['name']}_2023-12-08_before.png"
            rel_t2 = f"/storage/tiles/mumbai_{c['name']}_2024-12-17_after.png"

            with sqlite3.connect(BASE_DIR / "data" / "geo_system.db") as conn:
                conn.execute("""
                    UPDATE tile_audit 
                    SET before_image_path = ?, after_image_path = ?
                    WHERE id = ?
                """, (rel_t1, rel_t2, cand_id))
                conn.commit()

            print(f"\n[Candidate #{idx+1}]: {cand_id}")
            print(f"  Confidence: {c['conf']*100:.1f}% | Drift: {c['drift']:.3f}")
            print(f"  T1 Before : {t1_file} ({t1_file.stat().st_size/1024:.1f} KB)")
            print(f"  T2 After  : {t2_file} ({t2_file.stat().st_size/1024:.1f} KB)")

if __name__ == "__main__":
    extract_and_save()
