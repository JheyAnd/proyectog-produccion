"""Pydantic DTOs for Invoice entity."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class InvoiceLineItemCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    wbs_item_id: Optional[str] = None
    budget_item_id: Optional[str] = None
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0)


class InvoiceCreate(BaseModel):
    invoice_type: str  # "client" or "supplier"
    invoice_number: str = Field(..., min_length=1, max_length=100)
    counterparty_name: str = Field(..., min_length=1, max_length=200)
    issue_date: date
    due_date: date
    line_items: List[InvoiceLineItemCreate] = Field(..., min_length=1)
    tax_id: Optional[str] = Field(None, max_length=50)
    retention_percentage: Decimal = Field(default=Decimal("0.00"), ge=0)
    payment_terms: Optional[str] = None
    certification_number: Optional[str] = None
    notes: Optional[str] = None


class InvoiceLineItemResponse(BaseModel):
    id: str
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    wbs_item_id: Optional[str]
    budget_item_id: Optional[str]


class InvoiceResponse(BaseModel):
    id: str
    project_id: str
    invoice_type: str
    invoice_number: str
    counterparty_name: str
    issue_date: date
    due_date: date
    status: str
    line_items: List[InvoiceLineItemResponse]
    subtotal: Decimal
    total_tax: Decimal
    gross_total: Decimal
    retention_percentage: Decimal
    retention_amount: Decimal
    net_total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    is_overdue: bool
    days_until_due: int
    tax_id: Optional[str]
    payment_terms: Optional[str]
    certification_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentRegister(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_date: Optional[date] = None
    reference: Optional[str] = None
