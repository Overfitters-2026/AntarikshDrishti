from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings


def _create_engine():
    kwargs: dict = {"echo": settings.DB_ECHO}
    if settings.DATABASE_URL.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs.update(
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_pre_ping=True,
        )
    return create_async_engine(settings.DATABASE_URL, **kwargs)


engine = _create_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class ReviewQueueItem(Base):
    __tablename__ = "review_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    tile_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    t1_tile_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    t2_tile_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING", index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    drift_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_category: Mapped[str] = mapped_column(
        String(128), nullable=False, default="Unclassified Change"
    )
    cloud_qa_pass: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bbox_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provenance_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_t1: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    date_t2: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_review_queue_status_conf", "status", "confidence"),
        Index("idx_review_queue_created", "created_at"),
    )


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    await engine.dispose()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ReviewQueueRepository:
    @staticmethod
    async def create_item(
        session: AsyncSession,
        *,
        tile_id: str,
        status: str = "PENDING",
        confidence: float = 0.0,
        event_id: Optional[str] = None,
        t1_tile_id: Optional[str] = None,
        t2_tile_id: Optional[str] = None,
        drift_score: Optional[float] = None,
        change_category: str = "Unclassified Change",
        cloud_qa_pass: bool = True,
        remarks: Optional[str] = None,
        bbox_json: Optional[str] = None,
        provenance_json: Optional[str] = None,
        date_t1: Optional[str] = None,
        date_t2: Optional[str] = None,
    ) -> ReviewQueueItem:
        now = utc_now()
        eid = event_id or f"evt_{uuid.uuid4().hex[:12]}"
        item = ReviewQueueItem(
            event_id=eid,
            tile_id=tile_id,
            t1_tile_id=t1_tile_id,
            t2_tile_id=t2_tile_id,
            status=status,
            confidence=confidence,
            drift_score=drift_score,
            change_category=change_category,
            cloud_qa_pass=cloud_qa_pass,
            remarks=remarks,
            bbox_json=bbox_json,
            provenance_json=provenance_json,
            date_t1=date_t1,
            date_t2=date_t2,
            created_at=now,
            updated_at=now,
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)
        return item

    @staticmethod
    async def list_items(
        session: AsyncSession,
        *,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ReviewQueueItem]:
        stmt = select(ReviewQueueItem).order_by(ReviewQueueItem.confidence.desc(), ReviewQueueItem.created_at.desc())
        if status:
            stmt = stmt.where(ReviewQueueItem.status == status)
        stmt = stmt.limit(limit).offset(offset)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_event_id(session: AsyncSession, event_id: str) -> Optional[ReviewQueueItem]:
        result = await session.execute(
            select(ReviewQueueItem).where(ReviewQueueItem.event_id == event_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_item(session: AsyncSession, item_id: int) -> Optional[ReviewQueueItem]:
        result = await session.execute(
            select(ReviewQueueItem).where(ReviewQueueItem.id == item_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_by_event_id(
        session: AsyncSession,
        event_id: str,
        *,
        status: Optional[str] = None,
        confidence: Optional[float] = None,
        remarks: Optional[str] = None,
    ) -> Optional[ReviewQueueItem]:
        item = await ReviewQueueRepository.get_by_event_id(session, event_id)
        if item is None:
            return None

        if status is not None:
            item.status = status
        if confidence is not None:
            item.confidence = confidence
        if remarks is not None:
            item.remarks = remarks
        item.updated_at = utc_now()

        await session.commit()
        await session.refresh(item)
        return item

    @staticmethod
    async def bulk_create(session: AsyncSession, items: list[dict]) -> int:
        if not items:
            return 0

        now = utc_now()
        created_count = 0
        
        # Collect all event_ids
        event_ids = [item.get("event_id") for item in items if item.get("event_id")]
        existing_map = {}
        if event_ids:
            stmt = select(ReviewQueueItem).where(ReviewQueueItem.event_id.in_(event_ids))
            res = await session.execute(stmt)
            existing_map = {row.event_id: row for row in res.scalars().all()}

        for item in items:
            eid = item.get("event_id") or f"evt_{uuid.uuid4().hex[:12]}"
            if eid in existing_map:
                # Update existing row
                existing = existing_map[eid]
                existing.confidence = item.get("confidence", existing.confidence)
                existing.drift_score = item.get("drift_score", existing.drift_score)
                existing.change_category = item.get("change_category", existing.change_category)
                existing.cloud_qa_pass = item.get("cloud_qa_pass", existing.cloud_qa_pass)
                existing.remarks = item.get("remarks", existing.remarks)
                existing.updated_at = now
            else:
                session.add(
                    ReviewQueueItem(
                        event_id=eid,
                        tile_id=item["tile_id"],
                        t1_tile_id=item.get("t1_tile_id"),
                        t2_tile_id=item.get("t2_tile_id"),
                        status=item.get("status", "PENDING"),
                        confidence=item.get("confidence", 0.0),
                        drift_score=item.get("drift_score"),
                        change_category=item.get("change_category", "Unclassified Change"),
                        cloud_qa_pass=item.get("cloud_qa_pass", True),
                        remarks=item.get("remarks"),
                        bbox_json=item.get("bbox_json"),
                        provenance_json=item.get("provenance_json"),
                        date_t1=item.get("date_t1"),
                        date_t2=item.get("date_t2"),
                        created_at=now,
                        updated_at=now,
                    )
                )
                created_count += 1

        await session.commit()
        return created_count or len(items)