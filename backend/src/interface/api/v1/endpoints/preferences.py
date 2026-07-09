"""
Preferencias genéricas de usuario — almacenamiento key-value en MySQL.

ALCANCE VÁLIDO de este endpoint:
  - payment_items      : ítems de pago del Flujo de Caja (pendiente tabla propia)
  - incomes            : ingresos del Flujo de Caja (pendiente tabla propia)
  - credit_params      : parámetros de crédito del Flujo de Caja (pendiente tabla propia)
  - loan_scenarios     : escenarios de crédito del Flujo de Caja (pendiente tabla propia)
  - {id}_custom_weeks_v2   : datos de semanas del cronograma (pendiente tabla propia)
  - {id}_activity_notes    : notas de actividades (pendiente tabla propia)
  - {id}_eac_caso_negocio  : datos del Caso de Negocio (pendiente tabla propia)
  - {id}_caso_negocio_cv   : valores CV del Caso de Negocio (pendiente tabla propia)

MIGRADO A TABLAS PROPIAS (NO usar preferences para esto):
  - egresos_categorias  → tablas egreso_categorias + egreso_valores  (/api/v1/egresos/)
  - project_tracking    → tabla project_tracking                     (/api/v1/project-tracking)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models.preference_model import PreferenceModel
from src.infrastructure.database.session import get_db_session
from src.socket_manager import broadcast_preference_update

# Keys que aún no tienen tabla propia — candidatos a migrar en la próxima fase
PENDING_MIGRATION_KEYS = {
    "payment_items", "incomes", "credit_params", "loan_scenarios",
}

router = APIRouter(prefix="/preferences", tags=["preferences"])

# NOTA PARA EL MIDDLEWARE DE AUDITORIA:
# Las llaves deben seguir el patrón {project_id}_{key_name} para que el 
# ActivityAuditMiddleware pueda extraer el project_id automáticamente.


def _validate_key(key: str) -> None:
    """Rechaza cualquier intento de guardar keys que ya fueron migradas a tablas relacionales."""
    blocked = {"egresos_categorias", "patio-sur-projects-tracking.v3"}
    if key in blocked:
        raise HTTPException(
            status_code=410,
            detail=f"La key '{key}' fue migrada a su propia tabla relacional. "
                   f"Usa el endpoint dedicado en lugar de /preferences.",
        )


@router.get("/{key}")
async def get_preference(key: str, db: AsyncSession = Depends(get_db_session)):
    _validate_key(key)
    
    result = await db.execute(select(PreferenceModel).where(PreferenceModel.config_key == key))
    pref = result.scalar_one_or_none()
    
    if not pref:
        return None
        
    return pref.config_value


@router.put("/{key}")
async def set_preference(key: str, request: Request, db: AsyncSession = Depends(get_db_session)):
    _validate_key(key)
    
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")

    # Check if it already exists
    result = await db.execute(select(PreferenceModel).where(PreferenceModel.config_key == key))
    pref = result.scalar_one_or_none()
    
    if pref:
        pref.config_value = data
    else:
        new_pref = PreferenceModel(config_key=key, config_value=data)
        db.add(new_pref)
    
    # Session is committed automatically by the get_db_session dependency generator
    # but we can call flush or commit here if we prefer explicit control.
    # The current get_db_session in session.py does: await session.commit()
    
    # Notify clients via Socket.io
    await broadcast_preference_update(key, data)
    
    return {"saved": True}
