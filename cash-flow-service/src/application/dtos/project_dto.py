"""Pydantic DTOs for Project entity."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, examples=["Patio Sur"])
    code: str = Field(..., min_length=1, max_length=50, examples=["PS-001"])
    description: str = Field(..., min_length=1, max_length=2000)
    client_name: str = Field(..., min_length=1, max_length=200)
    start_date: date
    estimated_end_date: date
    total_budget: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="USD", pattern="^(USD|VES|COP)$")
    location: Optional[str] = Field(None, max_length=500)
    project_manager: Optional[str] = Field(None, max_length=200)

    @field_validator("estimated_end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if "start_date" in info.data and v <= info.data["start_date"]:
            raise ValueError("Estimated end date must be after start date.")
        return v


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    client_name: Optional[str] = Field(None, max_length=200)
    estimated_end_date: Optional[date] = None
    total_budget: Optional[Decimal] = Field(None, gt=0)
    status: Optional[str] = None
    location: Optional[str] = Field(None, max_length=500)
    project_manager: Optional[str] = Field(None, max_length=200)
    costo_facturado: Optional[Decimal] = Field(None, ge=0)
    costo_pagado: Optional[Decimal] = Field(None, ge=0)


class ProjectRealCostsUpdate(BaseModel):
    costo_facturado: Decimal = Field(..., ge=0)
    costo_pagado: Decimal = Field(..., ge=0)


class ProjectResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str
    client_name: str
    start_date: date
    estimated_end_date: date
    actual_end_date: Optional[date] = None
    total_budget: Decimal
    currency: str
    status: str
    location: Optional[str] = None
    project_manager: Optional[str] = None
    costo_facturado: Decimal = Decimal("0.00")
    costo_pagado: Decimal = Decimal("0.00")
    company_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectSummaryResponse(BaseModel):
    """Lightweight project summary for listing."""
    id: str
    name: str
    code: str
    client_name: str
    status: str
    total_budget: Decimal
    start_date: date
    estimated_end_date: date
    description: str = ""
    company_id: Optional[int] = None
    semana_actual: Optional[int] = None
    avance_planificado: Optional[float] = None
    avance_real: Optional[float] = None
    spi: Optional[float] = None

    model_config = {"from_attributes": True}


