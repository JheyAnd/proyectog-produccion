"""Authentication dependencies for FastAPI route protection."""
from typing import Optional, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import decode_access_token
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.session import get_db_session

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> Optional[UserModel]:
    """Versión opcional: NO falla si no hay token. Útil para endpoints públicos
    o que solo quieren saber el user para auditoría pero no requieren auth estricta."""
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    email = payload.get("email")
    user: Optional[UserModel] = None
    if email:
        result = await db.execute(select(UserModel).where(UserModel.email == email))
        user = result.scalar_one_or_none()
    if not user:
        user_id = payload.get("sub")
        if user_id:
            result = await db.execute(select(UserModel).where(UserModel.id == user_id))
            user = result.scalar_one_or_none()
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> UserModel:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticacion requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Buscar por email primero
    email = payload.get("email")
    user: Optional[UserModel] = None

    if email:
        result = await db.execute(select(UserModel).where(UserModel.email == email))
        user = result.scalar_one_or_none()

    # Fallback: buscar por sub (UUID local)
    if not user:
        user_id = payload.get("sub")
        if user_id:
            result = await db.execute(select(UserModel).where(UserModel.id == user_id))
            user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado en la base de datos local",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    return user


def require_role(*allowed_roles: str) -> Callable:
    """
    Dependency que exige uno de los roles indicados.
    El rol 'administrador' siempre tiene acceso (bypass total).
    """
    async def role_checker(
        current_user: UserModel = Depends(get_current_user),
    ) -> UserModel:
        # administrador tiene acceso a todo
        if current_user.role == "administrador":
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere rol: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker
