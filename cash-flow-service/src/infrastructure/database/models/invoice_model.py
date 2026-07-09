"""SQLAlchemy ORM model for Invoices."""
from typing import Optional
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


class InvoiceModel(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invoice_type: Mapped[str] = mapped_column(String(10), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    counterparty_name: Mapped[str] = mapped_column(String(200), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    retention_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    amount_paid: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    certification_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    project = relationship("ProjectModel", back_populates="invoices")
    line_items = relationship("InvoiceLineItemModel", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItemModel(Base):
    __tablename__ = "invoice_line_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    invoice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00)
    wbs_item_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("wbs_items.id", ondelete="SET NULL"), nullable=True
    )
    budget_item_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("budget_items.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    invoice = relationship("InvoiceModel", back_populates="line_items")
