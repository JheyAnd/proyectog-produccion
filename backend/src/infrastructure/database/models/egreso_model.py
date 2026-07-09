"""SQLAlchemy models — Matriz de Egresos del Flujo de Caja."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.models.base import Base


class EgresoCategoriaModel(Base):
    """
    Categoría de egreso (ej: 'Starcharge - Cargadores', 'Nómina interna').
    Migrada desde INITIAL_EGRESOS_CATEGORIAS en excelCategoriasEgresos.ts.
    Cada categoría pertenece a un grupo: materiales | mano_obra | administracion | ingreso.
    """
    __tablename__ = "egreso_categorias"

    id: Mapped[str] = mapped_column(
        String(80), primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    grupo: Mapped[str] = mapped_column(String(30), nullable=False)   # materiales | mano_obra | administracion | ingreso
    incluir_en_grafico: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relación hacia los valores mensuales
    valores: Mapped[list["EgresoValorModel"]] = relationship(
        "EgresoValorModel",
        back_populates="categoria",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EgresoCategoria {self.grupo}/{self.nombre}>"


class EgresoValorModel(Base):
    """
    Valor mensual de una categoría de egreso.
    Clave: mes_key = 'YYYY-MM'  (ej: '2025-10', '2026-03').
    """
    __tablename__ = "egreso_valores"

    id: Mapped[str] = mapped_column(
        String(80), primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    categoria_id: Mapped[str] = mapped_column(
        String(80),
        ForeignKey("egreso_categorias.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mes_key: Mapped[str] = mapped_column(String(7), nullable=False)   # 'YYYY-MM'
    valor: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relación inversa
    categoria: Mapped["EgresoCategoriaModel"] = relationship(
        "EgresoCategoriaModel", back_populates="valores"
    )

    def __repr__(self) -> str:
        return f"<EgresoValor {self.categoria_id} {self.mes_key}={self.valor}>"
