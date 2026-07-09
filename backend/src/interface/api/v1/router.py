"""API v1 Router - aggregates all endpoint routers."""
from fastapi import APIRouter

from src.interface.api.v1.endpoints.auth import router as auth_router
from src.interface.api.v1.endpoints.users import router as users_router
from src.interface.api.v1.endpoints.projects import router as projects_router
from src.interface.api.v1.endpoints.wbs import router as wbs_router
from src.interface.api.v1.endpoints.budget import router as budget_router
from src.interface.api.v1.endpoints.transactions import router as transactions_router
from src.interface.api.v1.endpoints.invoices import router as invoices_router
from src.interface.api.v1.endpoints.alerts import router as alerts_router
from src.interface.api.v1.endpoints.reports import router as reports_router
from src.interface.api.v1.endpoints.dashboard import router as dashboard_router
from src.interface.api.v1.endpoints.global_dashboard import router as global_dashboard_router
from src.interface.api.v1.endpoints.documents import router as documents_router
from src.interface.api.v1.endpoints.preferences import router as preferences_router
from src.interface.api.v1.endpoints.entregables import router as entregables_router
from src.interface.api.v1.endpoints.activity import router as activity_router
from src.interface.api.v1.endpoints.project_tracking import router as project_tracking_router
from src.interface.api.v1.endpoints.egresos import router as egresos_router
from src.interface.api.v1.endpoints.documents_v2 import router as documents_v2_router

from src.interface.api.v1.endpoints.project_pendings import router as project_pendings_router
from src.interface.api.v1.endpoints.project_files import router as project_files_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(users_router, prefix="/auth/users", tags=["Users"])
api_v1_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_v1_router.include_router(project_files_router, prefix="/projects/{project_id}/files", tags=["Project Files"])
api_v1_router.include_router(wbs_router, prefix="/projects/{project_id}/wbs", tags=["WBS"])
api_v1_router.include_router(budget_router, prefix="/projects/{project_id}/budget", tags=["Budget"])
api_v1_router.include_router(transactions_router, prefix="/projects/{project_id}/transactions", tags=["Transactions"])
api_v1_router.include_router(invoices_router, prefix="/projects/{project_id}/invoices", tags=["Invoices"])
api_v1_router.include_router(alerts_router, prefix="/projects/{project_id}/alerts", tags=["Alerts"])
api_v1_router.include_router(reports_router, prefix="/projects/{project_id}/reports", tags=["Reports"])
api_v1_router.include_router(dashboard_router, prefix="/projects/{project_id}/dashboard", tags=["Dashboard"])
api_v1_router.include_router(global_dashboard_router, prefix="/dashboard", tags=["Global Dashboard"])
api_v1_router.include_router(documents_router)
api_v1_router.include_router(preferences_router)
api_v1_router.include_router(entregables_router)
api_v1_router.include_router(activity_router)
api_v1_router.include_router(project_tracking_router)
api_v1_router.include_router(egresos_router)
# Documents v2: gestión de documentos por proyecto (BD metadatos + SharePoint)
api_v1_router.include_router(documents_v2_router, prefix="/v2", tags=["Documents v2"])
# Caso de Negocio v2: BD relacional con auditoría
# (Migrado al microservicio business-case-service)

api_v1_router.include_router(project_pendings_router)
