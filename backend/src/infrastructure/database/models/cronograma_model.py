from typing import Optional
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base

class CronogramaCorteModel(Base):
    __tablename__ = "cronograma_cortes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    semana: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_corte: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    avance_planeado: Mapped[float] = mapped_column(Numeric(7, 4), nullable=False)
    avance_ejecutado: Mapped[Optional[float]] = mapped_column(Numeric(7, 4), nullable=True)
    origen: Mapped[str] = mapped_column(String(20), default="historico")
    detalle_json: Mapped[Optional[str]] = mapped_column(String(4000), nullable=True) # Using String for mapping to LONGTEXT in MySQL if needed, or keeping it as is.
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint("project_id", "semana", name="uniq_project_semana"),
    )

    # Relationships
    project = relationship("ProjectModel")
