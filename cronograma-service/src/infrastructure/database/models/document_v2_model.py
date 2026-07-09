"""
Modelos SQLAlchemy para gestión de documentos por proyecto.

Arquitectura:
- BD almacena METADATOS, trazabilidad, versiones, accesos.
- SharePoint (o carpeta local en piloto) almacena los ARCHIVOS físicos.
- Cada documento pertenece a UN proyecto y UNA categoría.
- Soft delete activado (los docs eliminados se marcan, no se borran).

Tablas:
1. document_categories          → Catálogo de categorías
2. documents                    → Metadatos de cada documento
3. document_access_log          → Quién vio/descargó/editó cada doc
4. document_required_per_phase  → Checklist de docs requeridos por fase
5. project_documents_status     → Resumen del % completitud por proyecto
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer,
    Numeric, String, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


# ══════════════════════════════════════════════════════════════════════════════
# 1. CATÁLOGO DE CATEGORÍAS
# ══════════════════════════════════════════════════════════════════════════════

class DocumentCategoryModel(Base):
    """Catálogo de categorías de documentos. Seed inicial con 18 categorías."""

    __tablename__ = "document_categories"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    allowed_extensions: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    documents = relationship("DocumentModel", back_populates="category")


# ══════════════════════════════════════════════════════════════════════════════
# 2. DOCUMENTOS (núcleo - metadatos, NO almacena archivo)
# ══════════════════════════════════════════════════════════════════════════════

class DocumentModel(Base):
    """
    Metadatos de un documento. El archivo físico está en SharePoint
    (o en carpeta local durante el piloto).
    """

    __tablename__ = "documents"
    __table_args__ = (
        Index("idx_documents_project", "project_id", "is_deleted"),
        Index("idx_documents_category", "project_id", "category_id"),
        Index("idx_documents_phase", "project_id", "phase"),
        Index("idx_documents_uploaded_by", "uploaded_by_id"),
        Index("idx_documents_uploaded_at", "uploaded_at"),
        Index("idx_documents_status", "status"),
        Index("idx_documents_latest", "project_id", "is_latest_version", "is_deleted"),
    )

    # ── Identidad ───────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("document_categories.id"),
        nullable=False,
    )
    phase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # ── Información del archivo ─────────────────────────────────
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_extension: Mapped[str] = mapped_column(String(10), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    # ── SharePoint (archivo físico) ─────────────────────────────
    # Durante el piloto puede ser una ruta local. En producción será URL SharePoint.
    sharepoint_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    sharepoint_drive_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sharepoint_item_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sharepoint_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    preview_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Storage type: 'sharepoint' | 'local' | 'legacy'
    storage_type: Mapped[str] = mapped_column(String(20), nullable=False, default="sharepoint")

    # ── Trazabilidad de carga ───────────────────────────────────
    uploaded_by_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    uploaded_by_name: Mapped[str] = mapped_column(String(150), nullable=False)
    uploaded_by_role: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    uploader_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # ── Versionado ──────────────────────────────────────────────
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    parent_document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id"), nullable=True
    )
    is_latest_version: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # ── Estado y validación ─────────────────────────────────────
    # Sin workflow de aprobación: todos llegan como 'approved' por defecto.
    status: Mapped[str] = mapped_column(
        Enum(
            "draft", "pending", "revision", "approved", "rejected", "obsolete",
            name="document_status_enum",
        ),
        nullable=False,
        default="approved",
    )
    approved_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approval_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Soft delete (auditoría) ─────────────────────────────────
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    deleted_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Integridad ──────────────────────────────────────────────
    file_hash_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # ── Timestamps ──────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    category = relationship("DocumentCategoryModel", back_populates="documents")
    uploaded_by = relationship("UserModel", foreign_keys=[uploaded_by_id])
    approved_by = relationship("UserModel", foreign_keys=[approved_by_id])
    deleted_by = relationship("UserModel", foreign_keys=[deleted_by_id])
    access_logs = relationship("DocumentAccessLogModel", back_populates="document", cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════════════════
# 3. LOG DE ACCESOS (auditoría granular)
# ══════════════════════════════════════════════════════════════════════════════

class DocumentAccessLogModel(Base):
    """Cada vez que un usuario ve, descarga, edita o elimina un documento."""

    __tablename__ = "document_access_log"
    __table_args__ = (
        Index("idx_doc_access_document", "document_id", "occurred_at"),
        Index("idx_doc_access_user", "user_id", "occurred_at"),
        Index("idx_doc_access_action", "action", "occurred_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    user_name: Mapped[str] = mapped_column(String(150), nullable=False)
    user_role: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(
        Enum(
            "upload", "view", "download", "preview",
            "edit", "approve", "reject", "delete", "restore",
            name="document_action_enum",
        ),
        nullable=False,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    document = relationship("DocumentModel", back_populates="access_logs")


# ══════════════════════════════════════════════════════════════════════════════
# 4. CHECKLIST DE DOCUMENTOS REQUERIDOS POR FASE
# ══════════════════════════════════════════════════════════════════════════════

class DocumentRequiredPerPhaseModel(Base):
    """Define qué documentos son requeridos en cada fase del proyecto."""

    __tablename__ = "document_required_per_phase"
    __table_args__ = (
        UniqueConstraint("phase", "document_type", name="uq_phase_doctype"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    phase: Mapped[str] = mapped_column(String(20), nullable=False)
    category_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("document_categories.id"),
        nullable=False,
    )
    document_type: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    responsible_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


# ══════════════════════════════════════════════════════════════════════════════
# 5. RESUMEN DE COMPLETITUD POR PROYECTO
# ══════════════════════════════════════════════════════════════════════════════

class ProjectDocumentsStatusModel(Base):
    """Vista materializada del estado de documentos por proyecto y fase."""

    __tablename__ = "project_documents_status"
    __table_args__ = (
        UniqueConstraint("project_id", "phase", name="uq_project_phase_status"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    phase: Mapped[str] = mapped_column(String(20), nullable=False)
    total_required: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_uploaded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_approved: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_pct: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0.00
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
