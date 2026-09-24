import sqlite3

conn = sqlite3.connect("data/geo_system.db")
c = conn.cursor()

c.execute("""
    UPDATE tile_audit 
    SET before_image_path = '/storage/tiles/mumbai_cand1_high_change_2023-12-08_before.png',
        after_image_path = '/storage/tiles/mumbai_cand1_high_change_2024-12-17_after.png'
    WHERE id = 'mumbai_2023-12-08_s2_r256_c256_2023-12-08__mumbai_2024-12-17_s2_r256_c256_2024-12-17'
""")
conn.commit()
print("Updated candidate 1 rows:", c.rowcount)

# Verify all rows
c.execute("SELECT id, before_image_path, after_image_path FROM tile_audit WHERE before_image_path IS NOT NULL")
for row in c.fetchall():
    print("Row:", row)

conn.close()
