from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.user import User
from src.domain.repositories.user_repository import UserRepository
from src.infrastructure.database.models.user_model import UserModel

class SQLUserRepository(UserRepository):
    """Implementación SQLAlchemy del repositorio de usuarios."""
    
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_entity(self, model: UserModel) -> User:
        """Mapeador explícito de ORM a Entidad Pura."""
        return User(
            id=model.id,
            email=model.email,
            full_name=model.full_name,
            role=model.role,
            is_active=model.is_active,
            allowed_directors=model.allowed_directors,
            allowed_projects=model.allowed_projects,
            module_features=model.module_features
        )

    def _to_model(self, entity: User) -> UserModel:
        """Mapeador explícito de Entidad Pura a ORM."""
        return UserModel(
            id=entity.id,
            email=entity.email,
            full_name=entity.full_name,
            role=entity.role,
            is_active=entity.is_active,
            allowed_directors=entity.allowed_directors,
            allowed_projects=entity.allowed_projects,
            module_features=entity.module_features
        )

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        if model:
            return self._to_entity(model)
        return None

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        if model:
            return self._to_entity(model)
        return None

    async def get_all(self) -> list[User]:
        result = await self._session.execute(select(UserModel))
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    async def save(self, user: User) -> User:
        # Buscamos si ya existe para hacer update, sino insert.
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user.id)
        )
        existing_model = result.scalar_one_or_none()
        
        if existing_model:
            existing_model.email = user.email
            existing_model.full_name = user.full_name
            existing_model.role = user.role
            existing_model.is_active = user.is_active
            existing_model.allowed_directors = user.allowed_directors
            existing_model.allowed_projects = user.allowed_projects
            existing_model.module_features = user.module_features
        else:
            new_model = self._to_model(user)
            self._session.add(new_model)
            
        await self._session.commit()
        return user
