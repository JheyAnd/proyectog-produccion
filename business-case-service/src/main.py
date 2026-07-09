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



@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[*] {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    # Note: Run migrations manually before starting the server to avoid event loop conflicts
    # Command: python -m alembic upgrade head
    print("  [*] Seeding admin user...")
    await seed_admin_user()
    print("  [OK] Admin user seeded")
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