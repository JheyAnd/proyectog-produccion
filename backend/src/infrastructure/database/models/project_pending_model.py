"""SQLAlchemy model — Control de Pendientes (Seguimiento)."""
from datetime import date, datetime
from typing import Optional
import uuid

from sqlalchemy import Date, DateTime, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


class ProjectPendingModel(Base):
    """
    Tabla de control de pendientes por proyecto.
    Basado en el diseño 'CONTROL DE PENDIENTES'.
    """
    __tablename__ = "project_pendings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    
    # CL, DS, OI, OC, CP, SG-GH, CT, GA, GT, GF, OE
    tipo_proceso: Mapped[str] = mapped_column(String(100), nullable=False)
    
    pendiente: Mapped[str] = mapped_column(Text, nullable=False)
    nota: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    fecha_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fecha_fin: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    responsable: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # En curso, Cumplido, Atrasado, etc.
    estado: Mapped[str] = mapped_column(String(50), nullable=False, default="En curso")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationship
    project = relationship("ProjectModel", back_populates="pendings")

    def __repr__(self) -> str:
        return f"<ProjectPending {self.id}: {self.tipo_proceso} - {self.pendiente[:20]}...>"
