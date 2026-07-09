"""Pydantic DTOs for Alert entity."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    severity: str = Field(..., pattern="^(critical|warning|info)$")
    category: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1)
    impact: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    metric: Optional[str] = Field(None, max_length=100)
    metric_label: Optional[str] = Field(None, max_length=100)
    alert_date: str = Field(..., pattern="^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD


class AlertUpdate(BaseModel):
    severity: Optional[str] = Field(None, pattern="^(critical|warning|info)$")
    category: Optional[str] = Field(None, max_length=50)
    title: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    metric: Optional[str] = Field(None, max_length=100)
    metric_label: Optional[str] = Field(None, max_length=100)
    alert_date: Optional[str] = Field(None, pattern="^\d{4}-\d{2}-\d{2}$")


class AlertResolve(BaseModel):
    resolved_by: str = Field(..., min_length=1, max_length=200)


class AlertResponse(BaseModel):
    id: str
    project_id: str
    severity: str
    category: str
    title: str
    description: str
    impact: str
    recommendation: str
    metric: Optional[str]
    metric_label: Optional[str]
    alert_date: str
    resolved: bool
    resolved_at: Optional[datetime]
    resolved_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertSummaryResponse(BaseModel):
    """Lightweight alert summary for listing."""
    id: str
    severity: str
    category: str
    title: str
    alert_date: str
    resolved: bool

    model_config = {"from_attributes": True}
