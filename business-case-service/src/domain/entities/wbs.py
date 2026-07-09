"""
Domain Entity: Work Breakdown Structure (WBS / EDT)
Hierarchical decomposition of project work for electrical construction.
Typical structure for electrical projects:
  1. Ingeniería (Engineering)
  2. Montaje (Assembly/Installation)
  3. Tableros (Electrical Panels)
  4. Cableado (Wiring)
  5. Puesta en Marcha (Commissioning)
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4


class WBSLevel(str, enum.Enum):
    CHAPTER = "chapter"           # Capítulo (e.g., "Montaje Eléctrico")
    SUB_CHAPTER = "sub_chapter"   # Subcapítulo (e.g., "Montaje de Tableros")
    WORK_PACKAGE = "work_package" # Partida (e.g., "Instalación Tablero Principal")
    ACTIVITY = "activity"         # Actividad (e.g., "Cableado de potencia")


class WBSStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


@dataclass
class WBSItem:
    """
    Represents a node in the Work Breakdown Structure.
    Self-referencing hierarchy: each item can have a parent and children.
    """
    project_id: UUID
    code: str           # WBS code (e.g., "1.2.3")
    name: str
    level: WBSLevel
    id: UUID = field(default_factory=uuid4)
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    planned_progress: Decimal = Decimal("0.00")  # 0-100%
    actual_progress: Decimal = Decimal("0.00")    # 0-100%
    weight: Decimal = Decimal("1.00")  # Weight for weighted progress calculation
    status: WBSStatus = WBSStatus.NOT_STARTED
    sort_order: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # --- Domain Logic ---

    @property
    def progress_deviation(self) -> Decimal:
        """Deviation between planned and actual progress (negative = behind schedule)."""
        return self.actual_progress - self.planned_progress

    @property
    def is_behind_schedule(self) -> bool:
        return self.progress_deviation < Decimal("-5.00")  # >5% behind

    @property
    def planned_duration_days(self) -> Optional[int]:
        if self.planned_start_date and self.planned_end_date:
            return (self.planned_end_date - self.planned_start_date).days
        return None

    def update_progress(self, new_progress: Decimal) -> None:
        if not (Decimal("0") <= new_progress <= Decimal("100")):
            raise ValueError("Progress must be between 0 and 100.")
        self.actual_progress = new_progress
        if new_progress == Decimal("100"):
            self.status = WBSStatus.COMPLETED
            self.actual_end_date = self.actual_end_date or date.today()
        elif new_progress > Decimal("0") and self.status == WBSStatus.NOT_STARTED:
            self.status = WBSStatus.IN_PROGRESS
            self.actual_start_date = self.actual_start_date or date.today()
        self.updated_at = datetime.utcnow()

    def validate(self) -> List[str]:
        errors = []
        if not self.code.strip():
            errors.append("WBS code is required.")
        if not self.name.strip():
            errors.append("WBS item name is required.")
        if self.planned_start_date and self.planned_end_date:
            if self.planned_end_date < self.planned_start_date:
                errors.append("End date must be after start date.")
        return errors
