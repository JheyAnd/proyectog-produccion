"""SQLAlchemy ORM model for Budget Items."""
from typing import Optional
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


class BudgetItemModel(Base):
    __tablename__ = "budget_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    wbs_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("wbs_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    cost_type: Mapped[str] = mapped_column(String(20), default="direct")
    original_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    approved_changes: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    committed_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    actual_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), default=1.00)
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    project = relationship("ProjectModel", back_populates="budget_items")
    wbs_item = relationship("WBSItemModel", back_populates="budget_items")
