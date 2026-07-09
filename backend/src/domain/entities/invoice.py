"""
Domain Entity: Invoice (Factura)
Handles both client invoices (outgoing) and supplier invoices (incoming).
Tracks billing lifecycle: draft -> sent -> partially_paid -> paid.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4


class InvoiceType(str, enum.Enum):
    CLIENT = "client"       # Factura emitida al cliente
    SUPPLIER = "supplier"   # Factura recibida de proveedor


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"               # Emitida / Recibida
    PARTIALLY_PAID = "partial"  # Parcialmente pagada
    PAID = "paid"               # Pagada totalmente
    OVERDUE = "overdue"         # Vencida
    CANCELLED = "cancelled"


@dataclass
class InvoiceLineItem:
    """A line item within an invoice."""
    description: str
    quantity: Decimal
    unit_price: Decimal
    id: UUID = field(default_factory=uuid4)
    wbs_item_id: Optional[UUID] = None
    budget_item_id: Optional[UUID] = None
    tax_rate: Decimal = Decimal("0.00")  # e.g., 16.00 for 16%

    @property
    def subtotal(self) -> Decimal:
        return (self.quantity * self.unit_price).quantize(Decimal("0.01"))

    @property
    def tax_amount(self) -> Decimal:
        return (self.subtotal * self.tax_rate / 100).quantize(Decimal("0.01"))

    @property
    def total(self) -> Decimal:
        return self.subtotal + self.tax_amount


@dataclass
class Invoice:
    """
    Represents an invoice (client or supplier) associated with a project.
    """
    project_id: UUID
    invoice_type: InvoiceType
    invoice_number: str
    counterparty_name: str  # Client or Supplier
    issue_date: date
    due_date: date
    id: UUID = field(default_factory=uuid4)
    line_items: List[InvoiceLineItem] = field(default_factory=list)
    status: InvoiceStatus = InvoiceStatus.DRAFT
    tax_id: Optional[str] = None         # RIF / NIT of counterparty
    retention_percentage: Decimal = Decimal("0.00")
    amount_paid: Decimal = Decimal("0.00")
    payment_terms: Optional[str] = None  # e.g., "Net 30"
    certification_number: Optional[str] = None  # For client invoices tied to certifications
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # --- Domain Logic ---

    @property
    def subtotal(self) -> Decimal:
        return sum((item.subtotal for item in self.line_items), Decimal("0.00"))

    @property
    def total_tax(self) -> Decimal:
        return sum((item.tax_amount for item in self.line_items), Decimal("0.00"))

    @property
    def gross_total(self) -> Decimal:
        return self.subtotal + self.total_tax

    @property
    def retention_amount(self) -> Decimal:
        return (self.gross_total * self.retention_percentage / 100).quantize(Decimal("0.01"))

    @property
    def net_total(self) -> Decimal:
        """Total after retention."""
        return self.gross_total - self.retention_amount

    @property
    def balance_due(self) -> Decimal:
        return self.net_total - self.amount_paid

    @property
    def is_fully_paid(self) -> bool:
        return self.balance_due <= Decimal("0.00")

    @property
    def is_overdue(self) -> bool:
        return (
            not self.is_fully_paid
            and self.status not in (InvoiceStatus.PAID, InvoiceStatus.CANCELLED)
            and date.today() > self.due_date
        )

    @property
    def days_until_due(self) -> int:
        return (self.due_date - date.today()).days

    @property
    def is_client_invoice(self) -> bool:
        return self.invoice_type == InvoiceType.CLIENT

    def register_payment(self, amount: Decimal) -> None:
        if amount <= 0:
            raise ValueError("Payment amount must be positive.")
        self.amount_paid += amount
        if self.is_fully_paid:
            self.status = InvoiceStatus.PAID
        else:
            self.status = InvoiceStatus.PARTIALLY_PAID
        self.updated_at = datetime.utcnow()

    def add_line_item(self, item: InvoiceLineItem) -> None:
        self.line_items.append(item)
        self.updated_at = datetime.utcnow()

    def validate(self) -> List[str]:
        errors = []
        if not self.invoice_number.strip():
            errors.append("Invoice number is required.")
        if self.due_date < self.issue_date:
            errors.append("Due date cannot be before issue date.")
        if not self.line_items:
            errors.append("Invoice must have at least one line item.")
        return errors
