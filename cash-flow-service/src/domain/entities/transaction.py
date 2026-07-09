"""
Domain Entity: Transaction (Transacción Financiera)
Generic financial transaction that can be an Income (Ingreso) or Expense (Egreso).
Covers: Certificaciones, Facturación, OC, Pagos, Nómina, Subcontratos.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4


class TransactionType(str, enum.Enum):
    INCOME = "income"    # Ingreso
    EXPENSE = "expense"  # Egreso


class IncomeCategory(str, enum.Enum):
    CERTIFICATION = "certification"  # Certificación de obra
    ADVANCE_PAYMENT = "advance"      # Anticipo del cliente
    INVOICE_PAYMENT = "payment"      # Cobro de factura
    RETENTION_RELEASE = "retention"  # Liberación de retención
    OTHER_INCOME = "other"


class ExpenseCategory(str, enum.Enum):
    PURCHASE_ORDER = "purchase_order"  # Orden de compra
    MATERIAL_RECEIPT = "material"      # Recepción de materiales
    SUPPLIER_INVOICE = "supplier_inv"  # Factura de proveedor
    PAYMENT_MADE = "payment"           # Pago realizado
    PAYROLL = "payroll"                # Nómina / Mano de obra
    SUBCONTRACT = "subcontract"        # Subcontrato
    EQUIPMENT_RENTAL = "equipment"     # Alquiler de equipos
    INDIRECT_EXPENSE = "indirect"      # Gasto indirecto
    OTHER_EXPENSE = "other"


class TransactionStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


@dataclass
class Transaction:
    """
    Represents a financial movement associated with a project.
    Can track both income and expense flows.
    """
    project_id: UUID
    transaction_type: TransactionType
    category: str  # IncomeCategory or ExpenseCategory value
    description: str
    amount: Decimal
    transaction_date: date
    id: UUID = field(default_factory=uuid4)
    wbs_item_id: Optional[UUID] = None
    budget_item_id: Optional[UUID] = None
    invoice_id: Optional[UUID] = None
    reference_number: Optional[str] = None  # Doc reference (OC number, etc.)
    counterparty: Optional[str] = None      # Client or Supplier name
    status: TransactionStatus = TransactionStatus.DRAFT
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    tax_amount: Decimal = Decimal("0.00")
    retention_amount: Decimal = Decimal("0.00")  # Retención
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # --- Domain Logic ---

    @property
    def net_amount(self) -> Decimal:
        """Amount after taxes and retentions."""
        return self.amount + self.tax_amount - self.retention_amount

    @property
    def is_income(self) -> bool:
        return self.transaction_type == TransactionType.INCOME

    @property
    def is_expense(self) -> bool:
        return self.transaction_type == TransactionType.EXPENSE

    @property
    def is_overdue(self) -> bool:
        if self.due_date and self.status not in (TransactionStatus.PAID, TransactionStatus.CANCELLED):
            return date.today() > self.due_date
        return False

    @property
    def days_until_due(self) -> Optional[int]:
        if self.due_date:
            return (self.due_date - date.today()).days
        return None

    @property
    def signed_amount(self) -> Decimal:
        """Positive for income, negative for expense."""
        if self.is_income:
            return self.net_amount
        return -self.net_amount

    def approve(self) -> None:
        if self.status != TransactionStatus.PENDING:
            raise ValueError(f"Cannot approve transaction in status {self.status.value}")
        self.status = TransactionStatus.APPROVED
        self.updated_at = datetime.utcnow()

    def mark_paid(self, payment_date: Optional[date] = None) -> None:
        self.status = TransactionStatus.PAID
        self.payment_date = payment_date or date.today()
        self.updated_at = datetime.utcnow()

    def validate(self) -> List[str]:
        errors = []
        if self.amount <= 0:
            errors.append("Amount must be positive.")
        if not self.description.strip():
            errors.append("Description is required.")
        if self.due_date and self.due_date < self.transaction_date:
            errors.append("Due date cannot be before transaction date.")
        return errors
