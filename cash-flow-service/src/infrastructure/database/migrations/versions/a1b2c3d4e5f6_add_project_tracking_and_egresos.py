"""add_project_tracking_and_egresos_tables

Revision ID: a1b2c3d4e5f6
Revises: 6200e2283c33
Create Date: 2026-04-28 10:00:00.000000

Migración que crea las tablas relacionales para:
  1. project_tracking  — seguimiento de 25+ proyectos PCM/PCS (antes JSON hardcodeado)
  2. egreso_categorias — categorías de la matriz de egresos del flujo de caja
  3. egreso_valores    — valores mensuales por categoría (YYYY-MM → valor)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "6200e2283c33"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. project_tracking ──────────────────────────────────────
    op.create_table(
        "project_tracking",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("sheet_name", sa.String(120), nullable=True),
        sa.Column("group", sa.String(10), nullable=True),
        sa.Column("fecha_informe", sa.String(30), nullable=True),
        # Datos Generales
        sa.Column("nombre_proyecto", sa.String(300), nullable=True),
        sa.Column("nombre_contrato", sa.Text(), nullable=True),
        sa.Column("codigo_proyecto", sa.String(50), nullable=True, index=True),
        sa.Column("cliente", sa.String(200), nullable=True),
        sa.Column("gerente_proyecto_cliente", sa.String(200), nullable=True),
        sa.Column("administrador_contrato_cliente", sa.String(200), nullable=True),
        sa.Column("interventor", sa.String(200), nullable=True),
        sa.Column("director_proyectos", sa.String(200), nullable=True),
        sa.Column("ingeniero_residente", sa.String(200), nullable=True),
        sa.Column("supervisor", sa.String(200), nullable=True),
        sa.Column("encargado", sa.String(200), nullable=True),
        sa.Column("tipo_contrato", sa.String(100), nullable=True),
        sa.Column("requiere_auxilios", sa.String(10), nullable=True),
        sa.Column("polizas_requeridas", sa.Text(), nullable=True),
        sa.Column("multas_penalidades", sa.Text(), nullable=True),
        sa.Column("alcance", sa.Text(), nullable=True),
        sa.Column("localizacion", sa.String(300), nullable=True),
        sa.Column("fecha_inicio", sa.String(30), nullable=True),
        sa.Column("fecha_finalizacion_contractual", sa.String(30), nullable=True),
        sa.Column("valor_original_contrato", sa.Float(), nullable=True),
        sa.Column("porcentaje_anticipo", sa.Float(), nullable=True),
        sa.Column("retencion_garantia", sa.Float(), nullable=True),
        sa.Column("utilidad_proyectada", sa.Float(), nullable=True),
        # Seguimiento
        sa.Column("fecha_terminacion_estimada", sa.String(30), nullable=True),
        sa.Column("avance_programado", sa.Float(), nullable=True),
        sa.Column("avance_real", sa.Float(), nullable=True),
        sa.Column("modificacion_alcance", sa.Text(), nullable=True),
        sa.Column("ordenes_compra", sa.String(10), nullable=True),
        sa.Column("alcance_ordenes", sa.Text(), nullable=True),
        sa.Column("tiempo_ordenes", sa.String(100), nullable=True),
        sa.Column("valor_ordenes", sa.Float(), nullable=True),
        sa.Column("estado_facturacion_ordenes", sa.String(200), nullable=True),
        sa.Column("desviaciones_detectadas", sa.Text(), nullable=True),
        sa.Column("justificacion_desviaciones", sa.Text(), nullable=True),
        sa.Column("valor_otros_adiciones", sa.Float(), nullable=True),
        sa.Column("valor_actual_contrato", sa.Float(), nullable=True),
        sa.Column("valor_anticipo_recibido", sa.Float(), nullable=True),
        sa.Column("valor_facturado", sa.Float(), nullable=True),
        sa.Column("retenido", sa.Float(), nullable=True),
        sa.Column("amortizacion_anticipo", sa.Float(), nullable=True),
        sa.Column("valor_total_ingreso", sa.Float(), nullable=True),
        sa.Column("valor_descuentos", sa.Float(), nullable=True),
        sa.Column("valor_pagado", sa.Float(), nullable=True),
        sa.Column("valor_por_amortizar", sa.Float(), nullable=True),
        sa.Column("costos_materiales", sa.Float(), nullable=True),
        sa.Column("costos_mano_obra", sa.Float(), nullable=True),
        sa.Column("costos_administrativos", sa.Float(), nullable=True),
        sa.Column("costos_ejecutados_total", sa.Float(), nullable=True),
        sa.Column("utilidad_actual", sa.Float(), nullable=True),
        sa.Column("utilidad_proyectada_fc", sa.Float(), nullable=True),
        sa.Column("necesidades_apoyo", sa.Text(), nullable=True),
        sa.Column("decisiones_gerencia", sa.Text(), nullable=True),
        sa.Column("observaciones_cliente", sa.Text(), nullable=True),
        sa.Column("identificacion_riesgos", sa.Text(), nullable=True),
        sa.Column("lecciones_aprendidas", sa.Text(), nullable=True),
        sa.Column("recomendaciones", sa.Text(), nullable=True),
        # Auditoría
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── 2. egreso_categorias ─────────────────────────────────────
    op.create_table(
        "egreso_categorias",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("project_key", sa.String(80), nullable=False, index=True),
        sa.Column("nombre", sa.String(300), nullable=False),
        sa.Column("grupo", sa.String(30), nullable=False),
        sa.Column("incluir_en_grafico", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── 3. egreso_valores ────────────────────────────────────────
    op.create_table(
        "egreso_valores",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("categoria_id", sa.String(80),
                  sa.ForeignKey("egreso_categorias.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("mes_key", sa.String(7), nullable=False),   # YYYY-MM
        sa.Column("valor", sa.Float(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now(), onupdate=sa.func.now()),
        # Índice compuesto para búsquedas rápidas por categoría+mes
        sa.UniqueConstraint("categoria_id", "mes_key", name="uq_egreso_categoria_mes"),
    )


def downgrade() -> None:
    op.drop_table("egreso_valores")
    op.drop_table("egreso_categorias")
    op.drop_table("project_tracking")
