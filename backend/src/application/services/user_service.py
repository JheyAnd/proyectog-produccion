from typing import Dict, Any
from src.domain.entities.user import User
from src.domain.repositories.user_repository import UserRepository

class UserService:
    """Caso de uso y lógica de negocio central para los usuarios."""
    
    def __init__(self, user_repository: UserRepository):
        self._user_repository = user_repository

    async def sync_user_from_pandora(self, pandora_payload: Dict[str, Any]) -> User:
        """
        Sincroniza un usuario con los datos provistos por el token de Pandora.
        Verifica que el usuario exista en la base de datos local para autorizar el acceso.
        """
        user_id = pandora_payload.get("sub") or pandora_payload.get("id") or pandora_payload.get("oid")
        email = pandora_payload.get("email") or pandora_payload.get("upn") or pandora_payload.get("preferred_username")
        full_name = pandora_payload.get("name") or pandora_payload.get("full_name") or "Usuario Pandora"
        
        if not email:
            raise ValueError("El payload de Pandora es inválido. Falta el campo 'email', 'upn' o 'preferred_username'.")
            
        email = email.lower().strip()
            
        # 1. Buscamos por email (ya que el administrador ingresa el email al crear el usuario)
        user = await self._user_repository.get_by_email(email)
        
        # 2. Alternativa: buscar por ID si ya está previamente enlazado
        if not user and user_id:
            user = await self._user_repository.get_by_id(user_id)
            
        if not user:
            # Si no existe en la base de datos local, se le niega el acceso al sistema
            raise ValueError("Lo siento, tus credenciales son invalidas o no tienes acceso.")
            
        # Sincronizamos campos pero mantenemos el ROL local como fuente de verdad
        needs_update = False
        if user.email != email:
            user.email = email
            needs_update = True
            
        if email in ['jheisonandres03@gmail.com', 'jehisonandres03@gmail.com']:
            if user.full_name != "Daniel Jose Quevedo":
                user.full_name = "Daniel Jose Quevedo"
                needs_update = True
        elif user.full_name != full_name and full_name != "Usuario Pandora":
            user.full_name = full_name
            needs_update = True
            
        # Nota: El rol local no se sobreescribe con el del token.
        
        if needs_update:
            user = await self._user_repository.save(user)
            
        return user
