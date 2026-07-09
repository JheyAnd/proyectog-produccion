"""Pydantic DTOs for Cash Flow."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class CashFlowEntryCreate(BaseModel):
    year: int = Field(..., ge=2020, le=2050)
    month: int = Field(..., ge=1, le=12)
    projected_income: Decimal = Field(default=Decimal("0.00"), ge=0)
    projected_expense: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None


class CashFlowEntryUpdate(BaseModel):
    projected_income: Optional[Decimal] = Field(None, ge=0)
    projected_expense: Optional[Decimal] = Field(None, ge=0)
    actual_income: Optional[Decimal] = Field(None, ge=0)
    actual_expense: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None


class CashFlowEntryResponse(BaseModel):
    id: str
    project_id: str
    year: int
    month: int
    period_label: str
    projected_income: Decimal
    projected_expense: Decimal
    projected_net: Decimal
    actual_income: Decimal
    actual_expense: Decimal
    actual_net: Decimal
    income_variance: Decimal
    expense_variance: Decimal
    net_variance: Decimal
    is_negative_cash_flow: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CashFlowSummaryResponse(BaseModel):
    project_id: str
    total_projected_income: Decimal
    total_projected_expense: Decimal
    total_actual_income: Decimal
    total_actual_expense: Decimal
    cumulative_projected_net: Decimal
    cumulative_actual_net: Decimal
    months_with_negative_forecast: int
    entries: List[CashFlowEntryResponse]
