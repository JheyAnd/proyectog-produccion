from abc import ABC, abstractmethod
from typing import Optional
from src.domain.entities.user import User

class UserRepository(ABC):
    """Interfaz del Repositorio de Usuarios."""
    
    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_all(self) -> list[User]:
        pass

    @abstractmethod
    async def save(self, user: User) -> User:
        pass
