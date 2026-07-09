"""API endpoints — Control de Pendientes (Seguimiento)."""
from datetime import date, datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models.project_pending_model import ProjectPendingModel
from src.infrastructure.database.session import get_db_session
from src.socket_manager import broadcast_preference_update

router = APIRouter(prefix="/projects/{project_id}/pendings", tags=["Project Pendings"])


# ── Schemas Pydantic ─────────────────────────────────────────────

class ProjectPendingSchema(BaseModel):
    id: Optional[str] = None
    tipo_proceso: str
    pendiente: str
    nota: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    responsable: Optional[str] = None
    estado: str = "En curso"

    class Config:
        from_attributes = True


# ── Endpoints ────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectPendingSchema])
async def list_pendings(
    project_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Lista todos los pendientes de un proyecto."""
    result = await db.execute(
        select(ProjectPendingModel)
        .where(ProjectPendingModel.project_id == project_id)
        .order_by(ProjectPendingModel.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ProjectPendingSchema)
async def create_pending(
    project_id: str,
    data: ProjectPendingSchema,
    db: AsyncSession = Depends(get_db_session)
):
    """Crea un nuevo pendiente para el proyecto."""
    new_pending = ProjectPendingModel(
        id=str(uuid.uuid4()),
        project_id=project_id,
        tipo_proceso=data.tipo_proceso,
        pendiente=data.pendiente,
        nota=data.nota,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        responsable=data.responsable,
        estado=data.estado
    )
    db.add(new_pending)
    await db.flush()
    
    # Notificar via sockets (opcional, reutilizamos el evento de tracking o uno nuevo)
    await broadcast_preference_update("project_pendings_updated", {"project_id": project_id})
    
    return new_pending


@router.put("/{pending_id}", response_model=ProjectPendingSchema)
async def update_pending(
    project_id: str,
    pending_id: str,
    data: ProjectPendingSchema,
    db: AsyncSession = Depends(get_db_session)
):
    """Actualiza un pendiente existente."""
    result = await db.execute(
        select(ProjectPendingModel)
        .where(ProjectPendingModel.id == pending_id, ProjectPendingModel.project_id == project_id)
    )
    pending = result.scalar_one_or_none()
    if not pending:
        raise HTTPException(status_code=404, detail="Pendiente no encontrado")

    for field, value in data.model_dump(exclude={"id"}).items():
        setattr(pending, field, value)
    
    pending.updated_at = datetime.now(timezone.utc)
    await db.flush()
    
    await broadcast_preference_update("project_pendings_updated", {"project_id": project_id})
    
    return pending


@router.delete("/{pending_id}")
async def delete_pending(
    project_id: str,
    pending_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Elimina un pendiente."""
    result = await db.execute(
        delete(ProjectPendingModel)
        .where(ProjectPendingModel.id == pending_id, ProjectPendingModel.project_id == project_id)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pendiente no encontrado")
        
    await broadcast_preference_update("project_pendings_updated", {"project_id": project_id})
    
    return {"status": "deleted"}
