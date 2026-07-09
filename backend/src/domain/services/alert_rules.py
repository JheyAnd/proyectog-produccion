"""
Domain Service: Alert Rules
Business rules for detecting project deviations and generating alerts.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(str, enum.Enum):
    BUDGET_NEAR_LIMIT = "budget_near_limit"
    BUDGET_EXCEEDED = "budget_exceeded"
    NEGATIVE_CASH_FLOW = "negative_cash_flow"
    INVOICE_DUE_SOON = "invoice_due_soon"
    INVOICE_OVERDUE = "invoice_overdue"
    SCHEDULE_BEHIND = "schedule_behind"
    COST_OVERRUN = "cost_overrun"


@dataclass(frozen=True)
class Alert:
    """Immutable alert value object."""
    project_id: UUID
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    related_entity_id: Optional[UUID] = None
    threshold_value: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    generated_at: date = None

    def __post_init__(self):
        if self.generated_at is None:
            object.__setattr__(self, "generated_at", date.today())


def check_budget_alerts(
    budget_item_code: str,
    budget_item_id: UUID,
    project_id: UUID,
    current_budget: Decimal,
    actual_cost: Decimal,
) -> List[Alert]:
    """Check if budget consumption triggers alerts."""
    alerts = []
    if current_budget <= 0:
        return alerts

    consumption_pct = (actual_cost / current_budget * 100).quantize(Decimal("0.01"))

    if consumption_pct >= Decimal("100"):
        alerts.append(Alert(
            project_id=project_id,
            alert_type=AlertType.BUDGET_EXCEEDED,
            severity=AlertSeverity.CRITICAL,
            title=f"Presupuesto excedido: {budget_item_code}",
            message=(
                f"El gasto real ({actual_cost:,.2f}) ha superado el presupuesto "
                f"({current_budget:,.2f}) en la partida {budget_item_code}."
            ),
            related_entity_id=budget_item_id,
            threshold_value=Decimal("100"),
            current_value=consumption_pct,
        ))
    elif consumption_pct >= Decimal("95"):
        alerts.append(Alert(
            project_id=project_id,
            alert_type=AlertType.BUDGET_NEAR_LIMIT,
            severity=AlertSeverity.WARNING,
            title=f"Presupuesto al {consumption_pct}%: {budget_item_code}",
            message=(
                f"La partida {budget_item_code} ha consumido el {consumption_pct}% "
                f"de su presupuesto ({actual_cost:,.2f} de {current_budget:,.2f})."
            ),
            related_entity_id=budget_item_id,
            threshold_value=Decimal("95"),
            current_value=consumption_pct,
        ))

    return alerts


def check_cash_flow_alert(
    project_id: UUID,
    year: int,
    month: int,
    projected_net: Decimal,
) -> Optional[Alert]:
    """Alert if projected cash flow for a month is negative."""
    if projected_net < Decimal("0"):
        return Alert(
            project_id=project_id,
            alert_type=AlertType.NEGATIVE_CASH_FLOW,
            severity=AlertSeverity.WARNING,
            title=f"Flujo de caja negativo proyectado: {year}-{month:02d}",
            message=(
                f"El flujo de caja neto proyectado para {year}-{month:02d} "
                f"es negativo: {projected_net:,.2f}."
            ),
            current_value=projected_net,
        )
    return None


def check_invoice_due_alerts(
    project_id: UUID,
    invoice_id: UUID,
    invoice_number: str,
    due_date: date,
    balance_due: Decimal,
) -> Optional[Alert]:
    """Alert for invoices due soon or overdue."""
    days_until = (due_date - date.today()).days

    if days_until < 0 and balance_due > 0:
        return Alert(
            project_id=project_id,
            alert_type=AlertType.INVOICE_OVERDUE,
            severity=AlertSeverity.CRITICAL,
            title=f"Factura vencida: {invoice_number}",
            message=(
                f"La factura {invoice_number} venció hace {abs(days_until)} días. "
                f"Saldo pendiente: {balance_due:,.2f}."
            ),
            related_entity_id=invoice_id,
            current_value=Decimal(str(days_until)),
        )
    elif 0 <= days_until <= 15 and balance_due > 0:
        return Alert(
            project_id=project_id,
            alert_type=AlertType.INVOICE_DUE_SOON,
            severity=AlertSeverity.WARNING,
            title=f"Factura por vencer: {invoice_number}",
            message=(
                f"La factura {invoice_number} vence en {days_until} días "
                f"({due_date.isoformat()}). Saldo: {balance_due:,.2f}."
            ),
            related_entity_id=invoice_id,
            current_value=Decimal(str(days_until)),
        )
    return None
