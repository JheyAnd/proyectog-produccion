"""
Endpoints v2 para Flujo de Caja con auditoría completa.

Origen: Excel "Flujo de caja patio sur 6 abril.xlsx" → Hoja "FC X Obras"
Política:
- Importar Excel: REEMPLAZA datos del proyecto
- Edición manual: registrada en cash_flow_audit_log
"""
import hashlib
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select, and_, delete, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.services.cash_flow_excel_parser import parse_cash_flow_excel
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.egreso_model import (
    EgresoCategoriaModel,
    EgresoValorModel,
)
from src.infrastructure.database.models.cash_flow_v2_model import (
    CashFlowAuditLogModel,
    CashFlowImportLogModel,
)
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.models.project_model import ProjectModel
from src.interface.api.v1.dependencies.auth import get_current_user, get_current_user_optional
from src.socket_manager import broadcast_preference_update

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class CategoriaResponse(BaseModel):
    id: str
    nombre: str
    grupo: str
    incluir_en_grafico: bool
    sort_order: int
    valores: dict
    meses_con_detalle: List[str] = []
    model_config = {"from_attributes": True}


class CashFlowSummaryResponse(BaseModel):
    project_id: str
    total_categorias: int
    grupos: dict  # {grupo: total}
    total_general: float
    real_acumulado_actual: dict  # por fecha de corte (Abr 2026)
    proyectado_total: float
    last_imported_at: Optional[datetime] = None
    last_imported_by: Optional[str] = None
    last_imported_filename: Optional[str] = None


class ValorUpdateRequest(BaseModel):
    mes_key: str
    nuevo_valor: float
    notes: Optional[str] = None
    # Contexto opcional para auto-create con datos correctos
    cat_nombre: Optional[str] = None
    cat_grupo: Optional[str] = None


class CategoriaCreateRequest(BaseModel):
    id: Optional[str] = None              # si null, se autogenera
    nombre: str
    grupo: str                             # 'materiales' | 'mano_obra' | 'administracion' | 'ingreso'
    incluir_en_grafico: bool = True
    sort_order: int = 999
    valores: Optional[dict] = None         # opcional: {mes_key: valor} inicial


class SeedItem(BaseModel):
    id: str
    nombre: str
    grupo: str
    incluir_en_grafico: bool = True
    sort_order: int = 0
    valores: Optional[dict] = None


class SeedRequest(BaseModel):
    categorias: List[SeedItem]


class CategoriaUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    grupo: Optional[str] = None
    incluir_en_grafico: Optional[bool] = None
    sort_order: Optional[int] = None


class ImportLogResponse(BaseModel):
    id: str
    filename: str
    sheet_name: Optional[str] = None
    total_categorias: int
    total_valores: int
    sum_total: float
    imported_by_name: str
    imported_by_role: str
    status: str
    imported_at: datetime
    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    id: str
    categoria_nombre: Optional[str] = None
    grupo: Optional[str] = None
    mes_key: Optional[str] = None
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    user_name: str
    user_role: str
    action: str
    occurred_at: datetime
    notes: Optional[str] = None
    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _client_ip(request: Request) -> Optional[str]:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


# ══════════════════════════════════════════════════════════════════════════════
# READ ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/projects/{project_id}/cash-flow/categorias", response_model=List[CategoriaResponse])
async def list_categorias(
    project_id: str,
    grupo: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
):
    """Lista categorías de Flujo de Caja con sus valores mensuales."""
    query = select(EgresoCategoriaModel).where(EgresoCategoriaModel.project_id == project_id)
    if grupo:
        query = query.where(EgresoCategoriaModel.grupo == grupo)
    query = query.order_by(EgresoCategoriaModel.sort_order)

    result = await db.execute(query)
    cats = list(result.scalars().all())

    # ── Aplicar Plantilla si está vacío (excepto Patio Sur) ──
    if not cats and not grupo and project_id != 'patio-sur-oe1035':
        print(f"[CashFlow v2] Proyecto {project_id} vacío. Aplicando plantilla maestra...")
        try:
            # Leer plantilla
            template_result = await db.execute(text("SELECT nombre, grupo, sort_order FROM egreso_categorias_template ORDER BY sort_order"))
            template_rows = template_result.fetchall()
            
            if template_rows:
                new_cats = []
                for row in template_rows:
                    cat_id = f"{row[1][:3]}-{str(uuid.uuid4())[:8]}" # Generar ID corto
                    new_cat = EgresoCategoriaModel(
                        id=cat_id,
                        project_id=project_id,
                        nombre=row[0],
                        grupo=row[1],
                        sort_order=row[2],
                        incluir_en_grafico=True
                    )
                    db.add(new_cat)
                    new_cats.append(new_cat)
                
                await db.commit()
                # Recargar para devolver con la estructura correcta
                result = await db.execute(query)
                cats = list(result.scalars().all())
                print(f"[CashFlow v2] Plantilla aplicada con éxito ({len(cats)} categorías)")
        except Exception as e:
            print(f"[CashFlow v2] Error aplicando plantilla: {e}")
            await db.rollback()

    from src.infrastructure.database.models.cash_flow_cell_detail_model import CashFlowCellDetailModel

    # Consultar de forma agrupada los meses con detalles activos para este proyecto
    detail_query = (
        select(
            CashFlowCellDetailModel.categoria_id,
            CashFlowCellDetailModel.mes_key
        )
        .where(
            and_(
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.is_deleted == False
            )
        )
        .group_by(
            CashFlowCellDetailModel.categoria_id,
            CashFlowCellDetailModel.mes_key
        )
    )
    detail_result = await db.execute(detail_query)
    cat_details_map = {}
    for cat_id, mes in detail_result.all():
        if cat_id not in cat_details_map:
            cat_details_map[cat_id] = set()
        cat_details_map[cat_id].add(mes)

    response = []
    for c in cats:
        valores_map = {v.mes_key: v.valor for v in c.valores}
        meses_con_detalle = list(cat_details_map.get(c.id, set()))
        meses_con_detalle.sort()
        response.append(CategoriaResponse(
            id=c.id,
            nombre=c.nombre,
            grupo=c.grupo,
            incluir_en_grafico=c.incluir_en_grafico,
            sort_order=c.sort_order,
            valores=valores_map,
            meses_con_detalle=meses_con_detalle,
        ))
    return response


@router.get("/projects/{project_id}/cash-flow/summary", response_model=CashFlowSummaryResponse)
async def get_summary(
    project_id: str,
    cutoff_month: str = "2026-04",
    db: AsyncSession = Depends(get_db_session),
):
    """
    Resumen del Flujo de Caja: totales por grupo + Real Acumulado al mes de corte.

    Esta es la base de la BARRA 4 del gráfico comparativo.
    """
    result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.project_id == project_id)
    )
    cats = list(result.scalars().all())

    grupos: dict = {"materiales": 0.0, "mano_obra": 0.0, "administracion": 0.0, "ingreso": 0.0}
    real_acumulado: dict = {"materiales": 0.0, "mano_obra": 0.0, "administracion": 0.0, "ingreso": 0.0}

    proyectado_total = 0.0
    for c in cats:
        if not c.incluir_en_grafico:
            continue
        for v in c.valores:
            grupos[c.grupo] = grupos.get(c.grupo, 0) + v.valor
            proyectado_total += v.valor
            if v.mes_key <= cutoff_month:
                real_acumulado[c.grupo] = real_acumulado.get(c.grupo, 0) + v.valor

    # Última importación
    imp = await db.execute(
        select(CashFlowImportLogModel)
        .where(CashFlowImportLogModel.project_id == project_id)
        .order_by(CashFlowImportLogModel.imported_at.desc())
        .limit(1)
    )
    last_import = imp.scalar_one_or_none()

    return CashFlowSummaryResponse(
        project_id=project_id,
        total_categorias=len(cats),
        grupos=grupos,
        total_general=sum(grupos.values()),
        real_acumulado_actual=real_acumulado,
        proyectado_total=proyectado_total,
        last_imported_at=last_import.imported_at if last_import else None,
        last_imported_by=last_import.imported_by_name if last_import else None,
        last_imported_filename=last_import.filename if last_import else None,
    )


@router.get("/projects/{project_id}/cash-flow/audit-log", response_model=List[AuditLogResponse])
async def get_audit_log(
    project_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
):
    """Historial de ediciones del Flujo de Caja."""
    result = await db.execute(
        select(CashFlowAuditLogModel)
        .where(CashFlowAuditLogModel.project_id == project_id)
        .order_by(CashFlowAuditLogModel.occurred_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


@router.get("/projects/{project_id}/cash-flow/import-log", response_model=List[ImportLogResponse])
async def get_import_log(
    project_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db_session),
):
    """Historial de importaciones de Excel."""
    result = await db.execute(
        select(CashFlowImportLogModel)
        .where(CashFlowImportLogModel.project_id == project_id)
        .order_by(CashFlowImportLogModel.imported_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ══════════════════════════════════════════════════════════════════════════════
# WRITE ENDPOINTS (auditados)
# ══════════════════════════════════════════════════════════════════════════════

@router.put("/projects/{project_id}/cash-flow/categorias/{categoria_id}/valores")
async def update_valor(
    project_id: str,
    categoria_id: str,
    body: ValorUpdateRequest,
    request: Request,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Edita/crea un valor mensual. UPSERT seguro:
    """
    # Validar si tiene detalles activos
    from src.infrastructure.database.models.cash_flow_cell_detail_model import CashFlowCellDetailModel
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

    print(f"[CashFlow v2] update_valor: cat={categoria_id}, mes={body.mes_key}, val={body.nuevo_valor}")
    # Buscar categoría
    cat_result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == categoria_id)
    )
    cat = cat_result.scalar_one_or_none()

    # UPSERT: si la categoría no existe, crearla automáticamente con datos del frontend
    if not cat:
        # Si el frontend envió nombre/grupo, usarlos. Si no, inferir.
        nombre_real = body.cat_nombre
        grupo_real = body.cat_grupo

        if not grupo_real:
            # Inferir grupo del prefijo del id (fallback)
            prefijo = categoria_id.split("-")[0].lower() if "-" in categoria_id else "materiales"
            grupo_map = {
                "mat": "materiales",
                "mo": "mano_obra",
                "adm": "administracion",
                "ing": "ingreso",
            }
            grupo_real = grupo_map.get(prefijo, "materiales")

        if not nombre_real:
            nombre_real = categoria_id.replace("-", " ").title()

        cat = EgresoCategoriaModel(
            id=categoria_id,
            project_id=project_id,
            nombre=nombre_real,
            grupo=grupo_real,
            incluir_en_grafico=True,
            sort_order=999,
        )
        db.add(cat)
        await db.flush()
        print(f"[CashFlow v2] Auto-creada categoria '{categoria_id}' "
              f"(nombre='{nombre_real}', grupo={grupo_real}) en project={project_id}")

    # Buscar valor existente
    val_result = await db.execute(
        select(EgresoValorModel).where(
            and_(
                EgresoValorModel.categoria_id == categoria_id,
                EgresoValorModel.mes_key == body.mes_key,
            )
        )
    )
    valor = val_result.scalar_one_or_none()

    old_value = float(valor.valor) if valor else 0.0

    if valor:
        if old_value == body.nuevo_valor:
            return {"changed": False}
        valor.valor = body.nuevo_valor
    else:
        valor = EgresoValorModel(
            id=str(uuid.uuid4()),
            categoria_id=categoria_id,
            project_id=project_id,
            mes_key=body.mes_key,
            valor=body.nuevo_valor,
        )
        db.add(valor)

    # Audit (solo si hay user autenticado; sin user no rompe el guardado)
    if current_user is not None:
        db.add(CashFlowAuditLogModel(
            id=str(uuid.uuid4()),
            project_id=project_id,
            categoria_id=categoria_id,
            categoria_nombre=cat.nombre,
            grupo=cat.grupo,
            mes_key=body.mes_key,
            field_name="valor",
            old_value=str(old_value),
            new_value=str(body.nuevo_valor),
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=current_user.role,
            action="edit",
            ip_address=_client_ip(request),
            notes=body.notes,
        ))

    await db.commit()
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})
    return {
        "changed": True,
        "categoria_id": categoria_id,
        "mes_key": body.mes_key,
        "old_value": old_value,
        "new_value": float(body.nuevo_valor),
        "user": current_user.full_name if current_user else None,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SEED INICIAL (poblar BD vacía con datos del frontend la primera vez)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/projects/{project_id}/cash-flow/seed-initial")
async def seed_initial(
    project_id: str,
    body: SeedRequest,
    request: Request,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Seed inicial: solo se ejecuta si la BD está VACÍA para este proyecto.
    """
    # Verificar si ya hay categorías
    count_result = await db.execute(
        select(func.count(EgresoCategoriaModel.id)).where(
            EgresoCategoriaModel.project_id == project_id
        )
    )
    existing_count = count_result.scalar() or 0

    if existing_count > 0:
        return {
            "seeded": False,
            "reason": "ya_existen_datos",
            "categorias_existentes": existing_count,
        }

    # BD vacía → poblar con seed
    inserted = 0
    valores_inserted = 0
    for item in body.categorias:
        cat = EgresoCategoriaModel(
            id=item.id,
            project_id=project_id,
            nombre=item.nombre,
            grupo=item.grupo,
            incluir_en_grafico=item.incluir_en_grafico,
            sort_order=item.sort_order,
        )
        db.add(cat)
        inserted += 1
        if item.valores:
            for mes_key, valor in item.valores.items():
                if valor is None:
                    continue
                db.add(EgresoValorModel(
                    id=str(uuid.uuid4()),
                    categoria_id=item.id,
                    project_id=project_id,
                    mes_key=mes_key,
                    valor=float(valor),
                ))
                valores_inserted += 1

    if current_user:
        db.add(CashFlowAuditLogModel(
            id=str(uuid.uuid4()),
            project_id=project_id,
            field_name="seed_initial",
            old_value=None,
            new_value=f"{inserted} categorias",
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=current_user.role,
            action="bulk_update",
            ip_address=_client_ip(request),
            notes=f"Seed inicial: {inserted} categorias, {valores_inserted} valores",
        ))

    await db.commit()
    return {
        "seeded": True,
        "categorias_insertadas": inserted,
        "valores_insertados": valores_inserted,
    }


# ══════════════════════════════════════════════════════════════════════════════
# CRUD DE CATEGORÍAS (crear, actualizar, eliminar)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/projects/{project_id}/cash-flow/categorias", response_model=CategoriaResponse)
async def create_categoria(
    project_id: str,
    body: CategoriaCreateRequest,
    request: Request,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db_session),
):
    print(f"[CashFlow v2] create_categoria: id={body.id}, nombre={body.nombre}, grupo={body.grupo}")
    """
    Crea una nueva categoría de Flujo de Caja. UPSERT seguro:
    - Si el id ya existe → actualiza (nombre/grupo/etc.)
    - Si no existe → crea
    Opcionalmente puede traer valores iniciales (dict mes_key → valor).
    """
    valid_grupos = {"materiales", "mano_obra", "administracion", "ingreso"}
    if body.grupo not in valid_grupos:
        raise HTTPException(
            status_code=400,
            detail=f"Grupo inválido. Válidos: {', '.join(sorted(valid_grupos))}",
        )

    # Generar id si no viene
    if not body.id:
        # Prefijo basado en grupo
        prefix_map = {"materiales": "mat", "mano_obra": "mo", "administracion": "adm", "ingreso": "ing"}
        slug = body.nombre.lower().replace(" ", "-").replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n")
        slug = "".join(c for c in slug if c.isalnum() or c == "-")[:50]
        cat_id = f"{prefix_map.get(body.grupo, 'cat')}-{slug}-{uuid.uuid4().hex[:6]}"
    else:
        cat_id = body.id

    # Buscar si ya existe
    existing = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == cat_id)
    )
    cat = existing.scalar_one_or_none()

    if cat:
        # UPDATE
        cat.nombre = body.nombre
        cat.grupo = body.grupo
        cat.incluir_en_grafico = body.incluir_en_grafico
        cat.sort_order = body.sort_order
        action = "update"
    else:
        # CREATE
        cat = EgresoCategoriaModel(
            id=cat_id,
            project_id=project_id,
            nombre=body.nombre,
            grupo=body.grupo,
            incluir_en_grafico=body.incluir_en_grafico,
            sort_order=body.sort_order,
        )
        db.add(cat)
        action = "create"

    await db.flush()

    # UPSERT de valores iniciales si vinieron (evita duplicados)
    if body.valores:
        # Cargar valores existentes para esta categoría
        existing_vals_result = await db.execute(
            select(EgresoValorModel).where(EgresoValorModel.categoria_id == cat_id)
        )
        existing_vals = {v.mes_key: v for v in existing_vals_result.scalars().all()}

        for mes_key, valor in body.valores.items():
            if valor is None:
                continue
            existing_val = existing_vals.get(mes_key)
            if existing_val:
                existing_val.valor = float(valor)
            else:
                db.add(EgresoValorModel(
                    id=str(uuid.uuid4()),
                    categoria_id=cat_id,
                    project_id=project_id,
                    mes_key=mes_key,
                    valor=float(valor),
                ))

    # Audit
    if current_user:
        db.add(CashFlowAuditLogModel(
            id=str(uuid.uuid4()),
            project_id=project_id,
            categoria_id=cat_id,
            categoria_nombre=body.nombre,
            grupo=body.grupo,
            mes_key=None,
            field_name="categoria",
            old_value=None,
            new_value=body.nombre,
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=current_user.role,
            action="create",
            ip_address=_client_ip(request),
            notes=f"Categoria {action}: '{body.nombre}' (grupo={body.grupo})",
        ))

    await db.commit()
    await db.refresh(cat)
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})

    valores_map = {v.mes_key: float(v.valor) for v in cat.valores}
    return CategoriaResponse(
        id=cat.id,
        nombre=cat.nombre,
        grupo=cat.grupo,
        incluir_en_grafico=cat.incluir_en_grafico,
        sort_order=cat.sort_order,
        valores=valores_map,
    )


@router.put("/projects/{project_id}/cash-flow/categorias/{categoria_id}", response_model=CategoriaResponse)
async def update_categoria(
    project_id: str,
    categoria_id: str,
    body: CategoriaUpdateRequest,
    request: Request,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db_session),
):
    """Actualiza nombre/grupo/incluir/orden de una categoría."""
    result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == categoria_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    if body.nombre is not None:
        cat.nombre = body.nombre
    if body.grupo is not None:
        cat.grupo = body.grupo
    if body.incluir_en_grafico is not None:
        cat.incluir_en_grafico = body.incluir_en_grafico
    if body.sort_order is not None:
        cat.sort_order = body.sort_order

    await db.commit()
    await db.refresh(cat)
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})

    valores_map = {v.mes_key: float(v.valor) for v in cat.valores}
    return CategoriaResponse(
        id=cat.id,
        nombre=cat.nombre,
        grupo=cat.grupo,
        incluir_en_grafico=cat.incluir_en_grafico,
        sort_order=cat.sort_order,
        valores=valores_map,
    )


@router.patch("/projects/{project_id}/cash-flow/categorias/{categoria_id}/incluir")
async def toggle_incluir_en_grafico(
    project_id: str,
    categoria_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Persiste incluir_en_grafico para una categoria.
    Body: { "incluir_en_grafico": true | false }
    """
    result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == categoria_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail=f"Categoria '{categoria_id}' no encontrada")

    nuevo_valor = body.get("incluir_en_grafico")
    if nuevo_valor is None:
        raise HTTPException(status_code=400, detail="Campo 'incluir_en_grafico' requerido")

    cat.incluir_en_grafico = bool(nuevo_valor)
    cat.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(cat)
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})

    return {
        "ok": True,
        "categoria_id": categoria_id,
        "nombre": cat.nombre,
        "incluir_en_grafico": cat.incluir_en_grafico,
    }


@router.delete("/projects/{project_id}/cash-flow/categorias/{categoria_id}")
async def delete_categoria(
    project_id: str,
    categoria_id: str,
    request: Request,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db_session),
):
    """Elimina una categoría y todos sus valores. Hard delete (cascade)."""
    from sqlalchemy import delete as sql_delete

    result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.id == categoria_id)
    )
    cat = result.scalar_one_or_none()
    if not cat:
        return {"deleted": False, "reason": "no_existia"}

    nombre_ant = cat.nombre
    grupo_ant = cat.grupo

    await db.execute(
        sql_delete(EgresoCategoriaModel).where(EgresoCategoriaModel.id == categoria_id)
    )

    if current_user:
        db.add(CashFlowAuditLogModel(
            id=str(uuid.uuid4()),
            project_id=project_id,
            categoria_id=categoria_id,
            categoria_nombre=nombre_ant,
            grupo=grupo_ant,
            mes_key=None,
            field_name="categoria",
            old_value=nombre_ant,
            new_value=None,
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=current_user.role,
            action="delete",
            ip_address=_client_ip(request),
            notes=f"Eliminada categoria '{nombre_ant}' (grupo={grupo_ant})",
        ))

    await db.commit()
    await broadcast_preference_update("egresos_categorias", {"project_id": project_id})
    return {"deleted": True, "categoria_id": categoria_id, "nombre": nombre_ant}


# ══════════════════════════════════════════════════════════════════════════════
# IMPORT EXCEL (REEMPLAZA datos)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/projects/{project_id}/cash-flow/import-excel")
async def import_excel(
    project_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Importa Excel del Flujo de Caja. REEMPLAZA datos existentes."""
    import sys
    print(f"\n[IMPORT-EXCEL] *** START *** project_id={project_id}", file=sys.stderr, flush=True)

    if current_user.role not in ("controller", "gerente", "administrador"):
        raise HTTPException(status_code=403, detail="Sin permiso para importar")

    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo archivos Excel")

    # Guardar temporal y calcular hash
    suffix = Path(file.filename).suffix
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        # Obtener project_start_date del proyecto
        project_result = await db.execute(
            select(ProjectModel).where(ProjectModel.id == project_id)
        )
        project = project_result.scalar_one_or_none()

        if not project:
            raise HTTPException(status_code=404, detail=f"Proyecto no encontrado: {project_id}")

        project_start_date = project.start_date

        # Parser soporta string o datetime
        parsed = parse_cash_flow_excel(tmp_path, project_start_date=project_start_date)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parseando: {str(e)}")
    finally:
        try:
            tmp_path.unlink()
        except Exception:
            pass

    metadata = parsed.get("metadata", {})
    cats_data = parsed.get("categorias", [])

    if not cats_data:
        # DEBUG: retornar info sobre qué pasó
        raise HTTPException(
            status_code=400,
            detail=f"Excel sin categorías reconocibles. project_start_date={project_start_date}, meses detectados={metadata.get('months_detected', [])}"
        )

    # REEMPLAZAR: borrar categorías + valores existentes del proyecto
    existing = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.project_id == project_id)
    )
    for cat in existing.scalars().all():
        await db.execute(delete(EgresoCategoriaModel).where(EgresoCategoriaModel.id == cat.id))
    await db.flush()

    # Insertar nuevas
    sum_total = 0.0
    total_valores = 0
    for cat_data in cats_data:
        cat_id = str(uuid.uuid4())
        db.add(EgresoCategoriaModel(
            id=cat_id,
            project_id=project_id,
            nombre=cat_data["nombre"],
            grupo=cat_data["grupo"],
            incluir_en_grafico=cat_data.get("incluir_en_grafico", True),
            sort_order=cat_data.get("sort_order", 0),
        ))
        for mes_key, valor in cat_data["valores"].items():
            db.add(EgresoValorModel(
                id=str(uuid.uuid4()),
                categoria_id=cat_id,
                project_id=project_id,
                mes_key=mes_key,
                valor=valor,
            ))
            total_valores += 1
            sum_total += valor

    # Log de importación
    import_log = CashFlowImportLogModel(
        id=str(uuid.uuid4()),
        project_id=project_id,
        filename=file.filename,
        file_hash_sha256=file_hash,
        sheet_name=metadata.get("sheet"),
        total_categorias=len(cats_data),
        total_valores=total_valores,
        total_meses=len(metadata.get("months_detected", [])),
        sum_total=sum_total,
        imported_by_id=current_user.id,
        imported_by_name=current_user.full_name,
        imported_by_role=current_user.role,
        ip_address=_client_ip(request),
        status="success",
    )
    db.add(import_log)

    # Audit log: registro de la acción masiva
    db.add(CashFlowAuditLogModel(
        id=str(uuid.uuid4()),
        project_id=project_id,
        field_name="_import_excel_",
        old_value=None,
        new_value=file.filename,
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        action="import_excel",
        ip_address=_client_ip(request),
        notes=f"Importación masiva: {len(cats_data)} categorías, {total_valores} valores",
    ))

    await db.commit()

    return {
        "status": "imported",
        "filename": file.filename,
        "imported_by": current_user.full_name,
        "summary": {
            "categorias": len(cats_data),
            "valores": total_valores,
            "sum_total": sum_total,
            "sheet": metadata.get("sheet"),
            "months_detected": len(metadata.get("months_detected", [])),
        },
        "warning": "Se REEMPLAZARON todos los datos del Flujo de Caja del proyecto.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# VISTA FINANZAS — Desglose mensual por factura agrupado por sección
# ══════════════════════════════════════════════════════════════════════════════

# Mapa: grupo en BD → nombre de sección de display
_GRUPO_A_SECCION: dict = {
    "ingreso":        "INGRESO",
    "materiales":     "MATERIALES",
    "mano_obra":      "MANO DE OBRA",
    "administracion": "ADMINISTRATIVOS DIRECTIVOS",
    "intereses":      "INTERESES",
}
# Orden de secciones en el desglose
_SECCION_ORDER = ["INGRESO", "MATERIALES", "MANO DE OBRA", "ADMINISTRATIVOS DIRECTIVOS", "INTERESES"]


@router.get("/projects/{project_id}/cash-flow/finance-view")
async def get_finance_view(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Vista Finanzas: desglose mensual de movimientos con detalle por factura.

    Respuesta:
    {
      "meses": [
        {
          "periodo": "2026-01",
          "label": "Ene 2026",
          "total": 12345678.0,
          "totalFacturas": 5,
          "secciones": [
            {
              "nombre": "MATERIALES",
              "total": 9876543.0,
              "categorias": [
                {
                  "nombre": "Hierro",
                  "total": 5000000.0,
                  "detalles": [
                    {
                      "id": "...",
                      "factura": "F-001",
                      "proveedor": "Aceros SA",
                      "valor": 2500000.0,
                      "fecha_factura": "2026-01-15",
                      "nota": null
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
    """
    from src.infrastructure.database.models.cash_flow_cell_detail_model import CashFlowCellDetailModel

    # ── 1. Cargar categorías del proyecto (para nombre y grupo) ──
    cats_result = await db.execute(
        select(EgresoCategoriaModel).where(EgresoCategoriaModel.project_id == project_id)
    )
    cat_map: dict = {}  # id → {nombre, grupo}
    for cat in cats_result.scalars().all():
        cat_map[cat.id] = {"nombre": cat.nombre, "grupo": cat.grupo}

    # ── 2. Cargar detalles activos del proyecto ──
    details_result = await db.execute(
        select(CashFlowCellDetailModel).where(
            and_(
                CashFlowCellDetailModel.project_id == project_id,
                CashFlowCellDetailModel.is_deleted == False,
            )
        ).order_by(
            CashFlowCellDetailModel.mes_key,
            CashFlowCellDetailModel.categoria_id,
            CashFlowCellDetailModel.fecha_factura,
            CashFlowCellDetailModel.created_at,
        )
    )
    details = list(details_result.scalars().all())

    # ── 3. Agrupar por mes → sección → categoría ──
    # Estructura: mes_key → seccion_nombre → cat_nombre → list[detalle]
    from collections import defaultdict

    meses_data: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    for d in details:
        cat_info = cat_map.get(d.categoria_id, {"nombre": d.categoria_id, "grupo": "materiales"})
        seccion = _GRUPO_A_SECCION.get(cat_info["grupo"], cat_info["grupo"].upper())
        meses_data[d.mes_key][seccion][cat_info["nombre"]].append(d)

    # ── 4. Construir respuesta ──
    meses_keys = sorted(meses_data.keys())

    MESES_ES = {
        "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
        "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
        "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
    }

    def mes_label(periodo: str) -> str:
        """Convierte '2026-01' → 'Ene 2026'"""
        try:
            year, month = periodo.split("-")
            return f"{MESES_ES.get(month, month)} {year}"
        except Exception:
            return periodo

    meses_response = []
    for mes_key in meses_keys:
        secciones_raw = meses_data[mes_key]
        secciones_list = []
        total_mes = 0.0
        total_facturas_mes = 0

        # Ordenar secciones según _SECCION_ORDER; las no reconocidas al final
        seccion_names_sorted = sorted(
            secciones_raw.keys(),
            key=lambda s: _SECCION_ORDER.index(s) if s in _SECCION_ORDER else 99,
        )

        for seccion_nombre in seccion_names_sorted:
            cats_raw = secciones_raw[seccion_nombre]
            cats_list = []
            total_seccion = 0.0

            for cat_nombre, det_list in sorted(cats_raw.items()):
                detalles_out = []
                total_cat = 0.0
                for det in det_list:
                    val = float(det.valor)
                    total_cat += val
                    detalles_out.append({
                        "id": det.id,
                        "factura": det.numero_factura or "S/N",
                        "proveedor": det.proveedor,
                        "nota": det.nota,
                        "valor": val,
                        "fecha_factura": det.fecha_factura.isoformat() if det.fecha_factura else None,
                    })
                cats_list.append({
                    "nombre": cat_nombre,
                    "total": total_cat,
                    "detalles": detalles_out,
                })
                total_seccion += total_cat
                total_facturas_mes += len(detalles_out)

            secciones_list.append({
                "nombre": seccion_nombre,
                "total": total_seccion,
                "categorias": cats_list,
            })
            total_mes += total_seccion

        meses_response.append({
            "periodo": mes_key,
            "label": mes_label(mes_key),
            "total": total_mes,
            "totalFacturas": total_facturas_mes,
            "secciones": secciones_list,
        })

    return {"meses": meses_response}
