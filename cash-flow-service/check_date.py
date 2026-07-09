import asyncio
import os
import sys

sys.path.append(os.getcwd())
from sqlalchemy import text
from src.infrastructure.database.session import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, name, start_date FROM projects WHERE id='79af0de2-3684-48f6-8641-1c02b21831e7'"))
        for row in res.mappings().all():
            print(dict(row))

if __name__ == "__main__":
    asyncio.run(main())
