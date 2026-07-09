from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class CronogramaCorteBase(BaseModel):
    semana: int
    fecha_corte: Optional[date] = None
    avance_planeado: float = Field(..., ge=0, le=100)
    avance_ejecutado: Optional[float] = Field(None, ge=0, le=100)
    origen: str = "snapshot_usuario"
    detalle_json: Optional[str] = None

class CronogramaCorteCreate(CronogramaCorteBase):
    pass

class CronogramaCorteUpdate(BaseModel):
    fecha_corte: Optional[date] = None
    avance_planeado: Optional[float] = Field(None, ge=0, le=100)
    avance_ejecutado: Optional[float] = Field(None, ge=0, le=100)
    origen: Optional[str] = None
    detalle_json: Optional[str] = None

class CronogramaCorteResponse(CronogramaCorteBase):
    id: int
    project_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
