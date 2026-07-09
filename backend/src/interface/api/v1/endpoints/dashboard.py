"""API Endpoints: Project Dashboard (aggregated data)."""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.report_dto import (
    AlertResponse,
    EarnedValueResponse,
    ProjectDashboardResponse,
)
from src.application.dtos.budget_dto import BudgetSummaryResponse
from src.application.dtos.cash_flow_dto import CashFlowEntryResponse, CashFlowSummaryResponse
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.project_model import ProjectModel
from src.infrastructure.database.models.budget_model import BudgetItemModel
from src.infrastructure.database.models.transaction_model import TransactionModel
from src.infrastructure.database.models.invoice_model import InvoiceModel
from src.infrastructure.database.models.cash_flow_model import CashFlowEntryModel

router = APIRouter()


@router.get("", response_model=dict)
async def get_dashboard(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get complete project dashboard data.
    Aggregates all key metrics: budget, cash flow, alerts, EVM.
    """
    # Fetch project
    stmt = select(ProjectModel).where(ProjectModel.id == project_id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Budget aggregation
    budget_stmt = select(BudgetItemModel).where(BudgetItemModel.project_id == project_id)
    budget_result = await db.execute(budget_stmt)
    budget_items = budget_result.scalars().all()

    # Extract EACs
    eac_sin_fin = sum(Decimal(str(i.original_amount)) for i in budget_items if i.category == "eac_sin_fin")
    eac_con_fin = sum(Decimal(str(i.original_amount)) for i in budget_items if i.category == "eac_con_fin")

    # Regular budget (excluding EACs and ACs which we used for detailed breakdown)
    regular_items = [i for i in budget_items if i.category not in (
        "eac_sin_fin", "eac_con_fin", "ac_materiales", "ac_administrativo", "ac_otros",
        "eac_materiales", "eac_mano_obra", "eac_administrativo", "eac_intereses"
    )]
    total_original = sum(Decimal(str(i.original_amount)) for i in regular_items)
    total_changes = sum(Decimal(str(i.approved_changes)) for i in regular_items)
    total_actual = sum(Decimal(str(i.actual_amount)) for i in regular_items)
    total_committed = sum(Decimal(str(i.committed_amount)) for i in regular_items)
    total_current = total_original + total_changes

    # Detailed Actual Costs
    ac_materiales = sum(Decimal(str(i.actual_amount)) for i in budget_items if i.category == "ac_materiales")
    ac_administrativo = sum(Decimal(str(i.actual_amount)) for i in budget_items if i.category == "ac_administrativo")
    ac_otros = sum(Decimal(str(i.actual_amount)) for i in budget_items if i.category == "ac_otros")

    # Detailed EACs
    eac_materiales = sum(Decimal(str(i.original_amount)) for i in budget_items if i.category == "eac_materiales")
    eac_mano_obra = sum(Decimal(str(i.original_amount)) for i in budget_items if i.category == "eac_mano_obra")
    eac_administrativo_cat = sum(Decimal(str(i.original_amount)) for i in budget_items if i.category == "eac_administrativo")
    eac_intereses = sum(Decimal(str(i.original_amount)) for i in budget_items if i.category == "eac_intereses")

    # Transaction counts
    tx_stmt = select(func.count()).where(
        TransactionModel.project_id == project_id,
        TransactionModel.status.in_(["draft", "pending", "approved"]),
    )
    tx_result = await db.execute(tx_stmt)
    recent_tx_count = tx_result.scalar() or 0

    # Invoice counts
    pending_inv_stmt = select(func.count()).where(
        InvoiceModel.project_id == project_id,
        InvoiceModel.status.in_(["draft", "sent", "partial"]),
    )
    pending_inv_result = await db.execute(pending_inv_stmt)
    pending_invoices = pending_inv_result.scalar() or 0

    overdue_inv_stmt = select(func.count()).where(
        InvoiceModel.project_id == project_id,
        InvoiceModel.status == "overdue",
    )
    overdue_inv_result = await db.execute(overdue_inv_stmt)
    overdue_invoices = overdue_inv_result.scalar() or 0

    # Cash flow (Legacy table might not exist)
    cf_entries = []
    try:
        cf_stmt = (
            select(CashFlowEntryModel)
            .where(CashFlowEntryModel.project_id == project_id)
            .order_by(CashFlowEntryModel.year, CashFlowEntryModel.month)
        )
        cf_result = await db.execute(cf_stmt)
        cf_entries = cf_result.scalars().all()
    except Exception as e:
        # If the table doesn't exist (e.g. dropped in v2), just ignore
        pass

    total_proj_income = sum(Decimal(str(e.projected_income)) for e in cf_entries)
    total_proj_expense = sum(Decimal(str(e.projected_expense)) for e in cf_entries)
    total_act_income = sum(Decimal(str(e.actual_income)) for e in cf_entries)
    total_act_expense = sum(Decimal(str(e.actual_expense)) for e in cf_entries)

    # 3. Query the latest cronograma_corte with non-null avance_ejecutado
    from src.infrastructure.database.models.cronograma_model import CronogramaCorteModel
    ultimo_stmt = select(CronogramaCorteModel).where(
        CronogramaCorteModel.project_id == project_id,
        CronogramaCorteModel.avance_ejecutado != None
    ).order_by(CronogramaCorteModel.semana.desc()).limit(1)
    ultimo_result = await db.execute(ultimo_stmt)
    corte = ultimo_result.scalar_one_or_none()

    if corte:
        spi = float(round(corte.avance_ejecutado / corte.avance_planeado, 4)) if corte.avance_planeado > 0 else 0.0
        avance_real = float(corte.avance_ejecutado)
        avance_planificado = float(corte.avance_planeado)
        desviacion = float(corte.avance_ejecutado - corte.avance_planeado)
        ev_amount = float(total_current) * (avance_real / 100.0)
        pv_amount = float(total_current) * (avance_planificado / 100.0)
        cpi = float(round(ev_amount / float(total_actual), 4)) if total_actual > 0 else 0.0
    else:
        spi = 0.0
        avance_real = 0.0
        avance_planificado = 0.0
        desviacion = 0.0
        ev_amount = 0.0
        pv_amount = 0.0
        cpi = 0.0

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "code": project.code,
            "status": project.status,
            "client_name": project.client_name,
            "start_date": project.start_date.isoformat(),
            "estimated_end_date": project.estimated_end_date.isoformat(),
            "total_budget": float(project.total_budget),
        },
        "budget_summary": {
            "total_original_budget": float(total_original),
            "total_approved_changes": float(total_changes),
            "total_current_budget": float(total_current),
            "total_committed": float(total_committed),
            "total_actual": float(total_actual),
            "total_available": float(total_current - total_committed),
            "consumption_percentage": float(
                (total_actual / total_current * 100).quantize(Decimal("0.01"))
                if total_current > 0 else 0
            ),
        },
        "cash_flow_summary": {
            "total_projected_income": float(total_proj_income),
            "total_projected_expense": float(total_proj_expense),
            "total_actual_income": float(total_act_income),
            "total_actual_expense": float(total_act_expense),
            "projected_net": float(total_proj_income - total_proj_expense),
            "actual_net": float(total_act_income - total_act_expense),
        },
        "counts": {
            "recent_transactions": recent_tx_count,
            "pending_invoices": pending_invoices,
            "overdue_invoices": overdue_invoices,
        },
        "earned_value": {
            "bac": float(total_current),
            "actual_cost": float(total_actual),
            "earned_value_amount": ev_amount,
            "planned_value_amount": pv_amount,
            "cpi": cpi,
            "spi": spi,
            "avance_fisico": avance_real,
            "avance_planificado": avance_planificado,
            "desviacion": desviacion,
            "eac": float(eac_con_fin) if eac_con_fin > 0 else 0.0,
            "eac_sin_fin": float(eac_sin_fin) if eac_sin_fin > 0 else 0.0,
            "eac_con_fin": float(eac_con_fin) if eac_con_fin > 0 else 0.0,
            "breakdown": {
                "ac_materiales": float(ac_materiales),
                "ac_administrativo": float(ac_administrativo),
                "ac_otros": float(ac_otros),
                "eac_materiales": float(eac_materiales),
                "eac_mano_obra": float(eac_mano_obra),
                "eac_administrativo": float(eac_administrativo_cat),
                "eac_intereses": float(eac_intereses),
            },
            "semana_actual": corte.semana if corte else None,
            "fecha_corte": str(corte.fecha_corte) if (corte and corte.fecha_corte) else None,
            "note": "Calculado dinámicamente desde cronograma_cortes",
        },
    }

