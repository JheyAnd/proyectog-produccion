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

    total_original = sum(Decimal(str(i.original_amount)) for i in budget_items)
    total_changes = sum(Decimal(str(i.approved_changes)) for i in budget_items)
    total_actual = sum(Decimal(str(i.actual_amount)) for i in budget_items)
    total_committed = sum(Decimal(str(i.committed_amount)) for i in budget_items)
    total_current = total_original + total_changes

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

    # Cash flow
    cf_stmt = (
        select(CashFlowEntryModel)
        .where(CashFlowEntryModel.project_id == project_id)
        .order_by(CashFlowEntryModel.year, CashFlowEntryModel.month)
    )
    cf_result = await db.execute(cf_stmt)
    cf_entries = cf_result.scalars().all()

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
            "semana_actual": corte.semana if corte else None,
            "fecha_corte": str(corte.fecha_corte) if (corte and corte.fecha_corte) else None,
            "note": "Calculado dinámicamente desde cronograma_cortes",
        },
    }

@router.get("/global-cash-flow", response_model=dict)
async def get_global_cash_flow(db: AsyncSession = Depends(get_db_session)):
    """
    Get consolidated cash flow dashboard data for all projects.
    """
    try:
        # Fetch all active projects
        stmt_projects = select(ProjectModel)
        res_projects = await db.execute(stmt_projects)
        projects = res_projects.scalars().all()
        
        project_stats = {}
        for p in projects:
            project_stats[p.id] = {
                "id": str(p.id),
                "name": p.name,
                "client_name": p.client_name,
                "total_income": Decimal(0),
                "total_expense": Decimal(0),
                "net": Decimal(0)
            }
            
        monthly_stats = {}
        global_income = Decimal(0)
        global_expense = Decimal(0)

        # Fetch all categorias and join with valores
        from src.infrastructure.database.models.egreso_model import EgresoCategoriaModel
        from sqlalchemy.orm import selectinload
        stmt_cat = select(EgresoCategoriaModel).options(selectinload(EgresoCategoriaModel.valores))
        res_cat = await db.execute(stmt_cat)
        categorias = res_cat.scalars().all()

        for cat in categorias:
            pid = cat.project_id
            if pid not in project_stats:
                continue
                
            is_income = (cat.grupo == "ingreso")
            
            for valor_row in cat.valores:
                val = Decimal(str(valor_row.valor))
                m_key = valor_row.mes_key  # 'YYYY-MM'
                
                # split YYYY-MM to get year and month
                try:
                    y_str, m_str = m_key.split('-')
                    year_val = int(y_str)
                    month_val = int(m_str)
                except:
                    continue

                if is_income:
                    project_stats[pid]["total_income"] += val
                    project_stats[pid]["net"] += val
                    global_income += val
                else:
                    project_stats[pid]["total_expense"] += val
                    project_stats[pid]["net"] -= val
                    global_expense += val
                    
                if m_key not in monthly_stats:
                    monthly_stats[m_key] = {
                        "year": year_val,
                        "month": month_val,
                        "periodo": m_key,
                        "ingreso": Decimal(0),
                        "egreso": Decimal(0),
                        "neto": Decimal(0)
                    }
                    
                if is_income:
                    monthly_stats[m_key]["ingreso"] += val
                    monthly_stats[m_key]["neto"] += val
                else:
                    monthly_stats[m_key]["egreso"] += val
                    monthly_stats[m_key]["neto"] -= val

        # Format Monthly Data
        sorted_months = sorted(monthly_stats.values(), key=lambda x: (x["year"], x["month"]))
        formatted_monthly = []
        for m in sorted_months:
            formatted_monthly.append({
                "periodo": m["periodo"],
                "ingreso": float(m["ingreso"]),
                "egreso": float(m["egreso"]),
                "neto": float(m["neto"])
            })
            
        # Format Project Data
        formatted_projects = []
        for pid, stats in project_stats.items():
            formatted_projects.append({
                "id": stats["id"],
                "name": stats["name"],
                "client_name": stats["client_name"],
                "total_income": float(stats["total_income"]),
                "total_expense": float(stats["total_expense"]),
                "net": float(stats["net"])
            })
            
        # Sort projects by net descending
        formatted_projects.sort(key=lambda x: x["net"], reverse=True)
        
        return {
            "globalStats": {
                "total_income": float(global_income),
                "total_expense": float(global_expense),
                "net": float(global_income - global_expense),
                "active_projects": len(projects)
            },
            "monthlyData": formatted_monthly,
            "projects": formatted_projects
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


