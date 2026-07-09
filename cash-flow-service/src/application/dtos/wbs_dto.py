"""Pydantic DTOs for WBS entity."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class WBSItemCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, examples=["1.2.3"])
    name: str = Field(..., min_length=1, max_length=200)
    level: str  # WBSLevel value
    parent_id: Optional[str] = None
    description: Optional[str] = Field(None, max_length=1000)
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    weight: Decimal = Field(default=Decimal("1.00"), ge=0)
    sort_order: int = Field(default=0, ge=0)


class WBSItemUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    actual_progress: Optional[Decimal] = Field(None, ge=0, le=100)
    planned_progress: Optional[Decimal] = Field(None, ge=0, le=100)
    weight: Optional[Decimal] = Field(None, ge=0)
    sort_order: Optional[int] = Field(None, ge=0)


class WBSItemResponse(BaseModel):
    id: str
    project_id: str
    code: str
    name: str
    level: str
    parent_id: Optional[str]
    description: Optional[str]
    planned_start_date: Optional[date]
    planned_end_date: Optional[date]
    actual_start_date: Optional[date]
    actual_end_date: Optional[date]
    planned_progress: Decimal
    actual_progress: Decimal
    progress_deviation: Decimal
    is_behind_schedule: bool
    weight: Decimal
    status: str
    sort_order: int
    planned_duration_days: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WBSTreeNode(BaseModel):
    """WBS item with nested children for tree display."""
    item: WBSItemResponse
    children: List["WBSTreeNode"] = []

    model_config = {"from_attributes": True}
