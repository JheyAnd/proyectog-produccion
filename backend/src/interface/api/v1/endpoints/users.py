from typing import Dict, Any
from fastapi import APIRouter, Depends

from src.infrastructure.security.pandora_middleware import get_current_user
from src.interface.api.dependencies import get_user_service
from src.application.services.user_service import UserService

router = APIRouter()

@router.get("/me")
async def get_my_profile(
    payload: Dict[str, Any] = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """
    Obtiene el perfil del usuario actual.
    La autenticación es delegada ciegamente a Pandora mediante el token JWT.
    Este endpoint sincroniza la base de datos local con los claims del token.
    """
    user = await user_service.sync_user_from_pandora(payload)
    return user
