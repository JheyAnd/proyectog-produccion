import asyncio
from sqlalchemy import text
from src.infrastructure.database.session import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text('SELECT project_id, valor_oferta_total FROM business_case'))
        print(res.fetchall())

asyncio.run(main())
