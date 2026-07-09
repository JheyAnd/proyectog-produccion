"""
API endpoints — Matriz de Egresos del Flujo de Caja.
Reemplaza el almacenamiento en project_preferences (key-value JSON)
con tablas relacionales propias: egreso_categorias + egreso_valores.
"""
from datetime import datetime, timezone
from typing import Any, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models.egreso_model import EgresoCategoriaModel, EgresoValorModel
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.session import get_db_session
from src.interface.api.v1.dependencies.auth import get_current_user
from src.socket_manager import broadcast_preference_update
import json

router = APIRouter(prefix="/egresos", tags=["Egresos"])


# ── Schemas Pydantic ─────────────────────────────────────────────

class EgresoValorSchema(BaseModel):
    mes_key: str  # 'YYYY-MM'
    valor: float = 0.0


class EgresoCategoriaSchema(BaseModel):
    id: str
    project_id: str
    nombre: str
    grupo: str  # materiales | mano_obra | administracion | ingreso
    incluir_en_grafico: bool = True
    sort_order: int = 0
    valores: dict[str, float] = {}  # mes_key → valor

    class Config:
        from_attributes = True


class BulkUpsertSchema(BaseModel):
    project_id: str
    categorias: list[EgresoCategoriaSchema]


# ── Helpers ──────────────────────────────────────────────────────

def _cat_to_dict(cat: EgresoCategoriaModel) -> dict:
    """Serializa categoría + valores al formato que espera el frontend."""
    valores: dict[str, float] = {}
    for v in cat.valores:
        valores[v.mes_key] = v.valor
    return {
        "id": cat.id,
        "project_id": cat.project_id,
        "nombre": cat.nombre,
        "grupo": cat.grupo,
        "incluirEnGrafico": cat.incluir_en_grafico,
        "sort_order": cat.sort_order,
        "valores": valores,
    }


async def _upsert_valores(
    db: AsyncSession,
    cat: EgresoCategoriaModel,
    valores: dict[str, float],
) -> None:
    """Actualiza los valores mensuales de una categoría (upsert por mes_key)."""
    # Construir mapa de valores existentes
    existing: dict[str, EgresoValorModel] = {v.mes_key: v for v in cat.valores}

    for mes_key, valor in valores.items():
        if mes_key in existing:
            existing[mes_key].valor = valor
            existing[mes_key].updated_at = datetime.now(timezone.utc)
        else:
            nuevo = EgresoValorModel(
                id=str(uuid.uuid4()),
                categoria_id=cat.id,
                project_id=cat.project_id,
                mes_key=mes_key,
                valor=valor,
            )
            db.add(nuevo)

    # Eliminar meses que ya no están
    for mes_key, v_model in existing.items():
        if mes_key not in valores:
            await db.delete(v_model)


# ── Endpoints ────────────────────────────────────────────────────

@router.get("/{project_id}")
async def list_categorias(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Devuelve todas las categorías de egresos de un proyecto con sus valores mensuales."""
    result = await db.execute(
        select(EgresoCategoriaModel)
        .where(EgresoCategoriaModel.project_id == project_id)
        .order_by(EgresoCategoriaModel.sort_order, EgresoCategoriaModel.id)
    )
    rows = result.scalars().all()
    return [_cat_to_dict(r) for r in rows]


@router.put("/{project_id}")
async def upsert_categorias(
    project_id: str,
    categorias: list[dict],
    db: AsyncSession = Depends(get_db_session),
):
    """
    Reemplaza la lista completa de categorías para un proyecto.
    Equivalente al PUT que antes guardaba en project_preferences.
    """
    # Cargar categorías existentes
    result = await db.execute(
        select(EgresoCategoriaModel)
        .where(EgresoCategoriaModel.project_id == project_id)
    )
    existing_map: dict[str, EgresoCategoriaModel] = {
        r.id: r for r in result.scalars().all()
    }

    incoming_ids: set[str] = set()
    for i, cat_data in enumerate(categorias):
        cat_id = cat_data.get("id")
        if not cat_id:
            continue
        incoming_ids.add(cat_id)

        # Normalizar nombre de campo frontend → backend
        incluir = cat_data.get("incluirEnGrafico", cat_data.get("incluir_en_grafico", True))
        valores: dict[str, float] = cat_data.get("valores", {})

        if cat_id in existing_map:
            cat = existing_map[cat_id]
            cat.nombre = cat_data.get("nombre", cat.nombre)
            cat.grupo = cat_data.get("grupo", cat.grupo)
            cat.incluir_en_grafico = incluir
            cat.sort_order = i
            cat.updated_at = datetime.now(timezone.utc)
        else:
            cat = EgresoCategoriaModel(
                id=cat_id,
                project_id=project_id,
                nombre=cat_data.get("nombre", ""),
                grupo=cat_data.get("grupo", "materiales"),
                incluir_en_grafico=incluir,
                sort_order=i,
            )
            db.add(cat)
            await db.flush()  # necesario para que cat.valores esté disponible

        await _upsert_valores(db, cat, valores)

    # Eliminar categorías que ya no vienen
    for cat_id, cat in existing_map.items():
        if cat_id not in incoming_ids:
            await db.delete(cat)

    await db.flush()
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})
    return {"ok": True, "upserted": len(incoming_ids)}


@router.post("/{project_id}/bulk-upsert")
async def bulk_upsert(
    project_id: str,
    categorias: list[dict],
    db: AsyncSession = Depends(get_db_session),
):
    """
    Inserta o actualiza categorías en bloque sin eliminar las existentes.
    Usado por el script de seed para migrar los JSON iniciales.
    """
    result = await db.execute(
        select(EgresoCategoriaModel)
        .where(EgresoCategoriaModel.project_id == project_id)
    )
    existing_map: dict[str, EgresoCategoriaModel] = {
        r.id: r for r in result.scalars().all()
    }

    upserted = 0
    for i, cat_data in enumerate(categorias):
        cat_id = cat_data.get("id")
        if not cat_id:
            continue

        # Normalizar nombre de campo frontend → backend
        incluir = cat_data.get("incluirEnGrafico", cat_data.get("incluir_en_grafico", True))
        valores: dict[str, float] = cat_data.get("valores", {})

        if cat_id in existing_map:
            cat = existing_map[cat_id]
            cat.nombre = cat_data.get("nombre", cat.nombre)
            cat.grupo = cat_data.get("grupo", cat.grupo)
            cat.incluir_en_grafico = incluir
            cat.sort_order = cat_data.get("sort_order", i)
        else:
            cat = EgresoCategoriaModel(
                id=cat_id,
                project_id=project_id,
                nombre=cat_data.get("nombre", ""),
                grupo=cat_data.get("grupo", "materiales"),
                incluir_en_grafico=incluir,
                sort_order=cat_data.get("sort_order", i),
            )
            db.add(cat)
            await db.flush()

        await _upsert_valores(db, cat, valores)
        upserted += 1

    await db.flush()
    return {"upserted": upserted}


@router.patch("/{project_id}/{categoria_id}/valor")
async def set_valor(
    project_id: str,
    categoria_id: str,
    body: EgresoValorSchema,
    db: AsyncSession = Depends(get_db_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Actualiza el valor de un mes específico para una categoría."""
    result = await db.execute(
        select(EgresoCategoriaModel)
        .where(
            EgresoCategoriaModel.id == categoria_id,
            EgresoCategoriaModel.project_id == project_id,
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # Validar si tiene detalles activos
    from src.infrastructure.database.models.cash_flow_cell_detail_model import CashFlowCellDetailModel
    from sqlalchemy import and_, func
    details_count_res = await db.execute(
        select(func.count(CashFlowCellDetailModel.id)).where(
            and_(
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.categoria_id == categoria_id,
                CashFlowCellDetailModel.mes_key == body.mes_key,
                CashFlowCellDetailModel.is_deleted == False
            )
        )
    )
    details_count = details_count_res.scalar() or 0
    if details_count > 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede modificar directamente el valor de esta celda porque contiene detalles activos (facturas/conceptos). Por favor, modifique los detalles para actualizar el total."
        )

    # Buscar valor existente para este mes
    v_result = await db.execute(
        select(EgresoValorModel).where(
            EgresoValorModel.categoria_id == categoria_id,
            EgresoValorModel.mes_key == body.mes_key,
        )
    )
    v_row = v_result.scalar_one_or_none()

    old_val = v_row.valor if v_row else 0.0
    
    if v_row:
        v_row.valor = body.valor
        v_row.updated_at = datetime.now(timezone.utc)
    else:
        v_row = EgresoValorModel(
            id=str(uuid.uuid4()),
            categoria_id=categoria_id,
            project_id=project_id,
            mes_key=body.mes_key,
            valor=body.valor,
        )
        db.add(v_row)

    # Auditoría
    if old_val != body.valor:
        db.add(ActivityLogModel(
            user_id=str(current_user.id),
            user_name=current_user.full_name or current_user.email,
            user_role=current_user.role,
            module="cash_flow",
            page=f"projects/{project_id}/cash-flow",
            action=f"update_egreso: {cat.nombre} ({body.mes_key})",
            field_name=f"{cat.nombre}_{body.mes_key}",
            before_state=str(old_val),
            after_state=str(body.valor),
            target_link=f"/projects/{project_id}/cash-flow",
            project_id=project_id,
            timestamp=datetime.now(timezone.utc),
        ))

    await db.flush()
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})
    return {"ok": True, "categoria_id": categoria_id, "mes_key": body.mes_key, "valor": body.valor}


@router.patch("/{project_id}/{categoria_id}/toggle-inclusion")
async def toggle_categoria_inclusion(
    project_id: str,
    categoria_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Alterna el estado de inclusión en gráficos para una categoría."""
    result = await db.execute(
        select(EgresoCategoriaModel)
        .where(
            EgresoCategoriaModel.id == categoria_id,
            EgresoCategoriaModel.project_id == project_id,
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    cat.incluir_en_grafico = not cat.incluir_en_grafico
    cat.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})
    return {"ok": True, "categoria_id": categoria_id, "incluir_en_grafico": cat.incluir_en_grafico}
