"""SQLAlchemy ORM model for WBS Items."""
from typing import Optional
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


class WBSItemModel(Base):
    __tablename__ = "wbs_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    planned_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    planned_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    planned_progress: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    actual_progress: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    weight: Mapped[float] = mapped_column(Numeric(5, 2), default=1.00)
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    project = relationship("ProjectModel", back_populates="wbs_items")
    parent = relationship("WBSItemModel", remote_side=[id], backref="children")
    budget_items = relationship("BudgetItemModel", back_populates="wbs_item")
