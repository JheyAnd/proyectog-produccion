"""Pydantic DTOs for Budget entity."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class BudgetItemCreate(BaseModel):
    wbs_item_id: str
    code: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=500)
    category: str  # BudgetCategory value
    cost_type: str = "direct"
    original_amount: Decimal = Field(..., ge=0, decimal_places=2)
    unit: Optional[str] = Field(None, max_length=50)
    quantity: Decimal = Field(default=Decimal("1.00"), ge=0)
    unit_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None


class BudgetItemUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=500)
    approved_changes: Optional[Decimal] = None
    committed_amount: Optional[Decimal] = None
    actual_amount: Optional[Decimal] = None
    notes: Optional[str] = None


class BudgetItemResponse(BaseModel):
    id: str
    project_id: str
    wbs_item_id: str
    code: str
    description: str
    category: str
    cost_type: str
    original_amount: Decimal
    approved_changes: Decimal
    current_budget: Decimal
    committed_amount: Decimal
    actual_amount: Decimal
    available_budget: Decimal
    cost_variance: Decimal
    cost_variance_percentage: Decimal
    budget_consumption_percentage: Decimal
    is_over_budget: bool
    unit: Optional[str]
    quantity: Decimal
    unit_price: Decimal
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetSummaryResponse(BaseModel):
    """Aggregated budget summary for a project."""
    project_id: str
    total_original_budget: Decimal
    total_approved_changes: Decimal
    total_current_budget: Decimal
    total_committed: Decimal
    total_actual: Decimal
    total_available: Decimal
    overall_consumption_percentage: Decimal
    items_over_budget: int
    items_near_limit: int
