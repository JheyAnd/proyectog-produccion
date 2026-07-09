import asyncio
import sys
import os

# Añadir el directorio src al path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from src.infrastructure.database.session import engine
from src.infrastructure.database.models import Base
# Importar el modelo para que Base lo reconozca
from src.infrastructure.database.models.project_pending_model import ProjectPendingModel

async def create_tables():
    print("[*] Creando tabla project_pendings en MySQL...")
    try:
        async with engine.begin() as conn:
            # create_all es síncrono, usamos run_sync
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Tabla creada exitosamente.")
    except Exception as e:
        print(f"[ERROR] Error al crear la tabla: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())
