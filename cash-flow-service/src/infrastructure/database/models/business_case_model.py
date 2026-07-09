"""
Modelos SQLAlchemy para módulo Caso de Negocio.

Origen de datos: Excel "Detallado caso de negocio_220126.xlsx"
Hojas clave: "Costo vs Venta", "Ejecución vs Caso de Negocio",
             "Admon Patios", "RESUMEN VENTA"

Tablas:
1. business_case                    → Resumen + escenario activo + KPIs
2. business_case_chapters           → Costo vs Venta (Suministro/MO/Adm/Intereses)
3. business_case_aiu                → Items extras (IVA, ITS, AIU, Financiación)
4. business_case_procurement        → Ejecución vs Caso de Negocio
5. business_case_procurement_items  → Sub-items por proveedor
6. business_case_indirect_costs     → Admon Patios (costos indirectos)
7. business_case_scenarios          → Snapshots por TRM (USD3900/4000/4300)
8. business_case_audit_log          → Auditoría de ediciones (NUEVA - editable con auditoría)

Política:
- Datos importados desde Excel REEMPLAZAN los existentes
- Edición manual queda registrada en business_case_audit_log
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


# ══════════════════════════════════════════════════════════════════════════════
# 1. RESUMEN + ESCENARIO ACTIVO
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseModel(Base):
    """Caso de Negocio del proyecto. Una fila por proyecto."""

    __tablename__ = "business_case"
    __table_args__ = (
        Index("idx_bc_project", "project_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # ── Escenario activo ────────────────────────────────────────
    scenario_active: Mapped[str] = mapped_column(String(20), nullable=False, default="USD4000")
    usd_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=4000.00)
    moneda: Mapped[str] = mapped_column(String(3), nullable=False, default="COP")

    # ── KPIs principales (los 4 cards superiores) ───────────────
    valor_oferta_total: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    costo_total: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    costo_total_sin_fin: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    costo_total_con_fin: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    margen_bruto_valor: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    margen_bruto_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    administracion_valor: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    financiacion_valor: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    meses_sin_ingresos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ── Flags de carga de entregables ───────────────────────────
    presupuesto_venta_cargado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    presupuesto_costo_cargado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Valores Manuales (PASO 1) ───────────────────────────────
    venta_monto_manual: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    venta_suministro: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    venta_administracion: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    venta_mano_obra: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    venta_intereses: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True, default=0.0)

    costo_monto_manual: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    costo_suministro: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    costo_administracion: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    costo_mano_obra: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    costo_intereses: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True, default=0.0)

    valores_manuales_completos: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    venta_excel_validado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    costo_excel_validado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Trazabilidad de origen ──────────────────────────────────
    source_excel_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    source_excel_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_imported_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_imported_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    last_imported_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

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
    chapters = relationship("BusinessCaseChapterModel", back_populates="business_case", cascade="all, delete-orphan")
    aiu_items = relationship("BusinessCaseAIUModel", back_populates="business_case", cascade="all, delete-orphan")
    procurements = relationship("BusinessCaseProcurementModel", back_populates="business_case", cascade="all, delete-orphan")
    indirect_costs = relationship("BusinessCaseIndirectCostModel", back_populates="business_case", cascade="all, delete-orphan")
    scenarios = relationship("BusinessCaseScenarioModel", back_populates="business_case", cascade="all, delete-orphan")
    audit_logs = relationship("BusinessCaseAuditLogModel", back_populates="business_case", cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════════════════
# 2. COSTO VS VENTA (capítulos del Excel "Costo vs Venta")
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseChapterModel(Base):
    """Capítulos de Costo vs Venta agrupados (Suministro, Mano Obra, Adm, Intereses)."""

    __tablename__ = "business_case_chapters"
    __table_args__ = (
        Index("idx_bc_ch_bc", "business_case_id"),
        Index("idx_bc_ch_group", "business_case_id", "group_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("business_case.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    group_id: Mapped[str] = mapped_column(String(30), nullable=False)
    group_name: Mapped[str] = mapped_column(String(100), nullable=False)
    chapter_id: Mapped[str] = mapped_column(String(50), nullable=False)
    chapter_name: Mapped[str] = mapped_column(String(200), nullable=False)
    venta: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    costo: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    excel_source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    excel_source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    business_case = relationship("BusinessCaseModel", back_populates="chapters")


# ══════════════════════════════════════════════════════════════════════════════
# 3. AIU + ITEMS EXTRAS (IVA, ITS, Adm, Imprev, Utilidad, IVAU, Financiación)
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseAIUModel(Base):
    """Items extras del Caso de Negocio (AIU + Financiación)."""

    __tablename__ = "business_case_aiu"
    __table_args__ = (
        Index("idx_bc_aiu_bc", "business_case_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("business_case.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    venta: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    costo: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    percentage: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    business_case = relationship("BusinessCaseModel", back_populates="aiu_items")


# ══════════════════════════════════════════════════════════════════════════════
# 4. PROCUREMENT (Ejecución vs Caso de Negocio)
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseProcurementModel(Base):
    """Estado de procura por capítulo: Caso Negocio / Negociado / Pendiente / Proyectado."""

    __tablename__ = "business_case_procurement"
    __table_args__ = (
        Index("idx_bc_proc_bc", "business_case_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("business_case.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    ref: Mapped[str] = mapped_column(String(100), nullable=False)
    caso_negocio: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    negociado: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    pendiente: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    proyectado: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    business_case = relationship("BusinessCaseModel", back_populates="procurements")
    items = relationship("BusinessCaseProcurementItemModel", back_populates="procurement", cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════════════════
# 5. PROCUREMENT ITEMS (sub-items por proveedor)
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseProcurementItemModel(Base):
    """Sub-items detallados de procura con proveedor."""

    __tablename__ = "business_case_procurement_items"
    __table_args__ = (
        Index("idx_bc_proc_item_proc", "procurement_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    procurement_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("business_case_procurement.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    capitulo: Mapped[str] = mapped_column(String(200), nullable=False)
    proveedor: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    negociado: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    pendiente: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    procurement = relationship("BusinessCaseProcurementModel", back_populates="items")


# ══════════════════════════════════════════════════════════════════════════════
# 6. INDIRECT COSTS (Admon Patios)
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseIndirectCostModel(Base):
    """Costos indirectos detallados (Personal, Equipos, SST, Otros)."""

    __tablename__ = "business_case_indirect_costs"
    __table_args__ = (
        Index("idx_bc_ic_bc", "business_case_id"),
        Index("idx_bc_ic_section", "business_case_id", "seccion"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("business_case.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    seccion: Mapped[str] = mapped_column(String(80), nullable=False)
    item_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    descripcion: Mapped[str] = mapped_column(String(300), nullable=False)
    unidad: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cantidad: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    vr_unitario: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    total: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    business_case = relationship("BusinessCaseModel", back_populates="indirect_costs")


# ══════════════════════════════════════════════════════════════════════════════
# 7. ESCENARIOS (snapshots por TRM)
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseScenarioModel(Base):
    """Escenarios por tasa USD (USD3900, USD4000, USD4300)."""

    __tablename__ = "business_case_scenarios"
    __table_args__ = (
        Index("idx_bc_sc_bc", "business_case_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("business_case.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    scenario_name: Mapped[str] = mapped_column(String(20), nullable=False)
    usd_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_oferta: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    total_costo: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    margen_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    data_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    business_case = relationship("BusinessCaseModel", back_populates="scenarios")


# ══════════════════════════════════════════════════════════════════════════════
# 8. AUDITORÍA DE EDICIONES (Editable con auditoría)
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseAuditLogModel(Base):
    """
    Cada edición manual en el módulo de Caso de Negocio queda registrada.
    Permite trazabilidad completa: quién cambió qué, cuándo, valor antes/después.
    """

    __tablename__ = "business_case_audit_log"
    __table_args__ = (
        Index("idx_bc_audit_bc", "business_case_id", "occurred_at"),
        Index("idx_bc_audit_user", "user_id", "occurred_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("business_case.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    table_name: Mapped[str] = mapped_column(String(80), nullable=False)
    record_id: Mapped[str] = mapped_column(String(36), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    user_name: Mapped[str] = mapped_column(String(150), nullable=False)
    user_role: Mapped[str] = mapped_column(String(50), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    business_case = relationship("BusinessCaseModel", back_populates="audit_logs")


# ══════════════════════════════════════════════════════════════════════════════
# 9. DETALLE EXCEL CATEGORIZADO POR IA
# ══════════════════════════════════════════════════════════════════════════════

class BusinessCaseDetailModel(Base):
    """Líneas de detalle del Excel de Venta/Costo analizadas y clasificadas por IA."""

    __tablename__ = "business_case_details"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)  # 'venta' o 'costo'
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)  # 'Suministro', 'Mano de Obra', 'Administración', 'Otros'
    concepto: Mapped[str] = mapped_column(String(500), nullable=False)  # Línea/Concepto original
    valor: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(String(10), nullable=False, default="COP")
    fuente_excel: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Celda o fila de origen
    creado_por_ia: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

