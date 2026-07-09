# -*- coding: utf-8 -*-
import asyncio
import json
import os
import sys

if sys.platform == 'win32':
    os.system('chcp 65001 >nul')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.infrastructure.database.session import AsyncSessionLocal
from sqlalchemy import text

async def fix_groups():
    json_path_tracking = r'c:\Users\Jheyson\Documents\GitHub\Proyectog-restructuring\frontend\src\data\projectsTrackingData.json'
    json_path_solar = r'c:\Users\Jheyson\Documents\GitHub\Proyectog-restructuring\frontend\src\data\projectsSolarData.json'
    
    pcm_ids = []
    if os.path.exists(json_path_tracking):
        with open(json_path_tracking, 'r', encoding='utf-8') as f:
            data = json.load(f)
            pcm_ids = [d.get('id') for d in data if d.get('id')]
            # Add patio sur specifically
            pcm_ids.append('patio-sur-oe1035')
            
    pcs_ids = []
    if os.path.exists(json_path_solar):
        with open(json_path_solar, 'r', encoding='utf-8') as f:
            data = json.load(f)
            pcs_ids = [d.get('id') for d in data if d.get('id')]
            
    async with AsyncSessionLocal() as session:
        if pcm_ids:
            # We can also do it by codigo_proyecto if id changed
            # But the script generated uuids, let's just do an UPDATE on everything.
            # Wait, the seed script used `id=p.get('id', uuid)` so the ids should match.
            
            # Update all to PCM first as a fallback
            await session.execute(text("UPDATE project_tracking SET `group` = 'PCM'"))
            
            for pid in pcs_ids:
                # the insert was matching by code
                # But it also kept original IDs. We'll update by id.
                await session.execute(text("UPDATE project_tracking SET `group` = 'PCS' WHERE id = :pid"), {"pid": pid})
                
        await session.commit()
        print('Groups updated!')

if __name__ == '__main__':
    asyncio.run(fix_groups())
