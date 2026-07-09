"""SQLAlchemy ORM model for Cash Flow entries."""
from typing import Optional
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


class CashFlowEntryModel(Base):
    __tablename__ = "cash_flow_entries"
    __table_args__ = (
        UniqueConstraint("project_id", "year", "month", "flow_type", name="uq_cashflow_period"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    flow_type: Mapped[str] = mapped_column(String(10), nullable=False, default="forecast")
    projected_income: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    projected_expense: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    actual_income: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    actual_expense: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    project = relationship("ProjectModel")
