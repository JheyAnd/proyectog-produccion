"""
Domain Entity: Project (Proyecto)
Represents an electrical construction project like "Patio Sur".
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Currency(str, enum.Enum):
    USD = "USD"
    VES = "VES"  # Bolívar venezolano
    COP = "COP"  # Peso colombiano


@dataclass
class Project:
    """
    Aggregate Root: Project
    Core entity representing an electrical construction project.
    """
    name: str
    code: str  # Unique project code (e.g., "PS-001")
    description: str
    client_name: str
    start_date: date
    estimated_end_date: date
    total_budget: Decimal
    currency: Currency = Currency.USD
    status: ProjectStatus = ProjectStatus.PLANNING
    id: UUID = field(default_factory=uuid4)
    actual_end_date: Optional[date] = None
    location: Optional[str] = None
    project_manager: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # --- Domain Logic ---

    @property
    def is_active(self) -> bool:
        return self.status in (ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS)

    @property
    def duration_days(self) -> int:
        end = self.actual_end_date or self.estimated_end_date
        return (end - self.start_date).days

    @property
    def elapsed_days(self) -> int:
        today = date.today()
        if today < self.start_date:
            return 0
        end = min(today, self.actual_end_date or self.estimated_end_date)
        return (end - self.start_date).days

    @property
    def time_progress_percentage(self) -> Decimal:
        if self.duration_days == 0:
            return Decimal("0")
        return Decimal(str(self.elapsed_days / self.duration_days * 100)).quantize(Decimal("0.01"))

    def validate(self) -> List[str]:
        errors = []
        if self.total_budget <= 0:
            errors.append("Total budget must be positive.")
        if self.estimated_end_date <= self.start_date:
            errors.append("Estimated end date must be after start date.")
        if not self.name.strip():
            errors.append("Project name is required.")
        if not self.code.strip():
            errors.append("Project code is required.")
        return errors

    def mark_in_progress(self) -> None:
        if self.status != ProjectStatus.PLANNING:
            raise ValueError(f"Cannot start project in status {self.status.value}")
        self.status = ProjectStatus.IN_PROGRESS
        self.updated_at = datetime.utcnow()

    def complete(self, actual_end: Optional[date] = None) -> None:
        self.status = ProjectStatus.COMPLETED
        self.actual_end_date = actual_end or date.today()
        self.updated_at = datetime.utcnow()
