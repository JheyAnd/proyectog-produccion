from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.cronograma_dto import (
    CronogramaCorteCreate,
    CronogramaCorteResponse,
    CronogramaCorteUpdate
)
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.cronograma_model import CronogramaCorteModel
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.models.cronograma_actividad_model import CronogramaActividadModel
from src.infrastructure.database.models.cronograma_proyectado_model import CronogramaProyectadoModel
from src.interface.api.v1.dependencies.auth import get_current_user
from src.application.services.cronograma_parser import parse_cronograma_excel
import tempfile
import os
from datetime import datetime, timezone

router = APIRouter()

@router.get("/{project_id}/cortes", response_model=List[CronogramaCorteResponse])
async def list_cortes(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """List all progress cuts for a project."""
    stmt = (
        select(CronogramaCorteModel)
        .where(CronogramaCorteModel.project_id == project_id)
        .order_by(CronogramaCorteModel.semana)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

PROYECTOS_PROTEGIDOS = ['patio-sur-oe1035', 'lyra-carsan-oe2000']

@router.post("/{project_id}/import")
async def import_cronograma(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: UserModel = Depends(get_current_user)
):
    if project_id in PROYECTOS_PROTEGIDOS:
        raise HTTPException(403, f"Proyecto {project_id} está protegido.")

    # Guardar archivo temporal
    fd, tmp = tempfile.mkstemp(suffix=".xlsx", prefix=f"cronograma_{project_id}_")
    os.close(fd)
    
    try:
        with open(tmp, "wb") as f:
            f.write(await file.read())

        # Parsear
        resultado = parse_cronograma_excel(tmp)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

    # Limpiar datos anteriores
    await db.execute(
        text("DELETE FROM cronograma_actividades WHERE project_id = :pid"),
        {"pid": project_id}
    )
    await db.execute(
        text("DELETE FROM cronograma_proyectado WHERE project_id = :pid"),
        {"pid": project_id}
    )

    import uuid
    # Insertar actividades
    for act in resultado["actividades"]:
        await db.execute(text("""
            INSERT INTO cronograma_actividades
            (id, project_id, wbs_code, nombre_tarea, peso,
             fecha_inicio, fecha_fin, duracion_dias, created_at)
            VALUES (:id, :pid, :wbs, :nom, :peso, :fi, :ff, :dur, NOW())
        """), {
            "id": str(uuid.uuid4()), "pid": project_id, "wbs": act["wbs_code"],
            "nom": act["nombre"], "peso": act["peso"],
            "fi": act["fecha_inicio"], "ff": act["fecha_fin"],
            "dur": act["duracion"],
        })

    # Insertar proyectado
    for p in resultado["proyectado"]:
        await db.execute(text("""
            INSERT INTO cronograma_proyectado
            (id, project_id, semana, fecha_semana, avance_planeado, created_at)
            VALUES (:id, :pid, :s, :f, :ap, NOW())
        """), {
            "id": str(uuid.uuid4()), "pid": project_id, "s": p["semana"],
            "f": p["fecha_semana"], "ap": p["avance_planeado"],
        })

    await db.commit()

    return {
        "ok": True,
        "actividades_cargadas": len(resultado["actividades"]),
        "semanas_proyectadas":  len(resultado["proyectado"]),
        "total_peso":           resultado["total_peso"],
    }

@router.get("/{project_id}/proyectado")
async def get_proyectado(
    project_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    stmt = (
        select(CronogramaProyectadoModel)
        .where(CronogramaProyectadoModel.project_id == project_id)
        .order_by(CronogramaProyectadoModel.semana)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return items

@router.get("/{project_id}/actividades")
async def get_actividades(
    project_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    # Lee SIEMPRE del proyecto actual — nunca de Patio Sur
    result = await db.execute(text("""
        SELECT wbs_code, nombre_tarea,
               ROUND(peso * 100, 2) as peso_pct,
               fecha_inicio, fecha_fin, duracion_dias
        FROM cronograma_actividades
        WHERE project_id = :pid
        ORDER BY wbs_code ASC
    """), {"pid": project_id})

    actividades = result.fetchall()

    return [{
        "cod":          a.wbs_code,
        "actividad":    a.nombre_tarea,
        "peso":         float(a.peso_pct),
        "fecha_inicio": str(a.fecha_inicio),
        "fecha_fin":    str(a.fecha_fin),
        "duracion":     a.duracion_dias,
        "avance_real":  0,
        "estado":       "Pendiente",
    } for a in actividades]

@router.post("/{project_id}/cortes", response_model=CronogramaCorteResponse, status_code=status.HTTP_201_CREATED)
async def create_corte(
    project_id: str,
    data: CronogramaCorteCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Create a new progress cut."""
    # Verificar que no existe ya
    stmt = select(CronogramaCorteModel).where(
        CronogramaCorteModel.project_id == project_id,
        CronogramaCorteModel.semana == data.semana
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"La semana {data.semana} ya tiene un corte registrado para este proyecto."
        )

    # ================================================================
    # LEER avance_ejecutado de la semana anterior con SQL NATIVO
    # Evita problemas de tipo Decimal->float con el ORM de SQLAlchemy
    # ================================================================
    sql_anterior = text("""
        SELECT avance_ejecutado, detalle_json
        FROM cronograma_cortes
        WHERE project_id = :pid
        ORDER BY semana DESC
        LIMIT 1
    """)
    result_raw = await db.execute(sql_anterior, {"pid": project_id})
    row = result_raw.fetchone()

    if row and row[0] is not None:
        avance_ejecutado = float(row[0])   # conversion explicita garantizada
        detalle_json = row[1]
    else:
        avance_ejecutado = float(data.avance_ejecutado) \
            if data.avance_ejecutado is not None else 0.0
        detalle_json = data.detalle_json

    corte = CronogramaCorteModel(
        project_id=project_id,
        semana=data.semana,
        fecha_corte=data.fecha_corte,
        avance_planeado=data.avance_planeado,
        avance_ejecutado=avance_ejecutado,
        origen=data.origen,
        detalle_json=detalle_json,
    )
    db.add(corte)

    # Audit log
    db.add(ActivityLogModel(
        user_id=str(current_user.id),
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role,
        module="cronograma",
        page=f"projects/{project_id}/cronograma",
        action=f"create_corte: Semana {data.semana}",
        after_state=f"Planeado: {data.avance_planeado}%, Real: {avance_ejecutado}%",
        project_id=project_id,
        timestamp=datetime.now(timezone.utc),
    ))

    await db.flush()
    await db.refresh(corte)
    return corte

@router.patch("/cortes/{corte_id}", response_model=CronogramaCorteResponse)
async def update_corte(
    corte_id: int,
    data: CronogramaCorteUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Update an existing progress cut."""
    stmt = select(CronogramaCorteModel).where(CronogramaCorteModel.id == corte_id)
    result = await db.execute(stmt)
    corte = result.scalar_one_or_none()
    if not corte:
        raise HTTPException(status_code=404, detail="Corte no encontrado.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_val = getattr(corte, field)
        if old_val != value:
            setattr(corte, field, value)
            # Audit log per field
            db.add(ActivityLogModel(
                user_id=str(current_user.id),
                user_name=current_user.full_name or current_user.email,
                user_role=current_user.role,
                module="cronograma",
                page=f"projects/{corte.project_id}/cronograma",
                action=f"update_corte: Semana {corte.semana} ({field})",
                field_name=field,
                before_state=str(old_val),
                after_state=str(value),
                project_id=corte.project_id,
                timestamp=datetime.now(timezone.utc),
            ))

    await db.flush()
    await db.refresh(corte)
    return corte

@router.delete("/cortes/{corte_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_corte(
    corte_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Delete a progress cut."""
    stmt = select(CronogramaCorteModel).where(CronogramaCorteModel.id == corte_id)
    result = await db.execute(stmt)
    corte = result.scalar_one_or_none()
    if not corte:
        raise HTTPException(status_code=404, detail="Corte no encontrado.")

    project_id = corte.project_id
    semana = corte.semana
    
    await db.delete(corte)
    
    # Audit log
    db.add(ActivityLogModel(
        user_id=str(current_user.id),
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role,
        module="cronograma",
        page=f"projects/{project_id}/cronograma",
        action=f"delete_corte: Semana {semana}",
        project_id=project_id,
        timestamp=datetime.now(timezone.utc),
    ))
    await db.flush()

@router.get("/{project_id}/semana-actual")
async def get_semana_actual(project_id: str, db: AsyncSession = Depends(get_db_session)):
    """
    Devuelve la última semana con avance_ejecutado registrado.
    Este es el único cálculo autorizado de 'semana actual'.
    """
    resultado = await db.execute(text("""
        SELECT
            semana,
            fecha_corte,
            avance_planeado,
            avance_ejecutado,
            ROUND(avance_ejecutado / NULLIF(avance_planeado, 0), 4) AS spi,
            ROUND(avance_ejecutado - avance_planeado, 2) AS desviacion
        FROM cronograma_cortes
        WHERE project_id = :pid
          AND avance_ejecutado IS NOT NULL
          AND avance_planeado IS NOT NULL
          AND avance_planeado > 0
        ORDER BY semana DESC
        LIMIT 1
    """), {"pid": project_id})
    row = resultado.fetchone()

    if not row:
        return {"semana": None, "mensaje": "Sin cortes registrados"}

    return {
        "semana":            row.semana,
        "fecha_corte":       str(row.fecha_corte) if row.fecha_corte else None,
        "avance_planeado":   float(row.avance_planeado) if row.avance_planeado is not None else 0.0,
        "avance_ejecutado":  float(row.avance_ejecutado) if row.avance_ejecutado is not None else 0.0,
        "spi":               float(row.spi) if row.spi is not None else 0.0,
        "desviacion":        float(row.desviacion) if row.desviacion is not None else 0.0,
    }
