"""API v1 Router - aggregates all endpoint routers."""
from fastapi import APIRouter

from src.interface.api.v1.endpoints.auth import router as auth_router
from src.interface.api.v1.endpoints.users import router as users_router
from src.interface.api.v1.endpoints.business_case import router as business_case_router
from src.interface.api.v1.endpoints.entregables import router as entregables_router
from src.interface.api.v1.endpoints.dashboard import router as dashboard_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(users_router, prefix="/auth/users", tags=["Users"])
api_v1_router.include_router(business_case_router, tags=["Business Case"])
api_v1_router.include_router(entregables_router)
api_v1_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
