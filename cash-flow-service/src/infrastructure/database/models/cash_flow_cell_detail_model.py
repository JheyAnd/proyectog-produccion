"""
Detalle por celda del Flujo de Caja.

Cada celda (categoría × mes) puede tener N detalles:
- N° Factura
- Proveedor
- Valor
- Nota
- Fecha de la factura
- Documento adjunto (vínculo a documents)

POLÍTICA: el valor de la celda = SUMA de los detalles (autocalculado).
SOFT DELETE: detalles eliminados quedan en BD para auditoría.
"""
import uuid
from datetime import datetime, date, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Index, Numeric, String, Text
)
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.database.models.base import Base


class CashFlowCellDetailModel(Base):
    """
    Detalle de una celda del Flujo de Caja (categoría × mes).
    El total de la celda en egreso_valores.valor = SUM de estos detalles.
    """

    __tablename__ = "cash_flow_cell_details"
    __table_args__ = (
        Index("idx_cfcd_cell", "project_id", "categoria_id", "mes_key", "is_deleted"),
        Index("idx_cfcd_categoria", "categoria_id"),
        Index("idx_cfcd_proveedor", "proveedor"),
        Index("idx_cfcd_factura", "numero_factura"),
        Index("idx_cfcd_created", "created_at"),
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
    categoria_id: Mapped[str] = mapped_column(
        String(80),
        ForeignKey("egreso_categorias.id", ondelete="CASCADE"),
        nullable=False,
    )
    mes_key: Mapped[str] = mapped_column(String(7), nullable=False)  # "YYYY-MM"

    # ── Datos del detalle ──────────────────────────────────────
    numero_oc: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    numero_factura: Mapped[str] = mapped_column(String(100), nullable=False)
    proveedor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    valor: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    incluir_en_grafico: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    nota: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Archivos Binarios ──────────────────────────────────────
    doc_oc_contrato: Mapped[Optional[bytes]] = mapped_column(nullable=True)
    doc_oc_contrato_nombre: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    doc_oc_contrato_tipo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    doc_factura: Mapped[Optional[bytes]] = mapped_column(nullable=True)
    doc_factura_nombre: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    doc_factura_tipo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── Datos opcionales ───────────────────────────────────────
    fecha_factura: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    documento_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Trazabilidad ───────────────────────────────────────────
    created_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_by_name: Mapped[str] = mapped_column(String(150), nullable=False)
    created_by_role: Mapped[str] = mapped_column(String(50), nullable=False)

    updated_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    updated_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # ── Soft delete ────────────────────────────────────────────
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    deleted_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    deleted_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Timestamps ─────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @property
    def has_doc_oc(self) -> bool:
        return self.doc_oc_contrato is not None

    @property
    def has_doc_factura(self) -> bool:
        return self.doc_factura is not None
