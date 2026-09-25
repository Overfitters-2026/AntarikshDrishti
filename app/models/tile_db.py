from pathlib import Path
import aiosqlite

DB_PATH = Path("data/geo_system.db")


async def _column_exists(db: aiosqlite.Connection, table: str, column: str) -> bool:
    cursor = await db.execute(f"PRAGMA table_info({table})")
    columns = await cursor.fetchall()
    return any(col[1] == column for col in columns)


def _is_lfs_pointer(path: Path) -> bool:
    if not path.exists() or not path.is_file():
        return False
    try:
        if path.stat().st_size < 1000:
            with open(path, "rb") as f:
                header = f.read(50)
                return header.startswith(b"version https://git-lfs")
    except Exception:
        pass
    return False


async def init_db():
    """Initializes the SQLite audit database and ensures required directories exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _is_lfs_pointer(DB_PATH):
        try:
            DB_PATH.unlink()
        except Exception:
            pass

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS tile_audit (
                id TEXT PRIMARY KEY,
                image_path TEXT NOT NULL,
                primary_tag TEXT DEFAULT 'unassigned',
                cluster INTEGER DEFAULT 0,
                anomaly_score REAL DEFAULT 0.0,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                before_desc TEXT,
                after_desc TEXT,
                before_image_path TEXT,
                after_image_path TEXT,
                sensor TEXT,
                date TEXT
            )
            """
        )

        new_columns = [
            ("before_desc", "TEXT"),
            ("after_desc", "TEXT"),
            ("before_image_path", "TEXT"),
            ("after_image_path", "TEXT"),
            ("sensor", "TEXT"),
            ("date", "TEXT"),
        ]
        for col_name, col_type in new_columns:
            if not await _column_exists(db, "tile_audit", col_name):
                await db.execute(f"ALTER TABLE tile_audit ADD COLUMN {col_name} {col_type}")

        cursor = await db.execute("SELECT COUNT(*) FROM tile_audit")
        row_count = (await cursor.fetchone())[0]
        if row_count == 0:
            default_candidates = [
                (
                    "mumbai_2023-12-08_s2_r256_c256_2023-12-08__mumbai_2024-12-17_s2_r256_c256_2024-12-17",
                    "/storage/tiles/mumbai_cand1_high_change_2024-12-17_after.png",
                    "detected-change",
                    1,
                    0.5999,
                    "pending",
                    "Airport runway & terminal infrastructure baseline (2023-12-08)",
                    "Runway expansion & taxiway construction activity (2024-12-17)",
                    "/storage/tiles/mumbai_cand1_high_change_2023-12-08_before.png",
                    "/storage/tiles/mumbai_cand1_high_change_2024-12-17_after.png",
                    "Sentinel-2 (L2A)",
                    "2024-12-17",
                ),
                (
                    "mumbai_2023-12-08_s2_r0_c256_2023-12-08__mumbai_2024-12-17_s2_r0_c256_2024-12-17",
                    "/storage/tiles/mumbai_cand2_coastal_change_2024-12-17_after.png",
                    "coastal-change",
                    2,
                    0.2416,
                    "pending",
                    "Intertidal mudflats & coastal baseline (2023-12-08)",
                    "Coastal road reclamation & seawall progress (2024-12-17)",
                    "/storage/tiles/mumbai_cand2_coastal_change_2023-12-08_before.png",
                    "/storage/tiles/mumbai_cand2_coastal_change_2024-12-17_after.png",
                    "Sentinel-2 (L2A)",
                    "2024-12-17",
                ),
                (
                    "mumbai_2023-12-08_s2_r512_c256_2023-12-08__mumbai_2024-12-17_s2_r512_c256_2024-12-17",
                    "/storage/tiles/mumbai_cand3_urban_change_2024-12-17_after.png",
                    "urban-change",
                    3,
                    0.2051,
                    "pending",
                    "Open parcel & vegetative cover (2023-12-08)",
                    "High-density building foundation development (2024-12-17)",
                    "/storage/tiles/mumbai_cand3_urban_change_2023-12-08_before.png",
                    "/storage/tiles/mumbai_cand3_urban_change_2024-12-17_after.png",
                    "Sentinel-2 (L2A)",
                    "2024-12-17",
                ),
            ]
            await db.executemany(
                """
                INSERT OR IGNORE INTO tile_audit (
                    id, image_path, primary_tag, cluster, anomaly_score, status,
                    before_desc, after_desc, before_image_path, after_image_path,
                    sensor, date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                default_candidates
            )

        await db.commit()


async def record_tile(
    tile_id: str,
    path: str,
    tag: str = "unassigned",
    cluster: int = 0,
    score: float = 0.0,
    status: str = "pending",
    before_desc: str | None = None,
    after_desc: str | None = None,
    before_image_path: str | None = None,
    after_image_path: str | None = None,
    sensor: str | None = None,
    date: str | None = None,
):
    """
    Inserts or updates a tile record in the SQLite ledger.
    Note: 'review_queue' is the authoritative source of truth for change detection.
    'tile_audit' serves as a denormalized cache / read-model for fast UI inspection.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO tile_audit (
                id, image_path, primary_tag, cluster, anomaly_score, status,
                before_desc, after_desc, before_image_path, after_image_path,
                sensor, date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                image_path = excluded.image_path,
                primary_tag = excluded.primary_tag,
                cluster = excluded.cluster,
                anomaly_score = excluded.anomaly_score,
                status = excluded.status,
                before_desc = excluded.before_desc,
                after_desc = excluded.after_desc,
                before_image_path = excluded.before_image_path,
                after_image_path = excluded.after_image_path,
                sensor = COALESCE(excluded.sensor, tile_audit.sensor),
                date = COALESCE(excluded.date, tile_audit.date)
            """,
            (
                tile_id,
                path,
                tag,
                cluster,
                score,
                status,
                before_desc,
                after_desc,
                before_image_path,
                after_image_path,
                sensor,
                date,
            ),
        )
        await db.commit()


async def get_anomalous_tiles(limit: int = 50) -> list[dict]:
    """Fetches tiles for the human-in-the-loop review queue."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT id, image_path, primary_tag, cluster, anomaly_score, status, created_at,
                   before_desc, after_desc, before_image_path, after_image_path, sensor, date
            FROM tile_audit
            WHERE primary_tag != 'unassigned' OR anomaly_score > 0
            ORDER BY anomaly_score DESC, created_at DESC
            LIMIT ?
            """,
            (limit,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def update_tile_status(tile_id: str, status: str):
    """Updates the triage decision (e.g., 'verified' or 'false_positive')."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            UPDATE tile_audit
            SET status = ?
            WHERE id = ?
            """,
            (status, tile_id),
        )
        await db.commit()