import asyncio
import json
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "mysql+aiomysql://root:SessionsAdmin159**@192.168.10.153:3306/proyectog-prueba"

async def main():
    engine = create_async_engine(DATABASE_URL)
    
    seed_file_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "projects_seed.json")
    
    with open(seed_file_path, "r", encoding="utf-8") as f:
        projects = json.load(f)
        
    print(f"Loaded {len(projects)} projects from seed file.")
    
    async with engine.begin() as conn:
        for p in projects:
            # We want to insert this project into the projects table if it doesn't exist.
            # ID in frontend is 'excel-...' but the user says the ID is jv048.
            # Wait, in the seed file:
            # id="excel-...", code="JV048". 
            # In the user's screenshot, it said: Proyecto 'jv048' no encontrado.
            # This means the project_id passed to the backend was literally 'jv048', which is the 'code' but lowercased, or maybe the id is just 'jv048' in the new format?
            
            # Let's check the projects table schema first before inserting.
            pass

    async with engine.connect() as conn:
        res = await conn.execute(text("DESCRIBE projects"))
        rows = res.fetchall()
        for r in rows:
            print(r)

if __name__ == "__main__":
    asyncio.run(main())
