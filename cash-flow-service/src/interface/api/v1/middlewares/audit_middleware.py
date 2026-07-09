import json
import uuid
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, Type

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.concurrency import iterate_in_threadpool
from sqlalchemy import select, inspect
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import AsyncSessionLocal
from src.infrastructure.database.models import (
    ActivityLogModel,
    UserModel,
    ProjectTrackingModel,
    WBSItemModel,
    EgresoCategoriaModel,
    EgresoValorModel,
    DocumentModel,
    BusinessCaseModel,
    BusinessCaseChapterModel,
    BusinessCaseAIUModel,
    BusinessCaseScenarioModel,
    PreferenceModel,
    CashFlowCellDetailModel,
)
from src.core.security import decode_access_token

# Campos sensibles que nunca deben registrarse
SENSITIVE_FIELDS = {
    "password", "hashed_password", "token", "api_key", "secret", 
    "authorization", "access_token", "current_password", "new_password"
}

# Mapeo de rutas a modelos SQLAlchemy y sus llaves primarias
# Formato: "regex_pattern": (ModelClass, PK_field, module_name)
MODEL_MAP = [
    # Cronograma
    (r"^/api/v1/projects/([^/]+)/wbs/([^/]+)$", (WBSItemModel, "id", "cronograma")),
    (r"^/api/v1/wbs/([^/]+)$", (WBSItemModel, "id", "cronograma")),
    
    # Flujo de Caja
    (r"^/api/v1/egresos/([^/]+)/([^/]+)/valor$", (EgresoValorModel, "id", "cash_flow")), # Valor mensual
    (r"^/api/v1/egresos/([^/]+)$", (EgresoCategoriaModel, "id", "cash_flow")),           # Categoría
    (r"^/api/v1/v2/projects/([^/]+)/cash-flow/categorias/([^/]+)/cell-details/([^/]+)$", (CashFlowCellDetailModel, "id", "cash_flow")),
    (r"^/api/v1/v2/projects/([^/]+)/cash-flow/cell-details/([^/]+)$", (CashFlowCellDetailModel, "id", "cash_flow")),
    
    # Documentos
    (r"^/api/v1/v2/projects/([^/]+)/documents/upload/([^/]+)$", (DocumentModel, "id", "documents")),
    (r"^/api/v1/v2/projects/([^/]+)/documents/([^/]+)$", (DocumentModel, "id", "documents")),
    
    # Caso de Negocio
    (r"^/api/v1/v2/projects/([^/]+)/business-case/chapters/([^/]+)$", (BusinessCaseChapterModel, "id", "business_case")),
    (r"^/api/v1/v2/projects/([^/]+)/business-case/aiu/([^/]+)$", (BusinessCaseAIUModel, "id", "business_case")),
    (r"^/api/v1/v2/projects/([^/]+)/business-case/scenarios/activate$", (BusinessCaseModel, "project_id", "business_case")),
    
    # Usuarios y Configuración
    (r"^/api/v1/auth/users/([^/]+)$", (UserModel, "id", "configuracion")),
    (r"^/api/v1/auth/users$", (UserModel, "id", "configuracion")),
    (r"^/api/v1/preferences/([^/]+)$", (PreferenceModel, "config_key", "preferencias")),
]

# Endpoints que se saltan (porque ya tienen auditoría propia o son internos)
SKIP_PATHS = [
    "/api/v1/project-tracking",
    "/api/v1/activity",
    "/health",
]

class ActivityAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Filtros básicos: solo mutaciones y no ignorados
        if request.method not in ["POST", "PUT", "PATCH", "DELETE"]:
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(skip) for skip in SKIP_PATHS):
            return await call_next(request)

        # 2. Identificar el modelo y el ID del registro
        model_info = self._get_model_info(path)
        if not model_info:
            return await call_next(request)

        model_class, pk_field, module, record_id = model_info

        # 3. Capturar before_state (si no es POST)
        before_state = None
        if request.method in ["PUT", "PATCH", "DELETE"] and record_id:
            before_state = await self._fetch_record(model_class, pk_field, record_id)

        # 4. Ejecutar la petición
        response = await call_next(request)

        # 5. Si falló, no registrar nada
        if response.status_code >= 400:
            return response

        # 6. Capturar after_state
        # Para POST, intentamos obtener el ID de la respuesta si no lo tenemos
        effective_record_id = record_id
        if request.method == "POST" and not effective_record_id:
            try:
                # Intentamos capturar el ID de la respuesta
                # Nota: Esto consume la respuesta, hay que reconstruirla
                response_body = [chunk async for chunk in response.body_iterator]
                response.body_iterator = iterate_in_threadpool(iter(response_body))
                data = json.loads(response_body[0].decode())
                effective_record_id = data.get("id") or data.get(pk_field)
            except:
                pass

        after_state = None
        if request.method in ["POST", "PUT", "PATCH"] and effective_record_id:
            after_state = await self._fetch_record(model_class, pk_field, effective_record_id)
        
        # 7. Procesar y guardar logs (Background)
        await self._process_audit_logs(request, module, path, before_state, after_state, effective_record_id)

        return response

    def _get_model_info(self, path: str) -> Optional[Tuple[Type, str, str, Optional[str]]]:
        for pattern, info in MODEL_MAP:
            match = re.match(pattern, path)
            if match:
                groups = match.groups()
                # El último grupo suele ser el ID del registro
                record_id = groups[-1] if groups else None
                return info[0], info[1], info[2], record_id
        return None

    async def _fetch_record(self, model_class, pk_field, record_id) -> Optional[Dict]:
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(model_class).where(getattr(model_class, pk_field) == record_id)
                result = await db.execute(stmt)
                record = result.scalar_one_or_none()
                if record:
                    return self._serialize_model(record)
            except Exception as e:
                print(f"Error fetching record for audit: {e}")
        return None

    def _serialize_model(self, record) -> Dict:
        """Convierte un modelo SQLAlchemy a dict, filtrando campos sensibles."""
        d = {}
        for column in inspect(record.__class__).columns:
            if column.name in SENSITIVE_FIELDS:
                continue
            val = getattr(record, column.name)
            if isinstance(val, (datetime, timezone)):
                val = val.isoformat()
            d[column.name] = val
        return d

    async def _process_audit_logs(self, request: Request, module: str, path: str, before: Optional[Dict], after: Optional[Dict], record_id: str):
        # Identificar usuario
        user_info = self._get_user_info(request)
        if not user_info:
            return

        user_id, user_name, user_role = user_info

        # Identificar proyecto (si existe)
        project_id = self._extract_project_id(module, before, after, record_id, path)

        # Mapeo de módulos legibles para preferencias
        if module == "preferencias" and record_id:
            if "_activity_notes" in record_id:
                module = "cronograma"
                action_base = "update_note"
            elif "_custom_weeks" in record_id:
                module = "cronograma"
                action_base = "update_weeks"
            elif "_eac_caso_negocio" in record_id:
                module = "business_case"
                action_base = "update_eac"
            else:
                action_base = "update_preference"
        else:
            action_base = f"{request.method.lower()}_{module}"

        # Calcular cambios
        logs_to_save = []
        
        if request.method == "DELETE":
            # Un solo registro para borrado con todo el estado previo
            logs_to_save.append(ActivityLogModel(
                id=str(uuid.uuid4()),
                project_id=project_id,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                module=module,
                page=path,
                action=f"delete_{module}",
                field_name="all_record",
                before_state=json.dumps(before) if before else None,
                after_state=None,
                target_link=path,
                timestamp=datetime.now(timezone.utc)
            ))
        elif request.method == "POST" and not before:
            # Un solo registro para creación (after_state tiene los datos)
            logs_to_save.append(ActivityLogModel(
                id=str(uuid.uuid4()),
                project_id=project_id,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                module=module,
                page=path,
                action=f"create_{module}",
                field_name="new_record",
                before_state=None,
                after_state=json.dumps(after) if after else "Created via POST",
                target_link=path,
                timestamp=datetime.now(timezone.utc)
            ))
        else:
            # PUT/PATCH: Una fila por campo modificado
            if not before or not after:
                return # Nada que comparar

            for field, new_val in after.items():
                old_val = before.get(field)
                if old_val != new_val and field not in ["updated_at", "created_at"]:
                    logs_to_save.append(ActivityLogModel(
                        id=str(uuid.uuid4()),
                        project_id=project_id,
                        user_id=user_id,
                        user_name=user_name,
                        user_role=user_role,
                        module=module,
                        page=path,
                        action=f"{action_base}: {field}",
                        field_name=field,
                        before_state=json.dumps(old_val) if old_val is not None else None,
                        after_state=json.dumps(new_val) if new_val is not None else None,
                        target_link=path,
                        timestamp=datetime.now(timezone.utc)
                    ))

        if logs_to_save:
            async with AsyncSessionLocal() as db:
                db.add_all(logs_to_save)
                await db.commit()

    def _get_user_info(self, request: Request) -> Optional[Tuple[str, str, str]]:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        try:
            payload = decode_access_token(token)
            # El payload suele tener sub (id), email, role
            return str(payload.get("sub")), payload.get("email", "Unknown"), payload.get("role", "viewer")
        except:
            return None

    def _extract_project_id(self, module, before, after, record_id, path) -> Optional[str]:
        # 1. Del path (ej: /projects/PID/...)
        pid_match = re.search(r"/projects/([^/]+)", path)
        if pid_match:
            return pid_match.group(1)
        
        # 2. De los estados
        if before and before.get("project_id"):
            return before.get("project_id")
        if after and after.get("project_id"):
            return after.get("project_id")
        
        # 3. Del record_id si es una preferencia que empieza por el ID
        if module == "preferencias" and record_id:
            # Formato: project_id_key
            parts = record_id.split("_")
            if len(parts) > 1:
                return parts[0]
        
        return None
