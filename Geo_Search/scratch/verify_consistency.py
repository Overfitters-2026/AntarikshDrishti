import sqlite3
import httpx

conn = sqlite3.connect('data/geo_semantic.db')
c = conn.cursor()
rows = c.execute('SELECT tile_id, confidence, drift_score FROM review_queue').fetchall()

print("================================================================================")
print("      VERIFYING REPRODUCIBILITY: ON-CLICK RECOMPUTATION VS REVIEW_QUEUE         ")
print("================================================================================")

all_passed = True

for r in rows:
    tid = r[0]
    expected_conf = float(r[1])
    expected_drift = float(r[2])

    # Click 1
    r1 = httpx.post('http://127.0.0.1:8000/api/v1/change/detect', json={'tile_id': tid}, timeout=10.0)
    c1 = r1.json()['candidates'][0]

    # Click 2 (consecutive immediate click)
    r2 = httpx.post('http://127.0.0.1:8000/api/v1/change/detect', json={'tile_id': tid}, timeout=10.0)
    c2 = r2.json()['candidates'][0]

    match_clicks = (c1['confidence'] == c2['confidence']) and (c1['drift'] == c2['drift'])
    match_ledger = (abs(c1['confidence'] - expected_conf) < 1e-7) and (abs(c1['drift'] - expected_drift) < 1e-7)

    status = "PASS (100% IDENTICAL)" if (match_clicks and match_ledger) else "FAIL"
    if not (match_clicks and match_ledger):
        all_passed = False

    print(f"Tile: {tid}")
    print(f"  Stored in review_queue : Conf = {expected_conf:.8f}, Drift = {expected_drift:.8f}")
    print(f"  Click 1 Response       : Conf = {c1['confidence']:.8f}, Drift = {c1['drift']:.8f}")
    print(f"  Click 2 Response       : Conf = {c2['confidence']:.8f}, Drift = {c2['drift']:.8f}")
    print(f"  Consistency Check      : {status}")
    print("--------------------------------------------------------------------------------")

print(f"\nFINAL VERDICT: {'ALL 3 CANDIDATES IDENTICAL ACROSS CLICKS AND LEDGER' if all_passed else 'MISMATCH FOUND'}")
print("================================================================================\n")
