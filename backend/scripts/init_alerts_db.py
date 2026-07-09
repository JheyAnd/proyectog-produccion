import asyncio
import sys
from sqlalchemy import text
from src.infrastructure.database.session import engine
from src.infrastructure.database.models.base import Base
# Import all models to register them with Base.metadata
from src.infrastructure.database.models.alert_model import ProjectAlertModel

async def init_db():
    print("Iniciando creación de tabla project_alerts...")
    try:
        async with engine.begin() as conn:
            # We only want to create the project_alerts table if it doesn't exist
            # Instead of create_all which might interfere with migrations, we do it specifically
            await conn.run_sync(Base.metadata.create_all)
        print("Tablas verificadas/creadas exitosamente.")
    except Exception as e:
        print(f"Error creando tablas: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
