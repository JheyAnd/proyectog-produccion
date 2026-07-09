"""
Patio Sur - Project Management Application
Main FastAPI application entry point.
"""
import asyncio
import os
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from src.core.config import get_settings
from src.infrastructure.database.models import UserModel
from src.infrastructure.database.session import AsyncSessionLocal, engine
from src.interface.api.v1.router import api_v1_router
from src.interface.api.v1.middlewares.audit_middleware import ActivityAuditMiddleware
from src.socket_manager import socket_app

settings = get_settings()
_migration_executor = ThreadPoolExecutor(max_workers=1)


def _run_migrations_sync():
    """Run Alembic migrations synchronously (called from a thread)."""
    import os
    # Get the backend directory (where alembic.ini lives)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_ini_path = os.path.join(backend_dir, "alembic.ini")
    alembic_cfg = Config(alembic_ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(alembic_cfg, "head")


async def run_migrations():
    """Apply any pending Alembic migrations at startup, in a thread to avoid event loop conflicts."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_migration_executor, _run_migrations_sync)


async def seed_admin_user():
    pass


async def run_history_migration():
    """Migra los registros históricos vacíos de fecha_informe usando cronograma_cortes."""
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                # Obtener registros con fecha_informe nula o vacía
                res = await session.execute(text(
                    "SELECT history_id, tracking_id, semana, project_id, fecha_informe FROM project_tracking_history "
                    "WHERE fecha_informe IS NULL OR fecha_informe = ''"
                ))
                rows = res.fetchall()
                if not rows:
                    print("  [OK] No history records need fecha_informe migration")
                    return
                
                print(f"  [*] Found {len(rows)} history records to migrate fecha_informe...")
                migrated = 0
                for history_id, tracking_id, semana_str, project_id, _ in rows:
                    # Intentar obtener el número de semana
                    try:
                        if isinstance(semana_str, str) and semana_str.startswith('S-'):
                            semana_num = int(semana_str.replace('S-', ''))
                        else:
                            semana_num = int(semana_str)
                    except Exception:
                        continue
                    
                    # Buscar en cronograma_cortes la fecha de corte para este proyecto y semana
                    corte_res = await session.execute(text(
                        "SELECT fecha_corte FROM cronograma_cortes "
                        "WHERE project_id = :project_id AND semana = :semana LIMIT 1"
                    ), {"project_id": project_id, "semana": semana_num})
                    corte_date = corte_res.scalar()
                    if corte_date:
                        # Actualizar la fecha_informe en project_tracking_history
                        await session.execute(text(
                            "UPDATE project_tracking_history SET fecha_informe = :fecha_informe "
                            "WHERE history_id = :history_id"
                        ), {"fecha_informe": str(corte_date), "history_id": history_id})
                        migrated += 1
                
                print(f"  [OK] Migrated {migrated} history records with dates from cronograma_cortes")
    except Exception as e:
        print(f"  [ERROR] History migration failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[*] {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    # Note: Run migrations manually before starting the server to avoid event loop conflicts
    # Command: python -m alembic upgrade head
    print("  [*] Seeding admin user...")
    await seed_admin_user()
    print("  [OK] Admin user seeded")
    print("  [*] Running database history date migration...")
    await run_history_migration()
    yield
    print("[*] Application shutting down...")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema de Gestión de Proyectos de Obra Eléctrica - Control Financiero y Operativo",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auditoría de Actividades (Centralizado)
app.add_middleware(ActivityAuditMiddleware)

# API Routes
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

# Socket.io - mount at /socket.io
app.mount("/socket.io", socket_app)

# Servir archivos estáticos (Imágenes de perfil, etc.)
os.makedirs("storage", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}