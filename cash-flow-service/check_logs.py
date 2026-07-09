import asyncio
import os
import sys

sys.path.append(os.getcwd())
from sqlalchemy import text
from src.infrastructure.database.session import engine

async def main():
    async with engine.begin() as conn:
        print("Checking import logs:")
        res = await conn.execute(text("SELECT * FROM cash_flow_import_log ORDER BY imported_at DESC LIMIT 5"))
        for row in res.mappings().all():
            print(dict(row))
            
        print("\nChecking categories for 79af0de2-3684-48f6-8641-1c02b21831e7:")
        res = await conn.execute(text("SELECT count(*) as cnt FROM egreso_categorias WHERE project_id='79af0de2-3684-48f6-8641-1c02b21831e7'"))
        print("Count:", res.mappings().all())

if __name__ == "__main__":
    asyncio.run(main())
