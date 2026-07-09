import httpx
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import Response as FastAPIResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Dict, Any, Optional
from sqlalchemy import delete

from src.core.config import get_settings
from src.core.security import decode_access_token
from src.interface.api.dependencies import get_user_service
from src.application.services.user_service import UserService
from src.infrastructure.database.models.user_model import UserModel

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)
settings = get_settings()

class LoginRequest(BaseModel):
    email: str
    password: str

class ValidateTokenRequest(BaseModel):
    token: str

class UserCreateRequest(BaseModel):
    email: str
    full_name: str
    role: str

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    allowed_directors: Optional[str] = None
    allowed_projects: Optional[str] = None
    module_features: Optional[str] = None

def map_user_response(user):
    import json
    
    allowed_directors = user.allowed_directors
    if allowed_directors and allowed_directors != "ALL":
        try:
            allowed_directors = json.loads(allowed_directors)
        except:
            pass
            
    allowed_projects = user.allowed_projects
    if allowed_projects and allowed_projects != "ALL":
        try:
            allowed_projects = json.loads(allowed_projects)
        except:
            pass
            
    module_features = user.module_features
    if module_features:
        try:
            module_features = json.loads(module_features)
        except:
            pass
            
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "allowed_directors": allowed_directors or "ALL",
        "allowed_projects": allowed_projects or "ALL",
        "module_features": module_features or {}
    }

@router.get("/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    user_service: UserService = Depends(get_user_service)
):
    """
    Verifica el token JWT guardado en el cliente y retorna los datos
    actualizados del usuario desde la base de datos local.
    Usado para verificación silenciosa de sesión al cargar la app.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    email = payload.get("email")
    user_id = payload.get("sub") or payload.get("id")
    
    # Buscar el usuario en la BD local por email o ID
    user = None
    if email:
        user = await user_service._user_repository.get_by_email(email)
    if not user and user_id:
        user = await user_service._user_repository.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lo siento, tus credenciales son invalidas o no tienes acceso."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta ha sido desactivada. Contacta al administrador."
        )
    
    return map_user_response(user)


@router.post("/login")
async def login(
    login_data: LoginRequest,
    user_service: UserService = Depends(get_user_service)
):
    """
    Momento 1 (Validación ROPC / Login Directo):
    Valida credenciales contra el microservicio y verifica si el usuario está registrado localmente.
    """
    # Verificar autorización local primero (Pre-check de existencia)
    email_clean = login_data.email.strip().lower()
    
    import datetime
    with open("debug_auth.log", "a", encoding="utf-8") as f:
        f.write(f"\n--- {datetime.datetime.now()} ---\n")
        f.write(f"Login attempt for email: {email_clean}\n")
        
    local_user = await user_service._user_repository.get_by_email(email_clean)
    if not local_user:
        with open("debug_auth.log", "a", encoding="utf-8") as f:
            f.write(f"Failed: User {email_clean} not found locally.\n")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lo siento, tus credenciales son invalidas o no tienes acceso."
        )

    url = f"{settings.AUTH_SERVICE_URL}/auth/piloto-login"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url,
                json={"email": login_data.email, "password": login_data.password},
                headers={"X-Auth-Secret": settings.AUTH_SERVICE_SECRET}
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"No se pudo conectar con el microservicio de autenticación: {str(e)}"
            )
            
    if response.status_code == 403:
        # MFA Required
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA_REQUIRED"
        )
    elif response.status_code != 200:
        try:
            err_json = response.json()
            detail = err_json.get("detail", "Error de autenticación")
        except:
            detail = response.text or "Error de autenticación"
        raise HTTPException(
            status_code=response.status_code,
            detail=detail
        )
        
    data = response.json()
    token = data.get("profile", {}).get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="El microservicio no retornó un token válido"
        )
        
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sesión inválido retornado por el microservicio"
        )
        
    try:
        user = await user_service.sync_user_from_pandora(payload)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al sincronizar el usuario en la BD local: {str(e)}"
        )
        
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": map_user_response(user)
    }

@router.post("/validate-token")
async def validate_token(
    validate_data: ValidateTokenRequest,
    user_service: UserService = Depends(get_user_service)
):
    import datetime
    with open("debug_auth.log", "a", encoding="utf-8") as f:
        f.write(f"\n--- {datetime.datetime.now()} ---\n")
        f.write(f"Token received: {validate_data.token[:20]}...\n")

    # Endpoint correcto en Pandora para validar un JWT de sesión (Cerberus) emitido por el SSO
    url = f"{settings.AUTH_SERVICE_URL}/api/v1/auth/verify"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url,
                json={"token": validate_data.token},
                headers={"X-Auth-Secret": settings.AUTH_SERVICE_SECRET}
            )
        except Exception as e:
            with open("debug_auth.log", "a", encoding="utf-8") as f:
                f.write(f"Connection exception: {e}\n")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"No se pudo conectar con el microservicio de autenticación: {str(e)}"
            )
            
    with open("debug_auth.log", "a", encoding="utf-8") as f:
        f.write(f"Pandora response status: {response.status_code}\n")
    
    if response.status_code != 200:
        with open("debug_auth.log", "a", encoding="utf-8") as f:
            f.write(f"Pandora response text: {response.text}\n")
        try:
            err_json = response.json()
            detail = err_json.get("detail", "Token de sesión de Pandora inválido")
        except:
            detail = response.text or "Token de sesión de Pandora inválido"
        raise HTTPException(
            status_code=response.status_code,
            detail=detail
        )
        
    data = response.json()
    # Pandora /api/v1/auth/verify returns {"valid": True, "user": decoded_payload}
    payload = data.get("user")
    
    if not data.get("valid") or not payload:
        with open("debug_auth.log", "a", encoding="utf-8") as f:
            f.write("Invalid response format from Pandora /verify\n")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sesión inválido retornado por el microservicio"
        )
        
    try:
        user = await user_service.sync_user_from_pandora(payload)
        with open("debug_auth.log", "a", encoding="utf-8") as f:
            f.write(f"User synced successfully: {user.email}\n")
    except ValueError as ve:
        with open("debug_auth.log", "a", encoding="utf-8") as f:
            f.write(f"sync_user_from_pandora ValueError: {ve} - Payload was: {payload}\n")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(ve)
        )
    except Exception as e:
        with open("debug_auth.log", "a", encoding="utf-8") as f:
            f.write(f"sync_user_from_pandora Exception: {e}\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al sincronizar el usuario en la BD local: {str(e)}"
        )
        
    return {
        "access_token": validate_data.token,
        "token_type": "bearer",
        "user": map_user_response(user)
    }

async def sync_pandora_roles(user_service: UserService):
    """Sincroniza los accesos activos a Pandora."""
    try:
        users = await user_service._user_repository.get_all()
        active_emails = [u.email for u in users if u.is_active]
        url = f"{settings.AUTH_SERVICE_URL}/api/v1/ecosystem/sync-roles"
        headers = {"X-Sync-Token": settings.AUTH_SERVICE_SECRET}
        payload = {"app_name": "Proyectos", "emails": active_emails}
        
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, headers=headers, timeout=10.0)
    except Exception as e:
        with open("debug_auth.log", "a", encoding="utf-8") as f:
            f.write(f"Error syncing roles to Pandora: {e}\n")

@router.get("/users")
async def list_users(
    user_service: UserService = Depends(get_user_service)
):
    """
    Retorna la lista de todos los usuarios registrados localmente en este microservicio.
    """
    users = await user_service._user_repository.get_all()
    # Mapear a la respuesta esperada por el frontend
    return [
        {
            **map_user_response(u),
            "last_login": None, # o la fecha correspondiente si está en el modelo
            "created_at": None
        }
        for u in users
    ]

@router.post("/users")
async def create_user(
    user_data: UserCreateRequest,
    user_service: UserService = Depends(get_user_service)
):
    """
    Crea o habilita un usuario localmente y notifica a Pandora para habilitar su acceso.
    """
    email = user_data.email.strip().lower()
    
    # 1. Chequear si el usuario ya existe localmente
    existing = await user_service._user_repository.get_by_email(email)
    
    if existing:
        # Solo actualizamos el nombre, rol y aseguramos que esté activo
        existing.full_name = user_data.full_name
        existing.role = user_data.role
        existing.is_active = True
        await user_service._user_repository.save(existing)
        local_user = existing
    else:
        from src.domain.entities.user import User
        user_id = str(uuid.uuid4())
        local_user = User(
            id=user_id,
            email=email,
            full_name=user_data.full_name,
            role=user_data.role,
            is_active=True
        )
        try:
            await user_service._user_repository.save(local_user)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Fallo el registro local: {str(e)}"
            )
            
    # Sincronizar accesos con Pandora
    await sync_pandora_roles(user_service)
    
    return map_user_response(local_user)

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdateRequest,
    user_service: UserService = Depends(get_user_service)
):
    """
    Actualiza los datos del usuario localmente y notifica a Pandora sobre cambios de acceso.
    """
    local_user = await user_service._user_repository.get_by_id(user_id)
    if not local_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
        
    needs_sync = False
    
    if user_data.full_name is not None:
        local_user.full_name = user_data.full_name
    if user_data.role is not None:
        local_user.role = user_data.role
    if user_data.is_active is not None:
        if local_user.is_active != user_data.is_active:
            needs_sync = True
        local_user.is_active = user_data.is_active
    if user_data.allowed_directors is not None:
        local_user.allowed_directors = user_data.allowed_directors
    if user_data.allowed_projects is not None:
        local_user.allowed_projects = user_data.allowed_projects
    if user_data.module_features is not None:
        local_user.module_features = user_data.module_features
        
    await user_service._user_repository.save(local_user)
    
    # Sincronizar con Pandora si el estado cambió
    if needs_sync:
        await sync_pandora_roles(user_service)
        
    return map_user_response(local_user)

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    user_service: UserService = Depends(get_user_service)
):
    """
    Elimina un usuario localmente y remueve su acceso en Pandora.
    """
    local_user = await user_service._user_repository.get_by_id(user_id)
    if not local_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
        
    # Eliminación local
    session = user_service._user_repository._session
    await session.execute(delete(UserModel).where(UserModel.id == user_id))
    await session.commit()
    
    # Sincronizar accesos con Pandora
    await sync_pandora_roles(user_service)
    
    return {"status": "success", "message": "Usuario eliminado correctamente"}

@router.get("/tenant-users")
async def search_tenant_users(
    request: Request,
    search: Optional[str] = None
):
    """
    Busca usuarios en el directorio del Tenant a través de Pandora.
    """
    url = f"{settings.AUTH_SERVICE_URL}/api/v1/ecosystem/users-search"
    headers = {
        "Authorization": request.headers.get("Authorization", ""),
        "X-Sync-Token": settings.AUTH_SERVICE_SECRET
    }
    params = {}
    if search:
        params["search"] = search
        
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=15.0)
            return response.json()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error al buscar usuarios en el tenant: {str(e)}"
            )

# Proxy comodín para el resto de rutas (ej: GET /auth/users, GET /auth/me, POST /auth/verify)
@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_auth_request(path: str, request: Request):
    url = f"{settings.AUTH_SERVICE_URL}/auth/{path}"
    
    headers = {k: v for k, v in request.headers.items() if k.lower() != 'host'}
    headers["X-Auth-Secret"] = settings.AUTH_SERVICE_SECRET
    
    body = await request.body()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                params=request.query_params,
                content=body,
                timeout=30.0
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error al conectar con microservicio de autenticación para ruta '{path}': {str(e)}"
            )
            
    return FastAPIResponse(
        content=response.content,
        status_code=response.status_code,
        headers=dict(response.headers)
    )
