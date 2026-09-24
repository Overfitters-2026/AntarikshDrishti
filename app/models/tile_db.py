from pathlib import Path
import aiosqlite

DB_PATH = Path("data/geo_system.db")


async def _column_exists(db: aiosqlite.Connection, table: str, column: str) -> bool:
    cursor = await db.execute(f"PRAGMA table_info({table})")
    columns = await cursor.fetchall()
    return any(col[1] == column for col in columns)


async def init_db():
    """Initializes the SQLite audit database and ensures required directories exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
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