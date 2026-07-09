# -*- coding: utf-8 -*-
import asyncio
import json
import uuid
import sys
import os
from datetime import datetime, date

if sys.platform == 'win32':
    os.system('chcp 65001 >nul')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.infrastructure.database.session import AsyncSessionLocal
from src.infrastructure.database.models import ProjectModel, ProjectTrackingModel
from sqlalchemy import select, text

def parse_date(d_str):
    if not d_str:
        return None
    try:
        if isinstance(d_str, str) and 'T' in d_str:
            return datetime.strptime(d_str.split('T')[0], '%Y-%m-%d').date()
        return datetime.strptime(str(d_str), '%Y-%m-%d').date()
    except Exception:
        return None

def parse_decimal(d):
    if d is None:
        return 0.0
    try:
        if isinstance(d, str):
            d = d.replace(',', '')
        return float(d)
    except:
        return 0.0

async def seed_missing():
    json_path_solar = r'c:\Users\Jheyson\Documents\GitHub\Proyectog-restructuring\frontend\src\data\projectsSolarData.json'
    
    projects_data = []
    if os.path.exists(json_path_solar):
        with open(json_path_solar, 'r', encoding='utf-8') as f:
            projects_data.extend(json.load(f))
            
    async with AsyncSessionLocal() as session:
        await session.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        
        count = 0
        added_codes = set()
        
        # Load existing codes
        existing_codes_res = await session.execute(select(ProjectModel.code))
        for row in existing_codes_res:
            added_codes.add(row[0])
            
        for p in projects_data:
            pid = str(p.get('id', uuid.uuid4()))
            name = str(p.get('nombre_proyecto') or p.get('sheet_name') or 'Untitled')[:190]
            base_code = str(p.get('codigo_proyecto') or pid)[:45]
            
            # Make sure code is unique
            code = base_code
            suffix = 1
            while code in added_codes:
                # If the same id is already in the db, we skip it completely unless we really want it
                existing_id = await session.execute(select(ProjectModel).where(ProjectModel.id == pid))
                if existing_id.scalar_one_or_none():
                    break
                code = f"{base_code}-{suffix}"
                suffix += 1
            else:
                client = str(p.get('cliente') or 'Desconocido')[:190]
                
                project = ProjectModel(
                    id=pid,
                    name=name,
                    code=code,
                    description=str(p.get('alcance', ''))[:500],
                    client_name=client,
                    start_date=parse_date(p.get('fecha_inicio')) or date.today(),
                    estimated_end_date=parse_date(p.get('fecha_finalizacion_contractual')) or date.today(),
                    total_budget=parse_decimal(p.get('valor_original_contrato')),
                    currency='COP',
                    status='in_progress',
                    project_manager=str(p.get('director_proyectos', 'N/A'))[:190],
                    location=str(p.get('localizacion', ''))[:100],
                    company_id=None
                )
                session.add(project)
                print(f'Added Missing Project: {name} ({code})')
                
                await session.flush()
                added_codes.add(code)
                
                trk = ProjectTrackingModel(
                    id=pid,
                    project_id=pid,
                    nombre_proyecto=name,
                    codigo_proyecto=code,
                    cliente=client,
                    director_proyectos=str(p.get('director_proyectos', ''))[:50],
                    alcance=str(p.get('alcance', ''))[:500],
                    valor_original_contrato=parse_decimal(p.get('valor_original_contrato')),
                    valor_actual_contrato=parse_decimal(p.get('valor_actual_contrato')),
                    fecha_inicio=str(p.get('fecha_inicio', ''))[:30],
                    fecha_finalizacion_contractual=str(p.get('fecha_finalizacion_contractual', ''))[:30],
                    estado_facturacion_ordenes=str(p.get('estado_facturacion_ordenes', ''))[:200],
                    group='PCS'
                )
                session.add(trk)
                count += 1
        
        await session.commit()
        await session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        print(f'Done seeding {count} missing projects!')

if __name__ == '__main__':
    asyncio.run(seed_missing())
