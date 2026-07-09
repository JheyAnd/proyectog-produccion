"""Pydantic DTOs for Reports and Dashboard."""
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel

from src.application.dtos.budget_dto import BudgetSummaryResponse
from src.application.dtos.cash_flow_dto import CashFlowSummaryResponse


class EarnedValueResponse(BaseModel):
    """EVM indicators for dashboard."""
    total_budget: Decimal            # BAC
    planned_value: Decimal           # BCWS / PV
    earned_value: Decimal            # BCWP / EV
    actual_cost: Decimal             # ACWP / AC
    cost_variance: Decimal           # CV
    schedule_variance: Decimal       # SV
    cost_performance_index: Decimal  # CPI
    schedule_performance_index: Decimal  # SPI
    estimate_at_completion: Decimal  # EAC
    estimate_to_complete: Decimal    # ETC
    variance_at_completion: Decimal  # VAC
    physical_progress_percentage: Decimal
    financial_progress_percentage: Decimal


class AlertResponse(BaseModel):
    project_id: str
    alert_type: str
    severity: str
    title: str
    message: str
    related_entity_id: Optional[str]
    threshold_value: Optional[Decimal]
    current_value: Optional[Decimal]
    generated_at: str


class ProjectDashboardResponse(BaseModel):
    """Complete project dashboard data."""
    project_id: str
    project_name: str
    project_status: str
    time_progress: Decimal
    earned_value_metrics: EarnedValueResponse
    budget_summary: BudgetSummaryResponse
    cash_flow_summary: CashFlowSummaryResponse
    active_alerts: List[AlertResponse]
    recent_transactions_count: int
    pending_invoices_count: int
    overdue_invoices_count: int
