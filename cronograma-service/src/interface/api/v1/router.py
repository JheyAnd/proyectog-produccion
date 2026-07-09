"""API v1 Router - aggregates all endpoint routers."""
from fastapi import APIRouter

from src.interface.api.v1.endpoints.cronograma import router as cronograma_router

api_v1_router = APIRouter()

api_v1_router.include_router(cronograma_router, prefix="/cronograma", tags=["Cronograma"])

