import asyncio
import json
import os
import uuid
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, delete, insert

DATABASE_URL = "mysql+aiomysql://root:SessionsAdmin159**@192.168.10.153:3306/proyectog-prueba"

PROJECT_ID = "patio-sur-oe1035"

BAC_PATIO_SUR = Decimal("41012884481")
CONTRATO_PATIO_SUR = Decimal("32400000000")
EAC_SIN_FIN_PATIO_SUR = Decimal("28082164388")
COMPROMETIDO_PATIO_SUR = Decimal("13159418623")
PENDIENTE_NEGOCIAR_PATIO_SUR = Decimal("11132000000")
AHORRO_COMPRAS_PATIO_SUR = Decimal("3790285190")
TOTAL_PAGADO_PATIO_SUR = Decimal("9943379508")
AC_MATERIALES_PATIO_SUR = Decimal("7763569503")
AC_ADMINISTRATIVO_PATIO_SUR = Decimal("500000000")
AC_OTROS_PATIO_SUR = Decimal("478000000")
EAC_CON_FIN_PATIO_SUR = Decimal("29457164387")
EAC_MATERIALES_PATIO_SUR = Decimal("21511513454")
EAC_MANO_OBRA_PATIO_SUR = Decimal("1681443883")
EAC_ADMINISTRATIVO_PATIO_SUR = Decimal("772769364")
EAC_INTERESES_CREDITO_PATIO_SUR = Decimal("3158392500")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Read cronograma
    frontend_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend')
    with open(os.path.join(frontend_dir, 'cronograma_seed.json'), 'r', encoding='utf-8') as f:
        cronograma = json.load(f)
    
    async with async_session() as session:
        # Check if project exists
        res = await session.execute(text("SELECT id FROM projects WHERE id = :pid"), {"pid": PROJECT_ID})
        if not res.scalar():
            # Create project if missing
            await session.execute(text("""
                INSERT INTO projects (id, name, code, is_active, created_at, updated_at)
                VALUES (:pid, 'Patio de Operación Sur', 'OE1035', 1, NOW(), NOW())
            """), {"pid": PROJECT_ID})

        # CREATE A WBS ITEM AS PARENT FOR BUDGET ITEMS
        wbs_res = await session.execute(text("SELECT id FROM wbs_items WHERE project_id = :pid LIMIT 1"), {"pid": PROJECT_ID})
        wbs_id = wbs_res.scalar()
        if not wbs_id:
            wbs_id = str(uuid.uuid4())
            await session.execute(text("""
                INSERT INTO wbs_items (id, project_id, name, code, level, planned_progress, actual_progress, weight, status, sort_order, created_at, updated_at)
                VALUES (:wid, :pid, 'Raiz Patio Sur', 'WBS-01', '1', 0, 0, 1, 'not_started', 0, NOW(), NOW())
            """), {"wid": wbs_id, "pid": PROJECT_ID})

        # CLEAR OLD DATA
        await session.execute(text("DELETE FROM budget_items WHERE project_id = :pid"), {"pid": PROJECT_ID})
        await session.execute(text("DELETE FROM cronograma_actividades WHERE project_id = :pid"), {"pid": PROJECT_ID})
        await session.execute(text("DELETE FROM cronograma_cortes WHERE project_id = :pid"), {"pid": PROJECT_ID})
        
        # INSERT BUDGET ITEMS
        # We map BAC as "materials" (or standard category) and EAC to their specific ones.
        budget_inserts = [
            # BAC Item
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "BAC", "description": "BAC Patio Sur", "category": "materials", "cost_type": "direct", "original_amount": BAC_PATIO_SUR, "approved_changes": 0, "actual_amount": TOTAL_PAGADO_PATIO_SUR, "committed_amount": COMPROMETIDO_PATIO_SUR},
            
            # EAC Items
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "EAC_SF", "description": "EAC Sin Financiacion", "category": "eac_sin_fin", "cost_type": "direct", "original_amount": EAC_SIN_FIN_PATIO_SUR, "approved_changes": 0, "actual_amount": 0, "committed_amount": 0},
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "EAC_CF", "description": "EAC Con Financiacion", "category": "eac_con_fin", "cost_type": "direct", "original_amount": EAC_CON_FIN_PATIO_SUR, "approved_changes": 0, "actual_amount": 0, "committed_amount": 0},
            
            # AC Breakdown Items
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "AC_MAT", "description": "AC Materiales", "category": "ac_materiales", "cost_type": "direct", "original_amount": 0, "approved_changes": 0, "actual_amount": AC_MATERIALES_PATIO_SUR, "committed_amount": 0},
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "AC_ADM", "description": "AC Administrativo", "category": "ac_administrativo", "cost_type": "indirect", "original_amount": 0, "approved_changes": 0, "actual_amount": AC_ADMINISTRATIVO_PATIO_SUR, "committed_amount": 0},
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "AC_OTR", "description": "AC Otros", "category": "ac_otros", "cost_type": "indirect", "original_amount": 0, "approved_changes": 0, "actual_amount": AC_OTROS_PATIO_SUR, "committed_amount": 0},
            
            # EAC Breakdown Items
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "EAC_MAT", "description": "EAC Materiales", "category": "eac_materiales", "cost_type": "direct", "original_amount": EAC_MATERIALES_PATIO_SUR, "approved_changes": 0, "actual_amount": 0, "committed_amount": 0},
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "EAC_MO", "description": "EAC Mano de Obra", "category": "eac_mano_obra", "cost_type": "direct", "original_amount": EAC_MANO_OBRA_PATIO_SUR, "approved_changes": 0, "actual_amount": 0, "committed_amount": 0},
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "EAC_ADM", "description": "EAC Administrativo", "category": "eac_administrativo", "cost_type": "indirect", "original_amount": EAC_ADMINISTRATIVO_PATIO_SUR, "approved_changes": 0, "actual_amount": 0, "committed_amount": 0},
            {"id": str(uuid.uuid4()), "project_id": PROJECT_ID, "wbs_item_id": wbs_id, "code": "EAC_INT", "description": "EAC Intereses", "category": "eac_intereses", "cost_type": "indirect", "original_amount": EAC_INTERESES_CREDITO_PATIO_SUR, "approved_changes": 0, "actual_amount": 0, "committed_amount": 0},
        ]
        
        for b in budget_inserts:
            await session.execute(text("""
                INSERT INTO budget_items (id, project_id, wbs_item_id, code, description, category, cost_type, original_amount, approved_changes, committed_amount, actual_amount, quantity, unit_price, created_at, updated_at)
                VALUES (:id, :project_id, :wbs_item_id, :code, :description, :category, :cost_type, :original_amount, :approved_changes, :committed_amount, :actual_amount, 1, 0, NOW(), NOW())
            """), b)

        # INSERT CRONOGRAMA
        def flatten_cronograma(activities, parent_id=None):
            flat = []
            for act in activities:
                # act = {code, name, peso, inicio, fin, duracion, avanceProg, avanceReal, children}
                act_id = str(uuid.uuid4())
                try:
                    start_date = datetime.strptime(act['inicio'], '%Y-%m-%d')
                    end_date = datetime.strptime(act['fin'], '%Y-%m-%d')
                except:
                    start_date = None
                    end_date = None

                flat.append({
                    "id": act_id,
                    "project_id": PROJECT_ID,
                    "wbs_code": act.get("code", "")[:50],
                    "nombre_tarea": act.get("name", "")[:500],
                    "peso": act.get("peso", 0.0),
                    "fecha_inicio": start_date,
                    "fecha_fin": end_date,
                    "duracion_dias": int(act.get("duracion", "0").split(" ")[0]) if "duracion" in act else 0
                })
                if 'children' in act and isinstance(act['children'], list):
                    flat.extend(flatten_cronograma(act['children'], act_id))
            return flat

        flat_activities = flatten_cronograma(cronograma)
        for act in flat_activities:
            if not act["fecha_inicio"] or not act["fecha_fin"]: continue
            await session.execute(text("""
                INSERT INTO cronograma_actividades 
                (id, project_id, wbs_code, nombre_tarea, peso, fecha_inicio, fecha_fin, duracion_dias, created_at)
                VALUES 
                (:id, :project_id, :wbs_code, :nombre_tarea, :peso, :fecha_inicio, :fecha_fin, :duracion_dias, NOW())
            """), act)

        # Let's add a corte for EVM (SPI/CPI)
        # Week 52 has 93.9% planned and 73.2% real to yield SPI = 0.78
        corte_id = str(uuid.uuid4())
        await session.execute(text("""
            INSERT INTO cronograma_cortes (project_id, semana, fecha_corte, avance_planeado, avance_ejecutado, origen, created_at, updated_at)
            VALUES (:project_id, 52, NOW(), 93.90, 73.20, 'historico', NOW(), NOW())
        """), {"project_id": PROJECT_ID})

        await session.commit()
        print("Data seeded successfully for Patio Sur.")

if __name__ == "__main__":
    asyncio.run(main())
