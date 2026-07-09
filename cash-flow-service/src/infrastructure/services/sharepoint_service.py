import os
import httpx
import logging
from typing import Optional, Dict, Any
from fastapi import UploadFile

from src.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Configuración desde variables de entorno (.env)
AZURE_TENANT_ID = settings.AZURE_TENANT_ID
AZURE_CLIENT_ID = settings.AZURE_CLIENT_ID
AZURE_CLIENT_SECRET = settings.AZURE_CLIENT_SECRET

# NOTA PARA EL USUARIO:
# El link compartido que enviaste (https://pcmejiaing.sharepoint.com/:f:/s/InformacinProyectos/IgAfJ...)
# representa un "Sharing Token". Para guardarlo allí usando la API, el SITE_ID apunta a "InformacinProyectos"
# y la URL de carga apuntará automáticamente a esa carpeta compartida (que internamente se traduce en una ruta).
SHAREPOINT_SITE_ID = os.getenv("SHAREPOINT_SITE_ID", "pcmejiaing.sharepoint.com:/sites/InformacinProyectos")
SHAREPOINT_FOLDER_PATH = "Documentos_Compartidos/Patio_Sur" # Aquí debes ajustar según la carpeta real a la que apunta el link



async def get_access_token() -> Optional[str]:
    """Obtiene el token OAuth2 de Microsoft Entra usando Client Credentials flow."""
    if not AZURE_TENANT_ID or not AZURE_CLIENT_ID or not AZURE_CLIENT_SECRET:
        return None

    url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
    data = {
        "client_id": AZURE_CLIENT_ID,
        "scope": "https://graph.microsoft.com/.default",
        "client_secret": AZURE_CLIENT_SECRET,
        "grant_type": "client_credentials",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, data=data)
            resp.raise_for_status()
            return resp.json().get("access_token")
    except Exception as e:
        logger.error(f"Error obteniendo token de Azure: {e}")
        return None


async def upload_file_to_sharepoint(
    category: str, 
    file_name: str, 
    file_content: bytes
) -> Optional[Dict[str, Any]]:
    """
    Sube un archivo directamente a una carpeta en la biblioteca principal de SharePoint.
    Retorna un diccionario con detalles del archivo en Microsoft 365,
    incluyendo el 'webUrl' directo, o None si hay error.
    """
    token = await get_access_token()
    if not token:
        # Fallback manejado por el endpoint local
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/octet-stream"
    }

    # Asume que se guarda en la unidad principal (drive) del sitio en la carpeta categorizada
    # Ejemplo ruta Graph a la carpeta especificada
    graph_url = f"https://graph.microsoft.com/v1.0/sites/{SHAREPOINT_SITE_ID}/drive/root:/{SHAREPOINT_FOLDER_PATH}/{category}/{file_name}:/content"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.put(graph_url, content=file_content, headers=headers, timeout=60.0)
            resp.raise_for_status()
            data = resp.json()
            return {
                "id": data.get("id"),
                "webUrl": data.get("webUrl"),
                "name": data.get("name"),
                "previewUrl": data.get("webUrl") + "?web=1" if data.get("webUrl") else None
            }
    except httpx.HTTPError as e:
        logger.error(f"Error en HTTP request a Microsoft Graph: {e}")
        if hasattr(e, 'response') and e.response:
             logger.error(f"Detalle MS Graph: {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"Error subiendo a SharePoint: {e}")
        return None

