"""Pydantic DTOs for Transaction entity."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class TransactionCreate(BaseModel):
    transaction_type: str  # "income" or "expense"
    category: str
    description: str = Field(..., min_length=1, max_length=500)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    transaction_date: date
    wbs_item_id: Optional[str] = None
    budget_item_id: Optional[str] = None
    invoice_id: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    counterparty: Optional[str] = Field(None, max_length=200)
    due_date: Optional[date] = None
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    retention_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None

    @field_validator("due_date")
    @classmethod
    def due_after_transaction(cls, v, info):
        if v and "transaction_date" in info.data and v < info.data["transaction_date"]:
            raise ValueError("Due date cannot be before transaction date.")
        return v


class TransactionUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=500)
    amount: Optional[Decimal] = Field(None, gt=0)
    status: Optional[str] = None
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    project_id: str
    transaction_type: str
    category: str
    description: str
    amount: Decimal
    net_amount: Decimal
    signed_amount: Decimal
    transaction_date: date
    wbs_item_id: Optional[str]
    budget_item_id: Optional[str]
    invoice_id: Optional[str]
    reference_number: Optional[str]
    counterparty: Optional[str]
    status: str
    due_date: Optional[date]
    payment_date: Optional[date]
    tax_amount: Decimal
    retention_amount: Decimal
    is_overdue: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
