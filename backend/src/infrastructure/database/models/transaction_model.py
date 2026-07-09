"""SQLAlchemy ORM model for Transactions."""
from typing import Optional
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


class TransactionModel(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    wbs_item_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True
    )
    budget_item_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("budget_items.id", ondelete="SET NULL"), nullable=True
    )
    invoice_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True
    )
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    counterparty: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tax_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    retention_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    project = relationship("ProjectModel", back_populates="transactions")
