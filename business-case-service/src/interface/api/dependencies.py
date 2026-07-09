from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.repositories.sql_user_repository import SQLUserRepository
from src.application.services.user_service import UserService

def get_user_service(session: AsyncSession = Depends(get_db_session)) -> UserService:
    """Dependency que inyecta la sesión de DB en el repositorio y retorna el servicio."""
    repository = SQLUserRepository(session)
    return UserService(user_repository=repository)
