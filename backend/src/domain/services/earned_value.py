"""
Domain Service: Earned Value Management (EVM)
Calculates key project controlling indicators:
- BCWS (Budgeted Cost of Work Scheduled) / PV (Planned Value)
- BCWP (Budgeted Cost of Work Performed) / EV (Earned Value)
- ACWP (Actual Cost of Work Performed) / AC (Actual Cost)
- CV (Cost Variance), SV (Schedule Variance)
- CPI (Cost Performance Index), SPI (Schedule Performance Index)
- EAC (Estimate at Completion), ETC (Estimate to Complete)
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

TWO_PLACES = Decimal("0.01")


@dataclass(frozen=True)
class EarnedValueMetrics:
    """Immutable value object with all EVM indicators."""
    total_budget: Decimal           # BAC (Budget at Completion)
    planned_value: Decimal          # BCWS / PV
    earned_value: Decimal           # BCWP / EV
    actual_cost: Decimal            # ACWP / AC

    @property
    def cost_variance(self) -> Decimal:
        """CV = EV - AC (positive = under budget)."""
        return (self.earned_value - self.actual_cost).quantize(TWO_PLACES)

    @property
    def schedule_variance(self) -> Decimal:
        """SV = EV - PV (positive = ahead of schedule)."""
        return (self.earned_value - self.planned_value).quantize(TWO_PLACES)

    @property
    def cost_performance_index(self) -> Decimal:
        """CPI = EV / AC (>1 = under budget)."""
        if self.actual_cost == 0:
            return Decimal("0")
        return (self.earned_value / self.actual_cost).quantize(TWO_PLACES, ROUND_HALF_UP)

    @property
    def schedule_performance_index(self) -> Decimal:
        """SPI = EV / PV (>1 = ahead of schedule)."""
        if self.planned_value == 0:
            return Decimal("0")
        return (self.earned_value / self.planned_value).quantize(TWO_PLACES, ROUND_HALF_UP)

    @property
    def estimate_at_completion(self) -> Decimal:
        """EAC = BAC / CPI (forecast total project cost)."""
        cpi = self.cost_performance_index
        if cpi == 0:
            return self.total_budget
        return (self.total_budget / cpi).quantize(TWO_PLACES, ROUND_HALF_UP)

    @property
    def estimate_to_complete(self) -> Decimal:
        """ETC = EAC - AC (remaining cost forecast)."""
        return (self.estimate_at_completion - self.actual_cost).quantize(TWO_PLACES)

    @property
    def variance_at_completion(self) -> Decimal:
        """VAC = BAC - EAC (total expected cost overrun/underrun)."""
        return (self.total_budget - self.estimate_at_completion).quantize(TWO_PLACES)

    @property
    def to_complete_performance_index(self) -> Decimal:
        """TCPI = (BAC - EV) / (BAC - AC) — required efficiency to meet budget."""
        denominator = self.total_budget - self.actual_cost
        if denominator == 0:
            return Decimal("0")
        return ((self.total_budget - self.earned_value) / denominator).quantize(
            TWO_PLACES, ROUND_HALF_UP
        )

    @property
    def physical_progress_percentage(self) -> Decimal:
        """% of work completed based on earned value."""
        if self.total_budget == 0:
            return Decimal("0")
        return ((self.earned_value / self.total_budget) * 100).quantize(TWO_PLACES)

    @property
    def financial_progress_percentage(self) -> Decimal:
        """% of budget spent."""
        if self.total_budget == 0:
            return Decimal("0")
        return ((self.actual_cost / self.total_budget) * 100).quantize(TWO_PLACES)


def calculate_earned_value(
    total_budget: Decimal,
    planned_value: Decimal,
    earned_value: Decimal,
    actual_cost: Decimal,
) -> EarnedValueMetrics:
    """Factory function to create EVM metrics."""
    return EarnedValueMetrics(
        total_budget=total_budget,
        planned_value=planned_value,
        earned_value=earned_value,
        actual_cost=actual_cost,
    )
