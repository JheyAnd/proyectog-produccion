"""Async SQLAlchemy database session management."""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.config import get_settings

settings = get_settings()

# Engine args for MySQL
_engine_kwargs: dict = {"echo": settings.DATABASE_ECHO}

if settings.DATABASE_URL.startswith("mysql") or settings.DATABASE_URL.startswith("postgresql"):
    # PROD: Use connection pool
    _engine_kwargs.update(pool_size=20, max_overflow=40, pool_pre_ping=True)
else:
    # Allow SQLite database connections for local development and offline testing
    # check_same_thread is required for SQLite in multithreaded environments
    _engine_kwargs.update(connect_args={"check_same_thread": False})

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncSession:
    """Dependency: yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
