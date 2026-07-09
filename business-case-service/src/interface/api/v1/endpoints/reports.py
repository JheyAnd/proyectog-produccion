"""API Endpoints: Report Generation (PDF/Excel)."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session

router = APIRouter()


@router.get("/project-status")
async def report_project_status(
    project_id: str,
    format: str = Query("json", description="Output format: json, pdf, excel"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate 'Estado General del Proyecto' report.
    Executive summary for management with key indicators.
    """
    # TODO: Implement full report generation with ReportLab/openpyxl
    return {
        "report": "project_status",
        "project_id": str(project_id),
        "format": format,
        "message": "Report generation endpoint ready. PDF/Excel implementation pending.",
    }


@router.get("/cash-flow-monthly")
async def report_cash_flow_monthly(
    project_id: str,
    format: str = Query("json", description="Output format: json, pdf, excel"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate 'Flujo de Caja Mensual' report.
    Monthly income vs expenses with cumulative totals.
    """
    return {
        "report": "cash_flow_monthly",
        "project_id": str(project_id),
        "format": format,
        "message": "Report generation endpoint ready.",
    }


@router.get("/budget-variance")
async def report_budget_variance(
    project_id: str,
    format: str = Query("json", description="Output format: json, pdf, excel"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate 'Cuadro de Variación' report.
    Budget vs Actual comparison per budget item.
    """
    return {
        "report": "budget_variance",
        "project_id": str(project_id),
        "format": format,
        "message": "Report generation endpoint ready.",
    }


@router.get("/estimate-at-completion")
async def report_eac(
    project_id: str,
    format: str = Query("json", description="Output format: json, pdf, excel"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate 'Reporte de Costos a Terminación' (EAC) report.
    Earned Value Management metrics and cost forecasting.
    """
    return {
        "report": "estimate_at_completion",
        "project_id": str(project_id),
        "format": format,
        "message": "Report generation endpoint ready.",
    }
