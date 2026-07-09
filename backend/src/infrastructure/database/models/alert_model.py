from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, String, Text, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.infrastructure.database.models.base import Base

class ProjectAlertModel(Base):
    """
    Manual alerts created by Administrators or Managers for a specific project.
    """
    __tablename__ = "project_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20)) # critical, warning, info
    segment: Mapped[str] = mapped_column(String(50))  # CRONOGRAMA, COSTOS, FLUJO DE CAJA, CONTRATO, PROCURA
    
    # Optional fields to match dynamic alerts
    metric: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    metric_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    why_it_matters: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    impact: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(100), default="Manual")
    
    created_by: Mapped[str] = mapped_column(String(255)) # Email of the creator
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    # Relationship
    project = relationship("ProjectModel", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<ProjectAlert {self.project_id} - {self.title}>"
