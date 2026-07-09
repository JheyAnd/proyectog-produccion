"""
Endpoints REST para detalles de celdas del Flujo de Caja.

Cada celda (categoría × mes) puede tener N detalles (facturas).
El valor de la celda en egreso_valores.valor = SUMA de los detalles activos.

Endpoints:
  GET    /v2/projects/{id}/cash-flow/categorias/{cat_id}/cell-details/{mes_key}
  POST   /v2/projects/{id}/cash-flow/categorias/{cat_id}/cell-details/{mes_key}
  PUT    /v2/projects/{id}/cash-flow/cell-details/{detail_id}
  DELETE /v2/projects/{id}/cash-flow/cell-details/{detail_id}            (soft delete)
  POST   /v2/projects/{id}/cash-flow/cell-details/{detail_id}/restore
  POST   /v2/projects/{id}/cash-flow/categorias/{cat_id}/cell-details/{mes_key}/bulk
  GET    /v2/projects/{id}/cash-flow/proveedores                          (autocomplete)

Cada operación que cambia montos:
  1. Actualiza cash_flow_cell_details
  2. Recalcula egreso_valores.valor = SUM(detalles activos)
  3. Registra en cash_flow_audit_log
"""
import uuid
from datetime import datetime, date, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Form, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.egreso_model import (
    EgresoCategoriaModel,
    EgresoValorModel,
)
from src.infrastructure.database.models.cash_flow_cell_detail_model import (
    CashFlowCellDetailModel,
)
from src.infrastructure.database.models.cash_flow_v2_model import (
    CashFlowAuditLogModel,
)
from src.infrastructure.database.models.user_model import UserModel
from src.interface.api.v1.dependencies.auth import get_current_user

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class CellDetailResponse(BaseModel):
    id: str
    project_id: str
    categoria_id: str
    mes_key: str
    numero_oc: Optional[str] = None
    numero_factura: str
    proveedor: Optional[str] = None
    valor: float
    nota: Optional[str] = None
    fecha_factura: Optional[date] = None
    documento_id: Optional[str] = None
    
    has_doc_oc: bool = False
    doc_oc_contrato_nombre: Optional[str] = None
    has_doc_factura: bool = False
    doc_factura_nombre: Optional[str] = None
    
    created_by_name: str
    created_by_role: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    incluir_en_grafico: bool
    model_config = {"from_attributes": True}


class CellDetailCreateRequest(BaseModel):
    numero_factura: str
    proveedor: Optional[str] = None
    valor: float
    nota: Optional[str] = None
    fecha_factura: Optional[date] = None
    documento_id: Optional[str] = None


class CellDetailUpdateRequest(BaseModel):
    numero_factura: Optional[str] = None
    proveedor: Optional[str] = None
    valor: Optional[float] = None
    nota: Optional[str] = None
    fecha_factura: Optional[date] = None
    documento_id: Optional[str] = None


class BulkUpsertItem(BaseModel):
    id: Optional[str] = None  # null = crear, string = actualizar
    categoria_id: Optional[str] = None
    numero_oc: Optional[str] = None
    numero_factura: str
    proveedor: Optional[str] = None
    valor: float
    nota: Optional[str] = None
    fecha_factura: Optional[date] = None
    documento_id: Optional[str] = None
    is_deleted: bool = False
    incluir_en_grafico: bool = True

class BulkUpsertRequest(BaseModel):
    details: List[BulkUpsertItem]


class CellSummaryResponse(BaseModel):
    project_id: str
    categoria_id: str
    mes_key: str
    total_celda: float           # = SUM de detalles activos
    total_detalles: int
    detalles: List[CellDetailResponse]


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _client_ip(request: Request) -> Optional[str]:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


async def _recalculate_cell_value(
    db: AsyncSession,
    project_id: str,
    categoria_id: str,
    mes_key: str,
) -> float:
    """
    Recalcula el valor de la celda como SUM de detalles activos.
    Actualiza egreso_valores.valor (UPSERT).
    Retorna el nuevo total.
    """
    # Suma de detalles activos
    result = await db.execute(
        select(func.coalesce(func.sum(CashFlowCellDetailModel.valor), 0)).where(
            and_(
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.categoria_id == categoria_id,
                CashFlowCellDetailModel.mes_key == mes_key,
                CashFlowCellDetailModel.is_deleted == False,
                CashFlowCellDetailModel.incluir_en_grafico == True,
            )
        )
    )
    nuevo_total = float(result.scalar() or 0)

    # Buscar valor existente en egreso_valores
    val_result = await db.execute(
        select(EgresoValorModel).where(
            and_(
                EgresoValorModel.categoria_id == categoria_id,
                EgresoValorModel.mes_key == mes_key,
            )
        )
    )
    valor_row = val_result.scalar_one_or_none()

    if valor_row:
        valor_row.valor = nuevo_total
    else:
        db.add(EgresoValorModel(
            id=str(uuid.uuid4()),
            categoria_id=categoria_id,
            project_id=project_id,
            mes_key=mes_key,
            valor=nuevo_total,
        ))

    return nuevo_total


async def _validate_project_exists(db: AsyncSession, project_id: str):
    """Verifica que el proyecto exista en la tabla projects."""
    from src.infrastructure.database.models.project_model import ProjectModel
    p_res = await db.execute(select(ProjectModel.id).where(ProjectModel.id == project_id))
    if not p_res.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail=f"El proyecto '{project_id}' no existe en la base de datos maestra. Verifique el identificador."
        )


async def _log_action(
    db: AsyncSession,
    project_id: str,
    categoria_id: str,
    categoria_nombre: str,
    grupo: str,
    mes_key: str,
    field: str,
    old_value: Optional[str],
    new_value: Optional[str],
    user: UserModel,
    action: str,
    request: Request,
    notes: Optional[str] = None,
):
    """Registra en cash_flow_audit_log."""
    db.add(CashFlowAuditLogModel(
        id=str(uuid.uuid4()),
        project_id=project_id,
        categoria_id=categoria_id,
        categoria_nombre=categoria_nombre,
        grupo=grupo,
        mes_key=mes_key,
        field_name=field,
        old_value=old_value,
        new_value=new_value,
        user_id=user.id,
        user_name=user.full_name,
        user_role=user.role,
        action=action,
        ip_address=_client_ip(request),
        notes=notes,
    ))


# ══════════════════════════════════════════════════════════════════════════════
# READ
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/projects/{project_id}/cash-flow/categorias/{categoria_id}/cell-details/{mes_key}",
    response_model=CellSummaryResponse,
)
async def get_cell_details(
    project_id: str,
    categoria_id: str,
    mes_key: str,
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db_session),
):
    """Lista detalles de una celda + total."""
    query = select(CashFlowCellDetailModel).where(
        and_(
            CashFlowCellDetailModel.project_id == project_id,
            CashFlowCellDetailModel.categoria_id == categoria_id,
            CashFlowCellDetailModel.mes_key == mes_key,
        )
    )
    if not include_deleted:
        query = query.where(CashFlowCellDetailModel.is_deleted == False)
    query = query.order_by(CashFlowCellDetailModel.created_at)

    result = await db.execute(query)
    detalles = list(result.scalars().all())

    total = sum(float(d.valor) for d in detalles if not d.is_deleted)

    return CellSummaryResponse(
        project_id=project_id,
        categoria_id=categoria_id,
        mes_key=mes_key,
        total_celda=total,
        total_detalles=len([d for d in detalles if not d.is_deleted]),
        detalles=[CellDetailResponse.model_validate(d) for d in detalles],
    )


@router.get("/projects/{project_id}/cash-flow/proveedores", response_model=List[str])
async def list_proveedores(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Lista únicos de proveedores ya usados (autocomplete)."""
    result = await db.execute(
        select(CashFlowCellDetailModel.proveedor).where(
            and_(
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.is_deleted == False,
                CashFlowCellDetailModel.proveedor != None,
            )
        ).distinct()
    )
    return sorted([p for p in result.scalars().all() if p])


# ══════════════════════════════════════════════════════════════════════════════
# WRITE
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/projects/{project_id}/cash-flow/categorias/{categoria_id}/cell-details/{mes_key}",
    response_model=CellDetailResponse,
)
async def create_cell_detail(
    project_id: str,
    categoria_id: str,
    mes_key: str,
    body: CellDetailCreateRequest,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Agrega un detalle a una celda. Recalcula el total."""
    # Validar proyecto
    await _validate_project_exists(db, project_id)

    # Validar categoría
    cat_result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == categoria_id)
    )
    cat = cat_result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    detail_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    detail = CashFlowCellDetailModel(
        id=detail_id,
        project_id=project_id,
        categoria_id=categoria_id,
        mes_key=mes_key,
        numero_factura=body.numero_factura,
        proveedor=body.proveedor,
        valor=body.valor,
        nota=body.nota,
        fecha_factura=body.fecha_factura,
        documento_id=body.documento_id,
        created_by_id=current_user.id,
        created_by_name=current_user.full_name,
        created_by_role=current_user.role,
        created_at=now,
        updated_at=now,
    )
    db.add(detail)
    await db.flush()

    # Recalcular total de la celda
    nuevo_total = await _recalculate_cell_value(db, project_id, categoria_id, mes_key)

    # Audit
    await _log_action(
        db, project_id, categoria_id, cat.nombre, cat.grupo, mes_key,
        field="cell_detail_create",
        old_value=None,
        new_value=f"{body.numero_factura} | {body.proveedor or ''} | {body.valor}",
        user=current_user, action="create", request=request,
        notes=f"Nuevo detalle. Total celda: ${nuevo_total:,.2f}",
    )

    await db.commit()
    await db.refresh(detail)
    return detail


@router.put(
    "/projects/{project_id}/cash-flow/cell-details/{detail_id}",
    response_model=CellDetailResponse,
)
async def update_cell_detail(
    project_id: str,
    detail_id: str,
    body: CellDetailUpdateRequest,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Edita un detalle. Recalcula el total de la celda."""
    result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.id == detail_id,
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.is_deleted == False,
            )
        )
    )
    detail = result.scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")

    cat_result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == detail.categoria_id)
    )
    cat = cat_result.scalar_one_or_none()

    changed_fields = []
    old_valor = float(detail.valor)

    if body.numero_factura is not None and body.numero_factura != detail.numero_factura:
        changed_fields.append(f"factura: {detail.numero_factura} → {body.numero_factura}")
        detail.numero_factura = body.numero_factura
    if body.proveedor is not None and body.proveedor != detail.proveedor:
        changed_fields.append(f"proveedor: {detail.proveedor} → {body.proveedor}")
        detail.proveedor = body.proveedor
    if body.valor is not None and float(body.valor) != float(detail.valor):
        changed_fields.append(f"valor: {detail.valor} → {body.valor}")
        detail.valor = body.valor
    if body.nota is not None:
        detail.nota = body.nota
    if body.fecha_factura is not None:
        detail.fecha_factura = body.fecha_factura
    if body.documento_id is not None:
        detail.documento_id = body.documento_id

    detail.updated_by_id = current_user.id
    detail.updated_by_name = current_user.full_name
    detail.updated_at = datetime.now(timezone.utc)

    await db.flush()

    # Recalcular si cambió el valor
    nuevo_total = await _recalculate_cell_value(
        db, project_id, detail.categoria_id, detail.mes_key
    )

    if cat and changed_fields:
        await _log_action(
            db, project_id, detail.categoria_id, cat.nombre, cat.grupo, detail.mes_key,
            field="cell_detail_update",
            old_value=str(old_valor),
            new_value=str(detail.valor),
            user=current_user, action="edit", request=request,
            notes=" | ".join(changed_fields),
        )

    await db.commit()
    await db.refresh(detail)
    return detail


@router.delete("/projects/{project_id}/cash-flow/cell-details/{detail_id}")
async def delete_cell_detail(
    project_id: str,
    detail_id: str,
    request: Request,
    reason: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Soft delete de un detalle. Recalcula la celda."""
    result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.id == detail_id,
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.is_deleted == False,
            )
        )
    )
    detail = result.scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")

    cat_result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == detail.categoria_id)
    )
    cat = cat_result.scalar_one_or_none()

    detail.is_deleted = True
    detail.deleted_at = datetime.now(timezone.utc)
    detail.deleted_by_id = current_user.id
    detail.deleted_by_name = current_user.full_name
    detail.deleted_reason = reason

    await db.flush()
    nuevo_total = await _recalculate_cell_value(
        db, project_id, detail.categoria_id, detail.mes_key
    )

    if cat:
        await _log_action(
            db, project_id, detail.categoria_id, cat.nombre, cat.grupo, detail.mes_key,
            field="cell_detail_delete",
            old_value=f"{detail.numero_factura} | ${detail.valor}",
            new_value=None,
            user=current_user, action="delete", request=request,
            notes=f"Eliminado. Total celda: ${nuevo_total:,.2f}. {reason or ''}",
        )

    await db.commit()
    return {"deleted": True, "detail_id": detail_id, "nuevo_total": nuevo_total}


@router.post(
    "/projects/{project_id}/cash-flow/cell-details/{detail_id}/restore",
    response_model=CellDetailResponse,
)
async def restore_cell_detail(
    project_id: str,
    detail_id: str,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Restaura un detalle soft-deleted."""
    result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.id == detail_id,
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.is_deleted == True,
            )
        )
    )
    detail = result.scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle eliminado no encontrado")

    detail.is_deleted = False
    detail.deleted_at = None
    detail.deleted_by_id = None
    detail.deleted_by_name = None
    detail.deleted_reason = None

    await db.flush()
    await _recalculate_cell_value(db, project_id, detail.categoria_id, detail.mes_key)
    await db.commit()
    await db.refresh(detail)
    return detail


@router.post(
    "/projects/{project_id}/cash-flow/categorias/{categoria_id}/cell-details/{mes_key}/bulk",
    response_model=CellSummaryResponse,
)
async def bulk_upsert_cell_details(
    project_id: str,
    categoria_id: str,
    mes_key: str,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Reemplaza los detalles de una celda en una sola operación.

    Para cada item:
      - Si tiene id existente → actualiza
      - Si no tiene id → crea nuevo
      - Si is_deleted=true → soft delete
    """
    import json
    # Validar proyecto
    await _validate_project_exists(db, project_id)

    cat_result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == categoria_id)
    )
    cat = cat_result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    content_type = request.headers.get("content-type", "")
    form_data = None
    if "multipart/form-data" in content_type:
        form_data = await request.form()
        details_str = form_data.get("details")
        if not details_str:
            raise HTTPException(400, "Missing details field")
        parsed_details = json.loads(details_str)
        items = [BulkUpsertItem(**item) for item in parsed_details]
    else:
        body = await request.json()
        items = [BulkUpsertItem(**item) for item in body.get("details", [])]

    # Cargar detalles existentes de esta celda
    existing_result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.categoria_id == categoria_id,
                CashFlowCellDetailModel.mes_key == mes_key,
            )
        )
    )
    existing_map = {d.id: d for d in existing_result.scalars().all()}
    seen_ids = set()
    old_categorias = set()
    now = datetime.now(timezone.utc)

    for index, item in enumerate(items):
        doc_oc_file = form_data.get(f"doc_oc_{index}") if form_data else None
        doc_factura_file = form_data.get(f"doc_factura_{index}") if form_data else None

        doc_oc_bytes = await doc_oc_file.read() if hasattr(doc_oc_file, "read") else None
        doc_factura_bytes = await doc_factura_file.read() if hasattr(doc_factura_file, "read") else None

        if item.id and item.id in existing_map:
            # UPDATE existente
            d = existing_map[item.id]
            seen_ids.add(item.id)
            if item.is_deleted and not d.is_deleted:
                d.is_deleted = True
                d.deleted_at = now
                d.deleted_by_id = current_user.id
                d.deleted_by_name = current_user.full_name
            elif not item.is_deleted:
                if item.categoria_id and item.categoria_id != d.categoria_id:
                    old_categorias.add(d.categoria_id)
                    d.categoria_id = item.categoria_id
                
                d.numero_oc = item.numero_oc
                d.numero_factura = item.numero_factura
                d.proveedor = item.proveedor
                d.valor = item.valor
                d.nota = item.nota
                d.fecha_factura = item.fecha_factura
                d.documento_id = item.documento_id
                d.is_deleted = False
                d.incluir_en_grafico = item.incluir_en_grafico
                d.updated_by_id = current_user.id
                d.updated_by_name = current_user.full_name
                d.updated_at = now
                
                if doc_oc_bytes:
                    d.doc_oc_contrato = doc_oc_bytes
                    d.doc_oc_contrato_nombre = doc_oc_file.filename
                    d.doc_oc_contrato_tipo = doc_oc_file.content_type
                if doc_factura_bytes:
                    d.doc_factura = doc_factura_bytes
                    d.doc_factura_nombre = doc_factura_file.filename
                    d.doc_factura_tipo = doc_factura_file.content_type
        else:
            # CREATE nuevo
            if item.is_deleted:
                continue
            new_id = str(uuid.uuid4())
            new_cat_id = item.categoria_id if item.categoria_id else categoria_id
            if new_cat_id != categoria_id:
                old_categorias.add(new_cat_id) # to recalculate the target if it's different from the URL category
                
            new_detail = CashFlowCellDetailModel(
                id=new_id,
                project_id=project_id,
                categoria_id=new_cat_id,
                mes_key=mes_key,
                numero_oc=item.numero_oc,
                numero_factura=item.numero_factura,
                proveedor=item.proveedor,
                valor=item.valor,
                nota=item.nota,
                fecha_factura=item.fecha_factura,
                documento_id=item.documento_id,
                created_by_id=current_user.id,
                created_by_name=current_user.full_name,
                created_by_role=current_user.role,
                created_at=now,
                updated_at=now,
            )
            if doc_oc_bytes:
                new_detail.doc_oc_contrato = doc_oc_bytes
                new_detail.doc_oc_contrato_nombre = doc_oc_file.filename
                new_detail.doc_oc_contrato_tipo = doc_oc_file.content_type
            if doc_factura_bytes:
                new_detail.doc_factura = doc_factura_bytes
                new_detail.doc_factura_nombre = doc_factura_file.filename
                new_detail.doc_factura_tipo = doc_factura_file.content_type
            db.add(new_detail)
            seen_ids.add(new_id)

    await db.flush()

    # Recalcular total de la celda actual
    nuevo_total = await _recalculate_cell_value(db, project_id, categoria_id, mes_key)
    
    # Recalcular totales de las categorías que recibieron/perdieron detalles
    for old_cat in old_categorias:
        if old_cat != categoria_id:
            await _recalculate_cell_value(db, project_id, old_cat, mes_key)

    await _log_action(
        db, project_id, categoria_id, cat.nombre, cat.grupo, mes_key,
        field="cell_details_bulk_update",
        old_value=None,
        new_value=f"{len(items)} items",
        user=current_user, action="bulk_update", request=request,
        notes=f"Total celda recalculado: ${nuevo_total:,.2f}",
    )

    await db.commit()

    # Devolver estado final
    final_result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.categoria_id == categoria_id,
                CashFlowCellDetailModel.mes_key == mes_key,
                CashFlowCellDetailModel.is_deleted == False,
            )
        ).order_by(CashFlowCellDetailModel.created_at)
    )
    detalles = list(final_result.scalars().all())

    return CellSummaryResponse(
        project_id=project_id,
        categoria_id=categoria_id,
        mes_key=mes_key,
        total_celda=nuevo_total,
        total_detalles=len(detalles),
        detalles=[CellDetailResponse.model_validate(d) for d in detalles],
    )


@router.patch("/projects/{project_id}/cash-flow/cell-details/{detail_id}/toggle-inclusion")
async def toggle_detail_inclusion(
    project_id: str,
    detail_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Alterna el estado de inclusión en gráficos para un detalle individual."""
    result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.id == detail_id,
                CashFlowCellDetailModel.project_id == project_id,
            )
        )
    )
    detail = result.scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")

    detail.incluir_en_grafico = not detail.incluir_en_grafico
    detail.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    return {"ok": True, "detail_id": detail_id, "incluir_en_grafico": detail.incluir_en_grafico}

@router.get("/projects/{project_id}/cash-flow/cell-details/{detail_id}/doc-oc")
async def get_doc_oc(
    project_id: str,
    detail_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.id == detail_id,
                CashFlowCellDetailModel.project_id == project_id,
            )
        )
    )
    detail = result.scalar_one_or_none()
    if not detail or not detail.doc_oc_contrato:
        raise HTTPException(status_code=404, detail="Documento OC no encontrado")
        
    return Response(
        content=detail.doc_oc_contrato,
        media_type=detail.doc_oc_contrato_tipo or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{detail.doc_oc_contrato_nombre}"'
        }
    )

@router.get("/projects/{project_id}/cash-flow/cell-details/{detail_id}/doc-factura")
async def get_doc_factura(
    project_id: str,
    detail_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.id == detail_id,
                CashFlowCellDetailModel.project_id == project_id,
            )
        )
    )
    detail = result.scalar_one_or_none()
    if not detail or not detail.doc_factura:
        raise HTTPException(status_code=404, detail="Documento de Factura no encontrado")
        
    return Response(
        content=detail.doc_factura,
        media_type=detail.doc_factura_tipo or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{detail.doc_factura_nombre}"'
        }
    )
