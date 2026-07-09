"""SQLAlchemy ORM model for Entregables (project deliverable documents)."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, LargeBinary, String, UniqueConstraint, text
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base

VALID_DOC_TYPES = {
    "presupuesto-venta",
    "presupuesto-costo",
    "cronograma",
    "equipo-ejecucion",
    "flujo-caja",
    "presupuesto_venta",
    "presupuesto_costo",
    "cronograma_obra",
    "equipo_ejecucion",
    "flujo_caja",
}


class EntregableModel(Base):
    """One row per document type per project. File binary stored in MySQL LONGBLOB."""

    __tablename__ = "entregables"
    __table_args__ = (
        UniqueConstraint("project_id", "doc_type", name="uq_entregable_project_doctype"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    content_type: Mapped[str] = mapped_column(String(200), nullable=False)
    file_data: Mapped[bytes] = mapped_column(LONGBLOB, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Relationship
    project = relationship("ProjectModel", back_populates="entregables")
