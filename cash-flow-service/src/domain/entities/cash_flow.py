"""
Domain Entity: CashFlowForecast (Proyección de Flujo de Caja)
Monthly cash flow projections vs actuals for project financial planning.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4


class CashFlowType(str, enum.Enum):
    FORECAST = "forecast"  # Proyección
    ACTUAL = "actual"      # Real


@dataclass
class CashFlowEntry:
    """
    Represents a monthly cash flow entry (projected or actual).
    Each entry covers a specific year/month for a project.
    """
    project_id: UUID
    year: int
    month: int  # 1-12
    flow_type: CashFlowType
    id: UUID = field(default_factory=uuid4)
    projected_income: Decimal = Decimal("0.00")
    projected_expense: Decimal = Decimal("0.00")
    actual_income: Decimal = Decimal("0.00")
    actual_expense: Decimal = Decimal("0.00")
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # --- Domain Logic ---

    @property
    def projected_net(self) -> Decimal:
        """Net projected cash flow for the month."""
        return self.projected_income - self.projected_expense

    @property
    def actual_net(self) -> Decimal:
        """Net actual cash flow for the month."""
        return self.actual_income - self.actual_expense

    @property
    def income_variance(self) -> Decimal:
        """Variance: Actual - Projected income (+ = favorable)."""
        return self.actual_income - self.projected_income

    @property
    def expense_variance(self) -> Decimal:
        """Variance: Projected - Actual expense (+ = favorable, spent less)."""
        return self.projected_expense - self.actual_expense

    @property
    def net_variance(self) -> Decimal:
        return self.actual_net - self.projected_net

    @property
    def is_negative_cash_flow(self) -> bool:
        """Alert trigger: next month projected cash flow is negative."""
        return self.projected_net < Decimal("0.00")

    @property
    def period_label(self) -> str:
        return f"{self.year}-{self.month:02d}"

    def validate(self) -> List[str]:
        errors = []
        if not (1 <= self.month <= 12):
            errors.append("Month must be between 1 and 12.")
        if self.year < 2020 or self.year > 2050:
            errors.append("Year must be between 2020 and 2050.")
        return errors


@dataclass
class CashFlowSummary:
    """
    Aggregated cash flow summary for a project across all periods.
    Used in reporting.
    """
    project_id: UUID
    entries: List[CashFlowEntry] = field(default_factory=list)

    @property
    def total_projected_income(self) -> Decimal:
        return sum((e.projected_income for e in self.entries), Decimal("0.00"))

    @property
    def total_projected_expense(self) -> Decimal:
        return sum((e.projected_expense for e in self.entries), Decimal("0.00"))

    @property
    def total_actual_income(self) -> Decimal:
        return sum((e.actual_income for e in self.entries), Decimal("0.00"))

    @property
    def total_actual_expense(self) -> Decimal:
        return sum((e.actual_expense for e in self.entries), Decimal("0.00"))

    @property
    def cumulative_projected_net(self) -> Decimal:
        return self.total_projected_income - self.total_projected_expense

    @property
    def cumulative_actual_net(self) -> Decimal:
        return self.total_actual_income - self.total_actual_expense

    def get_months_with_negative_forecast(self) -> List[CashFlowEntry]:
        return [e for e in self.entries if e.is_negative_cash_flow]
