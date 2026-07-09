"""API Endpoints: Cash Flow Management."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.cash_flow_dto import (
    CashFlowEntryCreate,
    CashFlowEntryResponse,
    CashFlowEntryUpdate,
)
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.cash_flow_model import CashFlowEntryModel

router = APIRouter()


@router.get("", response_model=List[CashFlowEntryResponse])
async def list_cash_flow(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """List all cash flow entries for a project (ordered by period)."""
    stmt = (
        select(CashFlowEntryModel)
        .where(CashFlowEntryModel.project_id == project_id)
        .order_by(CashFlowEntryModel.year, CashFlowEntryModel.month)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=CashFlowEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_cash_flow_entry(
    project_id: str,
    data: CashFlowEntryCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Create or update a cash flow forecast for a specific month."""
    # Check if entry already exists
    stmt = select(CashFlowEntryModel).where(
        CashFlowEntryModel.project_id == project_id,
        CashFlowEntryModel.year == data.year,
        CashFlowEntryModel.month == data.month,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.projected_income = data.projected_income
        existing.projected_expense = data.projected_expense
        if data.notes:
            existing.notes = data.notes
        await db.flush()
        await db.refresh(existing)
        return existing

    entry = CashFlowEntryModel(
        project_id=project_id,
        year=data.year,
        month=data.month,
        flow_type="forecast",
        projected_income=data.projected_income,
        projected_expense=data.projected_expense,
        notes=data.notes,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.put("/{entry_id}", response_model=CashFlowEntryResponse)
async def update_cash_flow_entry(
    project_id: str,
    entry_id: str,
    data: CashFlowEntryUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    """Update a cash flow entry with actual values."""
    stmt = select(CashFlowEntryModel).where(
        CashFlowEntryModel.id == entry_id,
        CashFlowEntryModel.project_id == project_id,
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Cash flow entry not found.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.flush()
    await db.refresh(entry)
    return entry

@router.get("/finance-view")
async def get_finance_view(
    project_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Desglose mensual de egresos con detalle por factura.
    Fuente: cash_flow_cell_details JOIN egreso_categorias
    """
    from sqlalchemy import text

    MESES_ES = {
        1:'Ene', 2:'Feb', 3:'Mar', 4:'Abr', 5:'May', 6:'Jun',
        7:'Jul', 8:'Ago', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Dic'
    }

    # Mapeo de grupos internos → nombre legible para la UI
    GRUPO_LABEL = {
        'materiales':           'MATERIALES',
        'mano_de_obra':         'MANO DE OBRA',
        'mano de obra':         'MANO DE OBRA',
        'administracion':       'ADMINISTRATIVOS DIRECTIVOS',
        'administrativos':      'ADMINISTRATIVOS DIRECTIVOS',
        'intereses':            'INTERESES',
        'ingresos':             'INGRESO',
        'ingreso':              'INGRESO',
    }

    # 1. Obtener meses distintos con datos reales
    meses_result = await db.execute(text("""
        SELECT DISTINCT d.mes_key
        FROM cash_flow_cell_details d
        WHERE d.project_id = :pid AND d.is_deleted = 0
        ORDER BY d.mes_key ASC
    """), {"pid": project_id})
    meses_raw = [r[0] for r in meses_result.fetchall()]

    if not meses_raw:
        return {"meses": []}

    resultado = []

    for mes_key in meses_raw:
        # Parsear mes_key "YYYY-MM"
        try:
            anio, mes = int(mes_key[:4]), int(mes_key[5:7])
            label = f"{MESES_ES.get(mes, '?')} {anio}"
        except Exception:
            label = mes_key

        # 2. Obtener todas las facturas de este mes con su categoría y grupo
        rows_result = await db.execute(text("""
            SELECT
                d.id,
                d.numero_oc,
                d.numero_factura,
                d.proveedor,
                d.valor,
                d.fecha_factura,
                d.nota,
                (d.doc_oc_contrato IS NOT NULL) AS has_doc_oc,
                d.doc_oc_contrato_nombre,
                (d.doc_factura IS NOT NULL) AS has_doc_factura,
                d.doc_factura_nombre,
                ec.nombre  AS categoria_nombre,
                ec.grupo   AS grupo_raw
            FROM cash_flow_cell_details d
            JOIN egreso_categorias ec ON ec.id = d.categoria_id
            WHERE d.project_id = :pid
              AND d.mes_key    = :mes_key
              AND d.is_deleted = 0
            ORDER BY ec.grupo, ec.nombre, d.valor DESC
        """), {"pid": project_id, "mes_key": mes_key})
        rows = rows_result.fetchall()

        # 3. Agrupar: seccion → categoria → lista de facturas
        secciones: dict = {}
        for row in rows:
            grupo_raw  = (row.grupo_raw or 'otros').lower().strip()
            grupo_ui   = GRUPO_LABEL.get(grupo_raw, grupo_raw.upper())
            cat_nombre = row.categoria_nombre or 'Sin categoría'
            valor      = float(row.valor) if row.valor else 0.0

            if grupo_ui not in secciones:
                secciones[grupo_ui] = {"nombre": grupo_ui, "categorias": {}, "total": 0.0}

            if cat_nombre not in secciones[grupo_ui]["categorias"]:
                secciones[grupo_ui]["categorias"][cat_nombre] = {
                    "nombre": cat_nombre, "detalles": [], "total": 0.0
                }

            secciones[grupo_ui]["categorias"][cat_nombre]["detalles"].append({
                "id":           row.id,
                "numero_oc":    row.numero_oc,
                "factura":      row.numero_factura or "S/N",
                "proveedor":    row.proveedor or "",
                "valor":        valor,
                "fecha_factura": str(row.fecha_factura) if row.fecha_factura else None,
                "nota":         row.nota or "",
                "has_doc_oc":   bool(row.has_doc_oc),
                "doc_oc_contrato_nombre": row.doc_oc_contrato_nombre,
                "has_doc_factura": bool(row.has_doc_factura),
                "doc_factura_nombre": row.doc_factura_nombre,
            })
            secciones[grupo_ui]["categorias"][cat_nombre]["total"] += valor
            secciones[grupo_ui]["total"] += valor

        # Convertir dicts anidados a listas
        secciones_list = []
        for sec in secciones.values():
            sec["categorias"] = list(sec["categorias"].values())
            secciones_list.append(sec)

        # Ordenar secciones: MATERIALES primero, luego MANO DE OBRA, etc.
        orden = ["INGRESO", "MATERIALES", "MANO DE OBRA", "ADMINISTRATIVOS DIRECTIVOS", "INTERESES"]
        secciones_list.sort(key=lambda s: orden.index(s["nombre"]) if s["nombre"] in orden else 99)

        total_mes      = sum(s["total"] for s in secciones_list)
        total_facturas = sum(len(c["detalles"]) for s in secciones_list for c in s["categorias"])

        resultado.append({
            "periodo":        mes_key,
            "label":          label,
            "total":          total_mes,
            "totalFacturas":  total_facturas,
            "secciones":      secciones_list,
        })

    return {"meses": resultado}
