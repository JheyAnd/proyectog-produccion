from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import BigInteger, DateTime, Integer, String, LargeBinary, Index
from sqlalchemy.orm import Mapped, mapped_column
from src.infrastructure.database.models.base import Base

class ProjectFileModel(Base):
    """
    Almacena archivos adjuntos a proyectos directamente en MySQL como MEDIUMBLOB.
    """
    __tablename__ = "project_files"
    __table_args__ = (
        Index("idx_project", "project_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(100), nullable=False)
    nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_mime: Mapped[str] = mapped_column(String(100), nullable=False)
    tamano_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False, default="general")
    archivo: Mapped[bytes] = mapped_column(LargeBinary(length=16777215), nullable=False) # MEDIUMBLOB
    subido_por: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
