from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

JSONType = JSON().with_variant(JSONB(), "postgresql")
TS = DateTime(timezone=True)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Mall(Base):
    __tablename__ = "malls"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | paused
    draft_json: Mapped[dict] = mapped_column(JSONType)
    # Contador monotônico usado para compare-and-swap: dois admins nunca sobrescrevem um ao outro em silêncio.
    draft_rev: Mapped[int] = mapped_column(Integer, default=1)
    draft_updated_at: Mapped[datetime] = mapped_column(TS, default=utcnow)
    draft_updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    live_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TS, default=utcnow)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))  # master | mall_admin
    mall_id: Mapped[str | None] = mapped_column(ForeignKey("malls.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    # Incrementar invalida todos os tokens já emitidos para este usuário.
    token_version: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(TS, default=utcnow)


class MapVersion(Base):
    """Versão publicada. Imutável: nunca sofre UPDATE depois de criada."""

    __tablename__ = "map_versions"
    __table_args__ = (UniqueConstraint("mall_id", "version", name="uq_mall_version"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    mall_id: Mapped[str] = mapped_column(ForeignKey("malls.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    package_json: Mapped[dict] = mapped_column(JSONType)
    content_hash: Mapped[str] = mapped_column(String(64))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    published_at: Mapped[datetime] = mapped_column(TS, default=utcnow)


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (Index("ix_feedback_mall_status", "mall_id", "status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    mall_id: Mapped[str] = mapped_column(ForeignKey("malls.id"))
    created_at: Mapped[datetime] = mapped_column(TS, default=utcnow)
    category: Mapped[str] = mapped_column(String(40))
    message: Mapped[str] = mapped_column(Text)
    route_context: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="new")  # new | triaged | done
