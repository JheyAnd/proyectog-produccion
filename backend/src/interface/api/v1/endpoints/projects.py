"""API Endpoints: Projects CRUD."""
import json
import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.project_dto import (
    ProjectCreate,
    ProjectResponse,
    ProjectSummaryResponse,
    ProjectUpdate,
    ProjectRealCostsUpdate,
)
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.project_model import ProjectModel
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.interface.api.v1.dependencies.auth import get_current_user, require_role

router = APIRouter()


def user_has_full_access(user) -> bool:
    allowed = (user.allowed_projects or "").strip().replace('"', '').replace("'", "")
    return (
        user.role in ["administrador", "gerente"]
        or allowed == "ALL"
    )

@router.get("", response_model=List[ProjectSummaryResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 50,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List all projects with summary information."""
    from sqlalchemy import text
    
    # 1. Determine allowed project IDs for RLS
    allowed_filter = ""
    params = {"skip": skip, "limit": limit}
    if not user_has_full_access(current_user):
        try:
            allowed_ids = json.loads(current_user.allowed_projects or "[]")
        except:
            allowed_ids = []
        if allowed_ids:
            allowed_filter = "WHERE p.id IN :allowed_ids"
            params["allowed_ids"] = tuple(allowed_ids)
        else:
            allowed_filter = "WHERE 1=0"

    # 2. Execute query for projects only
    sql = text(f"""
        SELECT p.id, p.name, p.code, p.client_name, p.status, p.total_budget,
               p.start_date, p.estimated_end_date, p.description, p.company_id
        FROM projects p
        {allowed_filter}
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :skip
    """)
    result = await db.execute(sql, params)
    rows = result.fetchall()

    # Convert rows to dicts and fetch latest corte
    projects_list = []
    corte_sql = text("""
        SELECT semana, avance_planeado, avance_ejecutado
        FROM cronograma_cortes
        WHERE project_id = :pid
          AND avance_ejecutado IS NOT NULL
        ORDER BY semana DESC
        LIMIT 1
    """)
    
    for r in rows:
        c_res = await db.execute(corte_sql, {"pid": r.id})
        c = c_res.fetchone()
        
        plan = None
        ejec = None
        spi = None
        
        if c:
            try:
                plan = float(c.avance_planeado) if c.avance_planeado is not None and str(c.avance_planeado).strip() != "" else None
            except (ValueError, TypeError):
                plan = None
                
            try:
                ejec = float(c.avance_ejecutado) if c.avance_ejecutado is not None and str(c.avance_ejecutado).strip() != "" else None
            except (ValueError, TypeError):
                ejec = None
                
            if plan and plan > 0 and ejec is not None:
                try:
                    spi = round(ejec / plan, 4)
                except Exception:
                    spi = None

        projects_list.append({
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "client_name": r.client_name,
            "status": r.status,
            "total_budget": r.total_budget,
            "start_date": r.start_date,
            "estimated_end_date": r.estimated_end_date,
            "description": r.description or "",
            "company_id": r.company_id,
            "semana_actual": c.semana if c else None,
            "avance_planificado": plan,
            "avance_real": ejec,
            "spi": spi,
        })
    return projects_list



@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new project."""
    # Determinar company_id y currency según la regla de negocio inamovible
    code_upper = (data.code or "").upper().replace(" ", "")
    if code_upper.startswith("CAR"):
        comp_id = 3
        curr = "USD"
    elif code_upper.startswith("PCS"):
        comp_id = 2
        curr = "COP"
    else:
        comp_id = 1
        curr = "COP"

    project = ProjectModel(
        name=data.name,
        code=data.code,
        description=data.description,
        client_name=data.client_name,
        start_date=data.start_date,
        estimated_end_date=data.estimated_end_date,
        total_budget=data.total_budget,
        currency=curr,
        company_id=comp_id,
        location=data.location,
        project_manager=data.project_manager,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    
    # 2. Insertar en tabla 'project_tracking' (seguimiento)
    from src.infrastructure.database.models.project_tracking_model import ProjectTrackingModel
    tracking = ProjectTrackingModel(
        id=project.id,
        project_id=project.id,
        nombre_proyecto=project.name,
        codigo_proyecto=project.code,
        cliente=project.client_name,
        director_proyectos=project.project_manager,
        fecha_inicio=str(project.start_date) if project.start_date else None,
        fecha_terminacion_estimada=str(project.estimated_end_date) if project.estimated_end_date else None,
        valor_original_contrato=float(project.total_budget) if project.total_budget else 0.0,
    )
    db.add(tracking)
    await db.flush()
    
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get project details by ID."""
    from sqlalchemy import select
    stmt = select(ProjectModel).where(ProjectModel.id == project_id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    """Update an existing project."""
    from sqlalchemy import select
    stmt = select(ProjectModel).where(ProjectModel.id == project_id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.flush()
    await db.refresh(project)
    return project


PATIO_SUR_ID = 'patio-sur-oe1035'
SUPER_ADMIN_EMAIL = 'rosmel.pernia@pcmejia.com.co'

# Orden estricto de cascade delete — hijas primero
TABLAS_CASCADE = [
    'activity_logs', 'alerts', 'audit_logs', 'budget_items',
    'business_case_aiu', 'business_case_audit_log', 'business_case_chapters',
    'business_case_indirect_costs', 'business_case_procurement_items',
    'business_case_procurement', 'business_case_scenarios', 'business_case',
    'cash_flow_audit_log', 'cash_flow_cell_details', 'cash_flow_entries',
    'cash_flow_import_log', 'configuration_entities', 'documents',
    'egreso_valores', 'egreso_categorias', 'entregables', 'invoices',
    'project_documents_status', 'project_pendings', 'project_tracking',
    'transactions', 'user_project_context', 'wbs_items'
]


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Elimina lógicamente un proyecto cambiando su estado a 'eliminado'.
    Reglas:
    1. Administradores y gerentes.
    2. Patio Sur protegido.
    """
    from sqlalchemy import text
    from datetime import date
    import uuid
    
    # 1. Verificar que el proyecto existe
    stmt = text("SELECT id, name FROM projects WHERE id = :pid")
    result = await db.execute(stmt, {"pid": project_id})
    proyecto = result.fetchone()

    if not proyecto:
        # Intentar buscar en 'project_tracking'
        t_stmt = text("SELECT id, nombre_proyecto, codigo_proyecto, `group`, alcance, cliente, fecha_inicio, fecha_finalizacion_contractual, valor_original_contrato, sheet_name FROM project_tracking WHERE id = :pid")
        t_res = await db.execute(t_stmt, {"pid": project_id})
        tracking = t_res.fetchone()
        
        if not tracking:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
            
        # Crear el proyecto en la tabla 'projects' sobre la marcha (on-the-fly)
        comp_id = 1
        curr = "COP"
        if tracking.group == "PCS":
            comp_id = 2
        elif tracking.group == "CARSAN":
            comp_id = 3
            curr = "USD"
            
        # Insertar en projects
        await db.execute(text("""
            INSERT INTO projects (
                id, name, code, description, client_name, 
                company_id, currency, start_date, estimated_end_date, 
                total_budget, status, created_at, updated_at
            ) VALUES (
                :pid, :name, :code, :description, :client_name,
                :comp_id, :curr, :start_date, :estimated_end_date,
                :total_budget, 'eliminado', NOW(), NOW()
            )
        """), {
            "pid": project_id,
            "name": tracking.nombre_proyecto or tracking.sheet_name or "Proyecto sin nombre",
            "code": tracking.codigo_proyecto or project_id,
            "description": tracking.alcance or "",
            "client_name": tracking.cliente or "Sin Cliente",
            "comp_id": comp_id,
            "curr": curr,
            "start_date": tracking.fecha_inicio or date.today().isoformat(),
            "estimated_end_date": tracking.fecha_finalizacion_contractual or date.today().isoformat(),
            "total_budget": tracking.valor_original_contrato or 0
        })
        
        # Vincular en project_tracking
        await db.execute(
            text("UPDATE project_tracking SET project_id = :pid WHERE id = :pid"),
            {"pid": project_id}
        )
        
        # Objeto dummy para auditoría
        class DummyProyecto:
            name = tracking.nombre_proyecto or tracking.sheet_name or "Proyecto sin nombre"
        proyecto = DummyProyecto()
    else:
        # 2. Verificar rol
        if current_user.role not in ['administrador', 'gerente']:
            raise HTTPException(status_code=403, detail="Solo administradores y gerentes pueden eliminar proyectos.")

        # 3. Protección especial Patio Sur
        if project_id == PATIO_SUR_ID:
            if current_user.email != SUPER_ADMIN_EMAIL:
                raise HTTPException(
                    status_code=403, 
                    detail="Patio Sur solo puede ser eliminado por el Super Administrador del sistema."
                )

        # 4. Cambiar estado a 'eliminado'
        await db.execute(
            text("UPDATE projects SET status = 'eliminado' WHERE id = :pid"), 
            {"pid": project_id}
        )

    # 5. Backup en activity_logs
    await db.execute(text("""
        INSERT INTO activity_logs (
            id, user_id, user_name, user_role, module, page, 
            action, project_id, timestamp
        )
        VALUES (
            :id, :user_id, :user_name, :user_role, 'projects', :page,
            :action, :pid, NOW()
        )
    """), {
        "id": str(uuid.uuid4()),
        "user_id": str(current_user.id),
        "user_name": current_user.full_name or current_user.email,
        "user_role": current_user.role,
        "page": f"/projects/{project_id}",
        "action": f"ELIMINACIÓN LÓGICA: {proyecto.name} ({project_id})",
        "pid": project_id
    })
    
    await db.commit()

    return {
        "ok": True,
        "mensaje": f"Proyecto '{proyecto.name}' enviado a la papelera (eliminación lógica)."
    }

@router.post("/{project_id}/restore")
async def restore_project(
    project_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Restaura un proyecto eliminado lógicamente.
    Reglas:
    1. Administradores y gerentes.
    """
    from sqlalchemy import text
    from datetime import date
    import uuid
    
    # 2. Verificar rol
    if current_user.role not in ['administrador', 'gerente']:
        raise HTTPException(status_code=403, detail="Solo administradores y gerentes pueden restaurar proyectos.")

    # 1. Verificar que el proyecto existe
    stmt = text("SELECT id, name FROM projects WHERE id = :pid")
    result = await db.execute(stmt, {"pid": project_id})
    proyecto = result.fetchone()

    if not proyecto:
        # Intentar buscar en 'project_tracking'
        t_stmt = text("SELECT id, nombre_proyecto, codigo_proyecto, `group`, alcance, cliente, fecha_inicio, fecha_finalizacion_contractual, valor_original_contrato, sheet_name FROM project_tracking WHERE id = :pid")
        t_res = await db.execute(t_stmt, {"pid": project_id})
        tracking = t_res.fetchone()
        
        if not tracking:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
            
        # Crear el proyecto en la tabla 'projects' sobre la marcha (on-the-fly)
        comp_id = 1
        curr = "COP"
        if tracking.group == "PCS":
            comp_id = 2
        elif tracking.group == "CARSAN":
            comp_id = 3
            curr = "USD"
            
        # Insertar en projects
        await db.execute(text("""
            INSERT INTO projects (
                id, name, code, description, client_name, 
                company_id, currency, start_date, estimated_end_date, 
                total_budget, status, created_at, updated_at
            ) VALUES (
                :pid, :name, :code, :description, :client_name,
                :comp_id, :curr, :start_date, :estimated_end_date,
                :total_budget, 'planning', NOW(), NOW()
            )
        """), {
            "pid": project_id,
            "name": tracking.nombre_proyecto or tracking.sheet_name or "Proyecto sin nombre",
            "code": tracking.codigo_proyecto or project_id,
            "description": tracking.alcance or "",
            "client_name": tracking.cliente or "Sin Cliente",
            "comp_id": comp_id,
            "curr": curr,
            "start_date": tracking.fecha_inicio or date.today().isoformat(),
            "estimated_end_date": tracking.fecha_finalizacion_contractual or date.today().isoformat(),
            "total_budget": tracking.valor_original_contrato or 0
        })
        
        # Vincular en project_tracking
        await db.execute(
            text("UPDATE project_tracking SET project_id = :pid WHERE id = :pid"),
            {"pid": project_id}
        )
        
        # Objeto dummy para auditoría
        class DummyProyecto:
            name = tracking.nombre_proyecto or tracking.sheet_name or "Proyecto sin nombre"
        proyecto = DummyProyecto()
    else:
        # Cambiar estado a 'planning' (o el predeterminado)
        await db.execute(
            text("UPDATE projects SET status = 'planning' WHERE id = :pid"), 
            {"pid": project_id}
        )

    # 4. Registro en activity_logs
    await db.execute(text("""
        INSERT INTO activity_logs (
            id, user_id, user_name, user_role, module, page, 
            action, project_id, timestamp
        )
        VALUES (
            :id, :user_id, :user_name, :user_role, 'projects', :page,
            :action, :pid, NOW()
        )
    """), {
        "id": str(uuid.uuid4()),
        "user_id": str(current_user.id),
        "user_name": current_user.full_name or current_user.email,
        "user_role": current_user.role,
        "page": f"/projects/{project_id}",
        "action": f"RESTAURACIÓN: {proyecto.name} ({project_id})",
        "pid": project_id
    })
    
    await db.commit()

    return {
        "ok": True,
        "mensaje": f"Proyecto '{proyecto.name}' restaurado exitosamente."
    }

@router.delete("/{project_id}/permanent")
async def permanent_delete_project(
    project_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Elimina permanentemente un proyecto y todos sus registros relacionados.
    Reglas:
    1. Solo administradores.
    2. Patio Sur solo por Super Admin.
    3. Backup en logs obligatorio antes de eliminar.
    """
    from sqlalchemy import text
    
    # 1. Verificar que el proyecto existe en projects
    stmt = text("SELECT id, name FROM projects WHERE id = :pid")
    result = await db.execute(stmt, {"pid": project_id})
    proyecto = result.fetchone()
    
    # Si no está en projects, buscar en project_tracking
    if not proyecto:
        stmt = text("SELECT id, nombre_proyecto as name FROM project_tracking WHERE id = :pid OR project_id = :pid")
        result = await db.execute(stmt, {"pid": project_id})
        proyecto = result.fetchone()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado en ninguna tabla.")

    # 2. Verificar rol (solo administrador)
    if current_user.role != 'administrador':
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar proyectos permanentemente.")

    # 3. Protección especial Patio Sur
    if project_id == PATIO_SUR_ID:
        if current_user.email != SUPER_ADMIN_EMAIL:
            raise HTTPException(
                status_code=403, 
                detail="Patio Sur solo puede ser eliminado por el Super Administrador del sistema."
            )

    # 4. Backup en activity_logs ANTES del DELETE (obligatorio)
    try:
        await db.execute(text("""
            INSERT INTO activity_logs (
                id, user_id, user_name, user_role, module, page, 
                action, project_id, timestamp
            )
            VALUES (
                :id, :user_id, :user_name, :user_role, 'projects', :page,
                :action, :pid, NOW()
            )
        """), {
            "id": str(uuid.uuid4()),
            "user_id": str(current_user.id),
            "user_name": current_user.full_name or current_user.email,
            "user_role": current_user.role,
            "page": f"/projects/{project_id}",
            "action": f"ELIMINACIÓN PERMANENTE: {proyecto.name} ({project_id})",
            "pid": None  # Set to None to ensure the log survives the project deletion cascade
        })
        await db.flush()  # asegurar que el log se escribe antes de continuar
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar auditoría. Eliminación cancelada: {str(e)}")

    # 5. Cascade delete — 28 tablas en orden
    for tabla in TABLAS_CASCADE:
        try:
            if tabla == 'project_tracking':
                await db.execute(
                    text(f"DELETE FROM {tabla} WHERE id = :pid OR project_id = :pid"),
                    {"pid": project_id}
                )
            elif tabla == 'activity_logs':
                await db.execute(
                    text(f"DELETE FROM {tabla} WHERE project_id = :pid AND action NOT LIKE 'ELIMINACIÓN PERMANENTE:%'"),
                    {"pid": project_id}
                )
            else:
                await db.execute(
                    text(f"DELETE FROM {tabla} WHERE project_id = :pid"),
                    {"pid": project_id}
                )
        except Exception:
            pass

    # 6. Eliminar el proyecto (última línea)
    await db.execute(text("DELETE FROM projects WHERE id = :pid"), {"pid": project_id})
    await db.commit()

    return {
        "ok": True,
        "mensaje": f"Proyecto '{proyecto.name}' eliminado permanentemente."
    }


@router.patch("/{project_id}/costos-reales", response_model=ProjectResponse)
async def update_project_real_costs(
    project_id: str,
    data: ProjectRealCostsUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    _ = Depends(require_role("administrador", "gerente")),
):
    """
    Actualiza manualmente el costo facturado y pagado de un proyecto.
    Solo accesible para administradores y gerentes.
    """
    from sqlalchemy import select
    stmt = select(ProjectModel).where(ProjectModel.id == project_id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    # Guardar estado anterior para auditoría
    before_facturado = float(project.costo_facturado)
    before_pagado = float(project.costo_pagado)

    # Actualizar campos
    project.costo_facturado = data.costo_facturado
    project.costo_pagado = data.costo_pagado
    project.updated_at = datetime.now(timezone.utc)

    # Registrar en logs de actividad
    try:
        changes = []
        if before_facturado != float(data.costo_facturado):
            changes.append({
                "field": "costo_facturado",
                "old": before_facturado,
                "new": float(data.costo_facturado)
            })
        if before_pagado != float(data.costo_pagado):
            changes.append({
                "field": "costo_pagado",
                "old": before_pagado,
                "new": float(data.costo_pagado)
            })

        for change in changes:
            log = ActivityLogModel(
                user_id=str(current_user.id),
                user_name=current_user.full_name or current_user.email,
                user_role=current_user.role,
                module="projects",
                page=f"/projects/{project_id}",
                action=f"Actualizó {change['field']}",
                field_name=change['field'],
                before_state=json.dumps(change['old']),
                after_state=json.dumps(change['new']),
                target_link=f"/projects/{project_id}/cashflow",
                project_id=project_id,
            )
            db.add(log)
    except Exception as e:
        print(f"Error registrando actividad: {e}")

    await db.flush()
    await db.refresh(project)
    return project


@router.get("/{project_id}/cronograma/resumen")
async def get_resumen_cronograma(project_id: str, db: AsyncSession = Depends(get_db_session)):
    from sqlalchemy import text
    # Último corte con avance real registrado
    result = await db.execute(text("""
        SELECT
            c.semana,
            c.fecha_corte,
            c.avance_planeado,
            c.avance_ejecutado,
            ROUND(c.avance_ejecutado / c.avance_planeado, 4) as spi,
            ROUND(c.avance_ejecutado - c.avance_planeado, 2) as desviacion
        FROM cronograma_cortes c
        WHERE c.project_id = :pid
          AND c.avance_ejecutado IS NOT NULL
        ORDER BY c.semana DESC
        LIMIT 1
    """), {"pid": project_id})

    row = result.fetchone()
    if not row:
        return {"semana": None, "spi": 0, "avance_planeado": 0,
                "avance_ejecutado": 0, "desviacion": 0}

    return {
        "semana":           row.semana,
        "fecha_corte":      str(row.fecha_corte),
        "avance_planeado":  float(row.avance_planeado),
        "avance_ejecutado": float(row.avance_ejecutado),
        "spi":              float(row.spi),
        "desviacion":       float(row.desviacion),
    }

