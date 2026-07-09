import asyncio
import httpx
import os
import sys

sys.path.append(os.getcwd())
from sqlalchemy import text
from src.infrastructure.database.session import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT nombre_original, archivo FROM project_files WHERE project_id='79af0de2-3684-48f6-8641-1c02b21831e7' AND categoria='flujo_caja' ORDER BY created_at DESC LIMIT 1"))
        row = res.mappings().first()
        if not row:
            print("No file found in DB")
            return
            
        filename = row['nombre_original']
        file_bytes = row['archivo']
        
        print(f"File found: {filename}, size: {len(file_bytes)} bytes")
        
        files_dict = {'file': (filename, file_bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = httpx.post(
            "http://127.0.0.1:8018/api/v1/v2/projects/79af0de2-3684-48f6-8641-1c02b21831e7/cash-flow/import-excel",
            files=files_dict
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    asyncio.run(main())
