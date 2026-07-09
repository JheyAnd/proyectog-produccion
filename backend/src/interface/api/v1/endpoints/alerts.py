from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from datetime import datetime

from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.alert_model import ProjectAlertModel
from src.infrastructure.security.pandora_middleware import get_current_user

router = APIRouter()

# --- Schemas ---
class AlertCreate(BaseModel):
    title: str
    description: str
    severity: str  # critical, warning, info
    segment: str   # CRONOGRAMA, COSTOS, FLUJO DE CAJA, CONTRATO, PROCURA
    why_it_matters: Optional[str] = None
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    metric: Optional[str] = None
    metric_label: Optional[str] = None

class AlertResponse(AlertCreate):
    id: int
    project_id: str
    source: str
    created_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/", response_model=List[AlertResponse])
async def get_project_alerts(
    project_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Get all manual alerts for a project."""
    query = select(ProjectAlertModel).where(ProjectAlertModel.project_id == project_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=AlertResponse)
async def create_alert(
    project_id: str,
    alert_in: AlertCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user)
):
    """Create a new manual alert. Only Admin and Gerente allowed."""
    if current_user.get("role") not in ["administrador", "gerente"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear alertas."
        )
    
    new_alert = ProjectAlertModel(
        project_id=project_id,
        title=alert_in.title,
        description=alert_in.description,
        severity=alert_in.severity,
        segment=alert_in.segment,
        why_it_matters=alert_in.why_it_matters,
        impact=alert_in.impact,
        recommendation=alert_in.recommendation,
        metric=alert_in.metric,
        metric_label=alert_in.metric_label,
        created_by=current_user.get("email", "unknown")
    )
    
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    return new_alert

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(get_current_user)
):
    """Delete a manual alert. Only Admin and Gerente allowed."""
    if current_user.get("role") not in ["administrador", "gerente"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar alertas."
        )
    
    query = delete(ProjectAlertModel).where(ProjectAlertModel.id == alert_id)
    await db.execute(query)
    await db.commit()
    return {"status": "success", "message": f"Alerta {alert_id} eliminada."}
