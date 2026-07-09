"""
API endpoints — Seguimiento de Proyectos PCM/PCS.
Reemplaza el almacenamiento en project_preferences (key-value JSON)
con una tabla relacional propia: project_tracking.
"""
from datetime import datetime, timezone
from typing import Any, Optional
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models.project_tracking_model import ProjectTrackingModel
from src.infrastructure.database.models.project_tracking_history_model import ProjectTrackingHistoryModel
from src.infrastructure.database.models.project_model import ProjectModel
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.infrastructure.database.session import get_db_session
from src.socket_manager import broadcast_preference_update
from src.interface.api.v1.dependencies.auth import require_role, get_current_user

router = APIRouter(prefix="/project-tracking", tags=["Project Tracking"])


# ── Schemas Pydantic ─────────────────────────────────────────────

class ProjectTrackingSchema(BaseModel):
    id: str
    project_id: Optional[str] = None
    sheet_name: Optional[str] = None
    group: Optional[str] = None
    fecha_informe: Optional[str] = None
    nombre_proyecto: Optional[str] = None
    nombre_contrato: Optional[str] = None
    codigo_proyecto: Optional[str] = None
    cliente: Optional[str] = None
    gerente_proyecto_cliente: Optional[str] = None
    administrador_contrato_cliente: Optional[str] = None
    interventor: Optional[str] = None
    director_proyectos: Optional[str] = None
    ingeniero_residente: Optional[str] = None
    supervisor: Optional[str] = None
    encargado: Optional[str] = None
    tipo_contrato: Optional[str] = None
    requiere_auxilios: Optional[str] = None
    polizas_requeridas: Optional[str] = None
    multas_penalidades: Optional[str] = None
    alcance: Optional[str] = None
    localizacion: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_finalizacion_contractual: Optional[str] = None
    valor_original_contrato: Optional[float] = None
    porcentaje_anticipo: Optional[float] = None
    retencion_garantia: Optional[float] = None
    utilidad_proyectada: Optional[float] = None
    fecha_terminacion_estimada: Optional[str] = None
    avance_programado: Optional[float] = None
    avance_real: Optional[float] = None
    modificacion_alcance: Optional[str] = None
    ordenes_compra: Optional[str] = None
    alcance_ordenes: Optional[str] = None
    tiempo_ordenes: Optional[str] = None
    valor_ordenes: Optional[float] = None
    estado_facturacion_ordenes: Optional[str] = None
    desviaciones_detectadas: Optional[str] = None
    justificacion_desviaciones: Optional[str] = None
    valor_otros_adiciones: Optional[float] = None
    valor_actual_contrato: Optional[float] = None
    valor_anticipo_recibido: Optional[float] = None
    valor_facturado: Optional[float] = None
    retenido: Optional[float] = None
    amortizacion_anticipo: Optional[float] = None
    valor_total_ingreso: Optional[float] = None
    valor_descuentos: Optional[float] = None
    valor_pagado: Optional[float] = None
    valor_por_amortizar: Optional[float] = None
    costos_materiales: Optional[float] = None
    costos_mano_obra: Optional[float] = None
    costos_administrativos: Optional[float] = None
    costos_ejecutados_total: Optional[float] = None
    utilidad_actual: Optional[float] = None
    utilidad_proyectada_fc: Optional[float] = None
    necesidades_apoyo: Optional[str] = None
    decisiones_gerencia: Optional[str] = None
    observaciones_cliente: Optional[str] = None
    identificacion_riesgos: Optional[str] = None
    lecciones_aprendidas: Optional[str] = None
    recomendaciones: Optional[str] = None
    
    # Nuevos campos Resumen Contrato
    oferente: Optional[str] = None
    nit_contratista: Optional[str] = None
    ciudad_contratista: Optional[str] = None
    representante_legal: Optional[str] = None
    nit_cliente: Optional[str] = None
    ciudad_cliente: Optional[str] = None
    capacidad: Optional[str] = None
    forma_pago: Optional[str] = None

    class Config:
        from_attributes = True


def _model_to_dict(m: ProjectTrackingModel) -> dict:
    """Convierte ORM a diccionario compatible con el frontend TypeScript."""
    return {
        "id": m.id,
        "project_id": m.project_id,
        "sheet_name": m.sheet_name,
        "group": m.group,
        "fecha_informe": m.fecha_informe,
        "nombre_proyecto": m.nombre_proyecto,
        "nombre_contrato": m.nombre_contrato,
        "codigo_proyecto": m.codigo_proyecto,
        "cliente": m.cliente,
        "gerente_proyecto_cliente": m.gerente_proyecto_cliente,
        "administrador_contrato_cliente": m.administrador_contrato_cliente,
        "interventor": m.interventor,
        "director_proyectos": m.director_proyectos,
        "ingeniero_residente": m.ingeniero_residente,
        "supervisor": m.supervisor,
        "encargado": m.encargado,
        "tipo_contrato": m.tipo_contrato,
        "requiere_auxilios": m.requiere_auxilios,
        "polizas_requeridas": m.polizas_requeridas,
        "multas_penalidades": m.multas_penalidades,
        "alcance": m.alcance,
        "localizacion": m.localizacion,
        "fecha_inicio": m.fecha_inicio,
        "fecha_finalizacion_contractual": m.fecha_finalizacion_contractual,
        "valor_original_contrato": m.valor_original_contrato,
        "porcentaje_anticipo": m.porcentaje_anticipo,
        "retencion_garantia": m.retencion_garantia,
        "utilidad_proyectada": m.utilidad_proyectada,
        "fecha_terminacion_estimada": m.fecha_terminacion_estimada,
        "avance_programado": m.avance_programado,
        "avance_real": m.avance_real,
        "modificacion_alcance": m.modificacion_alcance,
        "ordenes_compra": m.ordenes_compra,
        "alcance_ordenes": m.alcance_ordenes,
        "tiempo_ordenes": m.tiempo_ordenes,
        "valor_ordenes": m.valor_ordenes,
        "estado_facturacion_ordenes": m.estado_facturacion_ordenes,
        "desviaciones_detectadas": m.desviaciones_detectadas,
        "justificacion_desviaciones": m.justificacion_desviaciones,
        "valor_otros_adiciones": m.valor_otros_adiciones,
        "valor_actual_contrato": m.valor_actual_contrato,
        "valor_anticipo_recibido": m.valor_anticipo_recibido,
        "valor_facturado": m.valor_facturado,
        "retenido": m.retenido,
        "amortizacion_anticipo": m.amortizacion_anticipo,
        "valor_total_ingreso": m.valor_total_ingreso,
        "valor_descuentos": m.valor_descuentos,
        "valor_pagado": m.valor_pagado,
        "valor_por_amortizar": m.valor_por_amortizar,
        "costos_materiales": m.costos_materiales,
        "costos_mano_obra": m.costos_mano_obra,
        "costos_administrativos": m.costos_administrativos,
        "costos_ejecutados_total": m.costos_ejecutados_total,
        "utilidad_actual": m.utilidad_actual,
        "utilidad_proyectada_fc": m.utilidad_proyectada_fc,
        "necesidades_apoyo": m.necesidades_apoyo,
        "decisiones_gerencia": m.decisiones_gerencia,
        "observaciones_cliente": m.observaciones_cliente,
        "identificacion_riesgos": m.identificacion_riesgos,
        "lecciones_aprendidas": m.lecciones_aprendidas,
        "recomendaciones": m.recomendaciones,
        "oferente": m.oferente,
        "nit_contratista": m.nit_contratista,
        "ciudad_contratista": m.ciudad_contratista,
        "representante_legal": m.representante_legal,
        "nit_cliente": m.nit_cliente,
        "ciudad_cliente": m.ciudad_cliente,
        "capacidad": m.capacidad,
        "forma_pago": m.forma_pago,
    }


# ── Endpoints ────────────────────────────────────────────────────

@router.get("")
async def list_projects(db: AsyncSession = Depends(get_db_session)):
    """Devuelve todos los proyectos de seguimiento (PCM + PCS)."""
    stmt = (
        select(ProjectTrackingModel, ProjectModel.status)
        .outerjoin(ProjectModel, ProjectTrackingModel.project_id == ProjectModel.id)
        .order_by(ProjectTrackingModel.id)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    out = []
    for tracking_model, status in rows:
        d = _model_to_dict(tracking_model)
        d['status'] = status or 'planning'
        out.append(d)
    return out


@router.get("/history/weeks")
async def list_history_weeks(tracking_id: Optional[str] = None, db: AsyncSession = Depends(get_db_session)):
    query = select(func.coalesce(ProjectTrackingHistoryModel.fecha_informe, ProjectTrackingHistoryModel.semana)).where(
        func.coalesce(ProjectTrackingHistoryModel.fecha_informe, ProjectTrackingHistoryModel.semana).isnot(None),
        func.coalesce(ProjectTrackingHistoryModel.fecha_informe, ProjectTrackingHistoryModel.semana) != ""
    ).distinct()
    if tracking_id:
        query = query.where(ProjectTrackingHistoryModel.tracking_id == tracking_id)
    query = query.order_by(func.coalesce(ProjectTrackingHistoryModel.fecha_informe, ProjectTrackingHistoryModel.semana).desc())
    result = await db.execute(query)
    return {"status": "success", "data": result.scalars().all()}

@router.get("/history/{semana}")
async def list_projects_history(semana: str, db: AsyncSession = Depends(get_db_session)):
    """Devuelve el snapshot de todos los proyectos para una semana o fecha de corte dada."""
    # Filtramos por fecha_informe si parece una fecha (formato YYYY-MM-DD), de lo contrario por semana
    if "-" in semana and len(semana) >= 8:
        stmt = select(ProjectTrackingHistoryModel).where(ProjectTrackingHistoryModel.fecha_informe == semana)
    else:
        stmt = select(ProjectTrackingHistoryModel).where(ProjectTrackingHistoryModel.semana == semana)
        
    result = await db.execute(stmt)
    records = result.scalars().all()
    out = []
    for r in records:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        d['id'] = d['tracking_id']  # Mapear tracking_id al campo 'id' para el frontend
        if 'tracking_id' in d: del d['tracking_id']
        if 'history_id' in d: del d['history_id']
        if 'group_name' in d:
            d['group'] = d.pop('group_name')
        # Formato de fechas para el frontend (str a float donde aplique, etc)
        # SQLAlchemy ya nos dio los valores nativos, si habian floats los mandamos
        out.append(d)
    return {"status": "success", "data": out}

@router.get("/{tracking_id}")
async def get_project(tracking_id: str, db: AsyncSession = Depends(get_db_session)):
    """Devuelve un proyecto de seguimiento por ID del registro (PK)."""
    result = await db.execute(
        select(ProjectTrackingModel).where(ProjectTrackingModel.id == tracking_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Registro de seguimiento no encontrado")
    return _model_to_dict(row)


@router.post("")
async def create_project(
    data: ProjectTrackingSchema,
    db: AsyncSession = Depends(get_db_session),
):
    """Crea un nuevo proyecto de seguimiento."""
    existing = await db.execute(
        select(ProjectTrackingModel).where(ProjectTrackingModel.id == data.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un proyecto con ese ID")

    row = ProjectTrackingModel(**data.model_dump())
    db.add(row)

    # ── Sincronización con tabla 'projects' ──────────────────────
    # Creamos el registro técnico para que la cabecera del proyecto funcione
    try:
        from datetime import date
        def parse_date(d_str: Optional[str]) -> Optional[date]:
            if not d_str or d_str == "—": return None
            try:
                # Intentar formato YYYY-MM-DD
                return datetime.strptime(d_str, "%Y-%m-%d").date()
            except:
                return None

        # Verificar si ya existe en projects
        p_stmt = select(ProjectModel).where(ProjectModel.code == data.codigo_proyecto)
        p_res = await db.execute(p_stmt)
        if not p_res.scalar_one_or_none():
            # Determinar company_id y currency según el grupo
            comp_id = 1 # PCM por defecto
            curr = "COP"
            if data.group == "PCS":
                comp_id = 2
                curr = "COP"
            elif data.group == "CARSAN":
                comp_id = 3
                curr = "USD"

            new_p = ProjectModel(
                id=data.id, # Usamos el mismo ID para simplificar navegación
                name=data.nombre_proyecto or data.sheet_name or "Nuevo Proyecto",
                code=data.codigo_proyecto or data.id,
                description=data.alcance or "",
                client_name=data.cliente or "Sin Cliente",
                company_id=comp_id,
                currency=curr,
                start_date=parse_date(data.fecha_inicio) or date.today(),
                estimated_end_date=parse_date(data.fecha_finalizacion_contractual) or date.today(),
                total_budget=data.valor_original_contrato or 0,
                location=data.localizacion,
                project_manager=data.director_proyectos,
                status="planning"
            )
            db.add(new_p)
    except Exception as e:
        print(f"Error sincronizando con tabla projects: {e}")

    await db.flush()
    result = _model_to_dict(row)
    await broadcast_preference_update("project_tracking_updated", result)
    return result


async def _perform_update(
    record_id: str,
    data: dict,
    db: AsyncSession,
    current_user: Any,
    is_general_data: bool = False
) -> dict:
    """Lógica compartida para actualizar proyectos de seguimiento."""
    result = await db.execute(
        select(ProjectTrackingModel).where(ProjectTrackingModel.id == record_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Registro de seguimiento no encontrado")

    # Campos que se pueden actualizar en cada sección
    GENERAL_FIELDS = {
        "nombre_proyecto", "nombre_contrato", "codigo_proyecto",
        "cliente", "gerente_proyecto_cliente", "administrador_contrato_cliente",
        "interventor", "director_proyectos", "ingeniero_residente",
        "supervisor", "encargado", "tipo_contrato", "requiere_auxilios",
        "polizas_requeridas", "multas_penalidades", "alcance", "localizacion",
        "fecha_inicio", "fecha_finalizacion_contractual",
        "valor_original_contrato", "porcentaje_anticipo", "retencion_garantia",
        "utilidad_proyectada", "grupo", "sheet_name", "fecha_informe",
        "oferente", "nit_contratista", "ciudad_contratista", "representante_legal",
        "nit_cliente", "ciudad_cliente", "capacidad", "forma_pago"
    }
    
    TRACKING_FIELDS = {
        "fecha_terminacion_estimada", "avance_programado", "avance_real",
        "modificacion_alcance", "ordenes_compra", "alcance_ordenes",
        "tiempo_ordenes", "valor_ordenes", "estado_facturacion_ordenes",
        "desviaciones_detectadas", "justificacion_desviaciones",
        "valor_otros_adiciones", "valor_actual_contrato",
        "valor_anticipo_recibido", "valor_facturado", "retenido",
        "amortizacion_anticipo", "valor_total_ingreso", "valor_descuentos",
        "valor_pagado", "valor_por_amortizar", "costos_materiales",
        "costos_mano_obra", "costos_administrativos", "costos_ejecutados_total",
        "utilidad_actual", "utilidad_proyectada_fc", "necesidades_apoyo",
        "decisiones_gerencia", "observaciones_cliente",
        "identificacion_riesgos", "lecciones_aprendidas", "recomendaciones",
        "fecha_informe"
    }

    allowed_fields = GENERAL_FIELDS if is_general_data else TRACKING_FIELDS
    
    # Seguridad adicional: solo admin/gerente para datos generales
    if is_general_data and current_user.role not in ["administrador", "gerente"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar Datos Generales")

    before_state = _model_to_dict(row)
    changes_made = {}

    for field, value in data.items():
        if field in allowed_fields:
            old_value = getattr(row, field, None)
            if old_value != value:
                changes_made[field] = {"old": old_value, "new": value}
                setattr(row, field, value)

    if not changes_made:
        return {
            "success": True,
            "message": "No se detectaron cambios",
            "data": _model_to_dict(row)
        }

    row.updated_at = datetime.now(timezone.utc)
    await db.flush()

    # Sincronización con tabla 'projects'
    if is_general_data and ("valor_original_contrato" in changes_made or "nombre_proyecto" in changes_made):
        try:
            # Aquí sí buscamos por project_id (FK) porque vamos a la tabla maestra 'projects'
            p_stmt = select(ProjectModel).where(ProjectModel.id == row.project_id)
            p_res = await db.execute(p_stmt)
            p_row = p_res.scalar_one_or_none()
            if p_row:
                if "valor_original_contrato" in changes_made:
                    p_row.total_budget = row.valor_original_contrato or 0
                if "nombre_proyecto" in changes_made:
                    p_row.name = row.nombre_proyecto or "Proyecto sin nombre"
                await db.flush()
        except Exception as e:
            print(f"⚠️ Error sincronización: {e}")

    # Auditoría: un registro por cada campo modificado
    try:
        base_action = 'update_general_data' if is_general_data else 'update_tracking'
        for field, values in changes_made.items():
            activity = ActivityLogModel(
                user_id=str(current_user.id),
                user_name=current_user.full_name or current_user.email,
                user_role=current_user.role,
                module="project_tracking",
                page=f"projects/{record_id}",
                action=f"{base_action}: {field}",
                field_name=field,
                before_state=json.dumps(values["old"]) if values["old"] is not None else None,
                after_state=json.dumps(values["new"]) if values["new"] is not None else None,
                target_link=f"/projects/{record_id}",
                project_id=row.project_id,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(activity)
        await db.flush()
    except Exception as e:
        db.rollback() # Limpiar estado de la sesión si falla la auditoría
        print(f"Error auditoria: {e}")

    updated_data = _model_to_dict(row)
    await broadcast_preference_update("project_tracking_updated", {"id": record_id})
    
    return {
        "success": True,
        "message": "Datos actualizados correctamente",
        "data": updated_data
    }


@router.patch("/{tracking_id}/general-data")
async def update_general_data(
    tracking_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    _ = Depends(require_role("administrador", "gerente")),
):
    """Actualiza datos básicos del contrato (Solo Admin/Gerente)."""
    return await _perform_update(tracking_id, data, db, current_user, is_general_data=True)


@router.patch("/{tracking_id}/tracking")
async def update_tracking_data(
    tracking_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    _ = Depends(require_role("administrador", "gerente", "director_proyectos", "controller", "ingeniero_residente")),
):
    """Actualiza seguimiento de obra (Admin, Gerente, Director, Residente)."""
    return await _perform_update(tracking_id, data, db, current_user, is_general_data=False)




@router.put("/{tracking_id}")
async def legacy_update_project(
    tracking_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    _ = Depends(require_role("administrador", "gerente", "director_proyectos", "controller", "ingeniero_residente")),
):
    """Mantenemos el PUT para compatibilidad, pero usa la nueva lógica."""
    # Determinamos si es general o tracking basado en los campos enviados (heurística simple)
    is_general = any(k in ["nombre_proyecto", "cliente", "codigo_proyecto"] for k in data.keys())
    return await _perform_update(tracking_id, data, db, current_user, is_general_data=is_general)


@router.delete("/{tracking_id}")
async def delete_project(tracking_id: str, db: AsyncSession = Depends(get_db_session)):
    """Elimina un proyecto de seguimiento por ID de registro."""
    result = await db.execute(
        select(ProjectTrackingModel).where(ProjectTrackingModel.id == tracking_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Registro de seguimiento no encontrado")
    await db.delete(row)
    await db.commit()
    return {"success": True, "message": "Registro eliminado", "id": tracking_id}


@router.post("/bulk-upsert")
async def bulk_upsert(
    projects: list[dict],
    db: AsyncSession = Depends(get_db_session),
):
    """Inserta o actualiza una lista de proyectos en bloque."""
    upserted = 0
    for p in projects:
        pid = p.get("id")
        if not pid: continue
        result = await db.execute(
            select(ProjectTrackingModel).where(ProjectTrackingModel.id == pid)
        )
        row = result.scalar_one_or_none()
        if row:
            for k, v in p.items():
                if hasattr(row, k) and k != "id":
                    setattr(row, k, v)
        else:
            row = ProjectTrackingModel(**{k: v for k, v in p.items() if hasattr(ProjectTrackingModel, k)})
            db.add(row)
        upserted += 1

    await db.flush()
    return {"success": True, "message": f"{upserted} proyectos procesados", "upserted": upserted}
