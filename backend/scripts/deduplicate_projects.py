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
from sqlalchemy import text

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

async def reset_and_seed():
    json_path_tracking = r'c:\Users\Jheyson\Documents\GitHub\Proyectog-restructuring\frontend\src\data\projectsTrackingData.json'
    json_path_solar = r'c:\Users\Jheyson\Documents\GitHub\Proyectog-restructuring\frontend\src\data\projectsSolarData.json'
    
    pcm_data = []
    pcs_data = []
    
    if os.path.exists(json_path_tracking):
        with open(json_path_tracking, 'r', encoding='utf-8') as f:
            pcm_data.extend(json.load(f))
            
    if os.path.exists(json_path_solar):
        with open(json_path_solar, 'r', encoding='utf-8') as f:
            pcs_data.extend(json.load(f))
            
    # We will deduplicate by a combination of normalized code and name
    def get_key(p):
        code = str(p.get('codigo_proyecto') or '').strip().upper()
        name = str(p.get('nombre_proyecto') or p.get('sheet_name') or '').strip().upper()
        if code and code != 'N/A' and code != 'NONE':
            return code
        return name

    unique_projects = {}
    
    # Process tracking (PCM) first
    for p in pcm_data:
        key = get_key(p)
        p['calculated_group'] = 'PCM'
        
        if key not in unique_projects:
            unique_projects[key] = p
        else:
            # If it's already there, we keep the one that seems more complete
            # or just skip. The user wants deduplication.
            pass
            
    # Process solar (PCS) second. If it's already in PCM, we override its group to PCS?
    # Because if it's solar, it probably belongs to PC Solar.
    for p in pcs_data:
        key = get_key(p)
        p['calculated_group'] = 'PCS'
        
        if key not in unique_projects:
            unique_projects[key] = p
        else:
            # Override group to PCS if it exists
            unique_projects[key]['calculated_group'] = 'PCS'
            
    # And Patio Sur which we manually added in the past:
    # Let's add it if not present
    if 'OE1035' not in unique_projects:
        unique_projects['OE1035'] = {
            'nombre_proyecto': 'PATIO SUR',
            'codigo_proyecto': 'OE1035',
            'calculated_group': 'PCM'
        }

    print(f"Total unique projects: {len(unique_projects)}")
    
    async with AsyncSessionLocal() as session:
        # Clear existing
        await session.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        await session.execute(text("TRUNCATE TABLE project_tracking"))
        await session.execute(text("TRUNCATE TABLE projects"))
        
        count = 0
        for key, p in unique_projects.items():
            pid = str(uuid.uuid4())
            name = str(p.get('nombre_proyecto') or p.get('sheet_name') or 'Untitled')[:190]
            code = str(p.get('codigo_proyecto') or key)[:45]
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
                group=p['calculated_group']
            )
            session.add(trk)
            count += 1
            
        await session.commit()
        await session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        print(f'Done seeding {count} unique projects!')

if __name__ == '__main__':
    asyncio.run(reset_and_seed())
