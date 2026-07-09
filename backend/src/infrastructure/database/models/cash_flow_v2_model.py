"""
Modelos auxiliares v2 para Flujo de Caja:
- CashFlowAuditLogModel: auditoría de ediciones manuales
- CashFlowImportLogModel: registro de importaciones de Excel

NOTA: Las tablas principales (egreso_categorias, egreso_valores) ya existen.
Estos modelos COMPLEMENTAN la trazabilidad.

Origen del Flujo de Caja:
- Excel: "Flujo de caja patio sur 6 abril (1).xlsx" → Hoja "FC X Obras"
- 39 categorías × 39 meses (Oct 2025 → Dic 2028)
- 4 grupos: materiales, mano_obra, administracion, ingreso
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, Index, Enum
)
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.database.models.base import Base


class CashFlowAuditLogModel(Base):
    """
    Cada edición manual en Flujo de Caja queda auditada.
    Permite trazabilidad: quién cambió qué valor, cuándo, valor antes/después.
    """

    __tablename__ = "cash_flow_audit_log"
    __table_args__ = (
        Index("idx_cf_audit_project", "project_id", "occurred_at"),
        Index("idx_cf_audit_user", "user_id", "occurred_at"),
        Index("idx_cf_audit_categoria", "categoria_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Qué cambió
    categoria_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    categoria_nombre: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    grupo: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    mes_key: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # YYYY-MM
    field_name: Mapped[str] = mapped_column(String(50), nullable=False)
    old_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Quién
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    user_name: Mapped[str] = mapped_column(String(150), nullable=False)
    user_role: Mapped[str] = mapped_column(String(50), nullable=False)

    # Detalle de la acción
    action: Mapped[str] = mapped_column(
        Enum(
            "edit", "create", "delete", "import_excel", "bulk_update",
            name="cash_flow_action_enum",
        ),
        nullable=False,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class CashFlowImportLogModel(Base):
    """
    Registro de cada importación de Excel del Flujo de Caja.
    Permite ver quién importó qué archivo y cuándo.
    """

    __tablename__ = "cash_flow_import_log"
    __table_args__ = (
        Index("idx_cf_import_project", "project_id", "imported_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_hash_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    sheet_name: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    # Resumen de datos importados
    total_categorias: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_valores: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_meses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sum_total: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)

    # Quién importó
    imported_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    imported_by_name: Mapped[str] = mapped_column(String(150), nullable=False)
    imported_by_role: Mapped[str] = mapped_column(String(50), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    status: Mapped[str] = mapped_column(
        Enum("success", "partial", "failed", name="cash_flow_import_status_enum"),
        nullable=False,
        default="success",
    )
    error_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    imported_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
