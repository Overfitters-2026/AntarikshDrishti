import pystac_client
import planetary_computer

catalog = pystac_client.Client.open(
    "https://planetarycomputer.microsoft.com/api/stac/v1",
    modifier=planetary_computer.sign_inplace,
)

mumbai_bbox = [72.82, 19.00, 72.90, 19.10]

print("=== SEARCHING 2023 BASELINE SCENES ===")
search_2023 = catalog.search(
    collections=["sentinel-2-l2a"],
    bbox=mumbai_bbox,
    datetime="2023-01-01/2023-12-31",
    query={"eo:cloud_cover": {"lt": 10}},
    max_items=10,
)
items_2023 = list(search_2023.items())
for it in items_2023[:5]:
    cc = it.properties.get("eo:cloud_cover", 0.0)
    print(f"2023: {it.id} | Date: {it.datetime.strftime('%Y-%m-%d')} | CloudCover: {cc:.2f}%")

print("\n=== SEARCHING 2024 OBSERVATION SCENES ===")
search_2024 = catalog.search(
    collections=["sentinel-2-l2a"],
    bbox=mumbai_bbox,
    datetime="2024-01-01/2024-12-31",
    query={"eo:cloud_cover": {"lt": 10}},
    max_items=10,
)
items_2024 = list(search_2024.items())
for it in items_2024[:5]:
    cc = it.properties.get("eo:cloud_cover", 0.0)
    print(f"2024: {it.id} | Date: {it.datetime.strftime('%Y-%m-%d')} | CloudCover: {cc:.2f}%")
