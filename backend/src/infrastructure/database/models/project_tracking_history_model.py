"""SQLAlchemy model — Seguimiento de Proyectos de Infraestructura de Recarga."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.database.models.base import Base


class ProjectTrackingHistoryModel(Base):
    """
    Tabla de seguimiento de proyectos PCM / PCS.
    Migrada desde projectsTrackingData.json + projectsSolarData.json.
    Cada registro corresponde a una hoja del Excel
    'Seguimiento a Proyectos PCMejía.xlsx'.
    """
    __tablename__ = "project_tracking_history"

    # ── Identificadores ──────────────────────────────────────────
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tracking_id: Mapped[str] = mapped_column(String(80), ForeignKey("project_tracking.id", ondelete="CASCADE"), index=True)
    semana: Mapped[int] = mapped_column(index=True)
    project_id: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("projects.id", ondelete="CASCADE"), 
        nullable=True,
        index=True
    )
    sheet_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # 'PCM' | 'PCS'
    fecha_informe: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # ── Datos Generales (read-only desde Excel) ──────────────────
    nombre_proyecto: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    nombre_contrato: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    codigo_proyecto: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    cliente: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    gerente_proyecto_cliente: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    administrador_contrato_cliente: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    interventor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    director_proyectos: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    ingeniero_residente: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    supervisor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    encargado: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    tipo_contrato: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    requiere_auxilios: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    polizas_requeridas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    multas_penalidades: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alcance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    localizacion: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    fecha_inicio: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    fecha_finalizacion_contractual: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    valor_original_contrato: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    porcentaje_anticipo: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    retencion_garantia: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    utilidad_proyectada: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── Seguimiento (editable desde la app) ──────────────────────
    fecha_terminacion_estimada: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    avance_programado: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avance_real: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    modificacion_alcance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ordenes_compra: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    alcance_ordenes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tiempo_ordenes: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    valor_ordenes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estado_facturacion_ordenes: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    desviaciones_detectadas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    justificacion_desviaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valor_otros_adiciones: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valor_actual_contrato: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valor_anticipo_recibido: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valor_facturado: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    retenido: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    amortizacion_anticipo: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valor_total_ingreso: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valor_descuentos: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valor_pagado: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valor_por_amortizar: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    costos_materiales: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    costos_mano_obra: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    costos_administrativos: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    costos_ejecutados_total: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    utilidad_actual: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    utilidad_proyectada_fc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    necesidades_apoyo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decisiones_gerencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observaciones_cliente: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    identificacion_riesgos: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lecciones_aprendidas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recomendaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Datos de Resumen de Contrato (Nuevos) ────────────────────
    oferente: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    nit_contratista: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ciudad_contratista: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    representante_legal: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    nit_cliente: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ciudad_cliente: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    capacidad: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    forma_pago: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # ── Auditoría ────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<ProjectTrackingHistory {self.id}: {self.nombre_proyecto}>"
