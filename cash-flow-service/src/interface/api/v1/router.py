"""API v1 Router - aggregates all endpoint routers."""
from fastapi import APIRouter

from src.interface.api.v1.endpoints.auth import router as auth_router
from src.interface.api.v1.endpoints.users import router as users_router
from src.interface.api.v1.endpoints.cash_flow import router as cash_flow_router
from src.interface.api.v1.endpoints.cash_flow_v2 import router as cash_flow_v2_router
from src.interface.api.v1.endpoints.cash_flow_cell_details import router as cash_flow_cell_details_router
from src.interface.api.v1.endpoints.dashboard import router as dashboard_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(users_router, prefix="/auth/users", tags=["Users"])
api_v1_router.include_router(cash_flow_router, prefix="/projects/{project_id}/cash-flow", tags=["Cash Flow"])
api_v1_router.include_router(cash_flow_v2_router, prefix="/v2", tags=["Cash Flow v2"])
api_v1_router.include_router(cash_flow_cell_details_router, prefix="/v2", tags=["Cash Flow Cell Details"])
api_v1_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
