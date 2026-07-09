from typing import Optional
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid

from src.infrastructure.database.models.base import Base

class CronogramaProyectadoModel(Base):
    __tablename__ = "cronograma_proyectado"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    semana: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_semana: Mapped[date] = mapped_column(Date, nullable=False)
    avance_planeado: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("project_id", "semana", name="unique_semana"),
    )

    # Relationships
    project = relationship("ProjectModel")
