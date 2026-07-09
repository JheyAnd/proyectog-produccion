from typing import Optional
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid

from src.infrastructure.database.models.base import Base

class CronogramaActividadModel(Base):
    __tablename__ = "cronograma_actividades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    wbs_code: Mapped[str] = mapped_column(String(50), nullable=False)
    nombre_tarea: Mapped[str] = mapped_column(String(500), nullable=False)
    peso: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    duracion_dias: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("ProjectModel")
