import rasterio

paths = ["/home/dharmesh/Downloads/2026-05-11-00_00_2026-05-11-23_59_Sentinel-2_L2A_True_color.tiff", "/home/dharmesh/Downloads/2026-09-08-00_00_2026-09-08-23_59_Sentinel-2_L2A_True_color (1).tiff"]
for path in paths:
    with rasterio.open(path) as src:
        print(path)
        print("CRS:", src.crs)
        print("size:", src.width, src.height)
        print("transform:", src.transform)
        print("bounds:", src.bounds)

with rasterio.open(paths[0]) as a, rasterio.open(paths[1]) as b:
    assert a.crs == b.crs, "CRS differs; reproject before comparison"
    assert a.width == b.width and a.height == b.height, "Image dimensions differ"
    assert a.transform == b.transform, "Images are not aligned"
print("Pair is ready.")