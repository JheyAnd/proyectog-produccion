# -*- coding: utf-8 -*-
"""
Script para cargar el proyecto LYRA (CARSAN) en la base de datos MySQL (proyectog).
No utiliza mocks, interactúa directamente con los modelos de SQLAlchemy.
"""
import asyncio
import sys
from datetime import date

# Fix for Windows terminal encoding
if sys.platform == 'win32':
    import os
    os.system('chcp 65001 >nul')

from sqlalchemy import select

# Asegurar que las rutas del proyecto se reconozcan
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.infrastructure.database.models import Base
from src.infrastructure.database.session import engine, AsyncSessionLocal
from src.infrastructure.database.models import (
    ProjectModel,
    WBSItemModel,
    BudgetItemModel,
    BusinessCaseModel,
    ProjectTrackingModel,
    ActivityLogModel
)


async def seed_lyra():
    """
    Seed LYRA project with real structure.

    Project ID: lyra-carsan-oe2000
    Start Date: 2026-05-01 (18 months duration)
    Currency: USD
    BAC: Será calculado desde Excel FC Lyra detallado.xlsx
    """

    # 1. Start Session
    async with AsyncSessionLocal() as session:
        project_id = 'lyra-carsan-oe2000'
        
        # Check if project already exists, if so, we can skip or delete (for idempotency we'll delete)
        existing_project = await session.execute(
            select(ProjectModel).where(ProjectModel.id == project_id)
        )
        project = existing_project.scalar_one_or_none()
        
        if project:
            print("Proyecto LYRA ya existe. Borrando para recargar desde cero...")
            await session.delete(project)
            # También borrar tracking (tiene un id propio pero es el mismo string)
            existing_tracking = await session.execute(
                select(ProjectTrackingModel).where(ProjectTrackingModel.id == project_id)
            )
            tracking = existing_tracking.scalar_one_or_none()
            if tracking:
                await session.delete(tracking)
                
            await session.commit()
            print("Datos anteriores borrados.")

        print("Creando Proyecto LYRA...")

        # 2. Insert ProjectModel
        project = ProjectModel(
            id=project_id,
            name="LYRA CARSAN",
            code="OE-2000",
            description="Proyecto Lyra - Instalación de sistemas eléctricos",
            client_name="CARSAN",
            start_date=date(2026, 5, 1),  # Mayo 2026
            estimated_end_date=date(2027, 10, 31),  # 18 meses después
            total_budget=0.00,  # Será calculado desde Excel
            currency="USD",
            status="planning",
            project_manager="N/A",
        )
        session.add(project)
        await session.flush()
        print(f"Proyecto {project.name} (Code: {project.code}) guardado en 'projects'.")

        # 3. Insert ProjectTrackingModel (Seguimiento)
        tracking = ProjectTrackingModel(
            id=project_id,
            group="CARSAN",
            nombre_proyecto="LYRA CARSAN",
            codigo_proyecto="OE-2000",
            cliente="CARSAN",
            director_proyectos="N/A",
            alcance="Instalación de sistemas eléctricos",
            valor_original_contrato=0.00,  # Será calculado desde Excel
            valor_actual_contrato=0.00,
            fecha_inicio="05/01/2026",
            estado_facturacion_ordenes="Pendiente / Carga de Flujo de Caja"
        )
        session.add(tracking)
        await session.flush()
        print(f"Proyecto añadido a 'project_tracking' (Grupo: CARSAN).")

        # 4. Insert BusinessCaseModel (será actualizado después de cargar Excel)
        business_case = BusinessCaseModel(
            project_id=project_id,
            scenario_active="USD1",  # Operación en USD directos
            valor_oferta_total=0.0,  # Será calculado desde Excel
            costo_total_sin_fin=0.0,
            costo_total_con_fin=0.0,
            margen_bruto_valor=0.0,
            margen_bruto_pct=0.0,
            administracion_valor=0.0,
            financiacion_valor=0.0,
            usd_rate=1.0  # USD directo, sin conversión
        )
        session.add(business_case)
        await session.flush()
        print(f"Caso de Negocio base creado en 'business_case'.")

        # 5. Insert WBS & Budget Items (Costos Detallados)
        budget_data = [
            ("Electrical Work", 3640061.00),
            ("BDA System", 96620.00),
            ("Fire Alarm System", 153752.00),
            ("Lighting Fixtures", 293877.00),
        ]

        wbs_items = []
        for i, (name, amount) in enumerate(budget_data):
            code_str = str(i + 1) + ".0"
            wbs = WBSItemModel(
                project_id=project_id,
                code=code_str,
                name=name,
                level="chapter",
                planned_start_date=date(2026, 3, 10),
                planned_end_date=date(2027, 3, 10),
                weight=1.0,
                status="planning"
            )
            session.add(wbs)
            wbs_items.append(wbs)
        
        await session.flush()
        
        for i, (name, amount) in enumerate(budget_data):
            code_str = str(i + 1)
            budget = BudgetItemModel(
                project_id=project_id,
                wbs_item_id=wbs_items[i].id,
                code=code_str,
                description=name,
                category="electrical",
                cost_type="direct",
                original_amount=amount,
                actual_amount=0.00,
                committed_amount=0.00
            )
            session.add(budget)

        await session.flush()
        print(f"{len(budget_data)} items de presupuesto (wbs + budget_items) creados.")

        # 6. Insert ActivityLogModel (Auditoria)
        log = ActivityLogModel(
            user_id="admin_id",
            user_name="Administrador",
            user_role="admin",
            module="Proyectos",
            page="Creación",
            action="Proyecto LYRA creado",
            project_id=project_id,
            target_link=f"/projects/{project_id}"
        )
        session.add(log)
        await session.flush()
        print(f"Auditoria: Evento 'Proyecto LYRA creado' registrado en 'activity_logs'.")

        # Commit final
        await session.commit()
        print("\nCARGA COMPLETA Y EXITOSA: Proyecto LYRA (CARSAN) persistido correctamente en MySQL.")


if __name__ == "__main__":
    asyncio.run(seed_lyra())
