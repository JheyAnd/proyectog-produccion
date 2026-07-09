"""SQLAlchemy ORM models (Infrastructure layer)."""
from src.infrastructure.database.models.base import Base
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.models.project_model import ProjectModel
from src.infrastructure.database.models.wbs_model import WBSItemModel
from src.infrastructure.database.models.budget_model import BudgetItemModel
from src.infrastructure.database.models.transaction_model import TransactionModel
from src.infrastructure.database.models.invoice_model import InvoiceModel, InvoiceLineItemModel
from src.infrastructure.database.models.cash_flow_model import CashFlowEntryModel
from src.infrastructure.database.models.alert_model import ProjectAlertModel
from src.infrastructure.database.models.document_model import EntregableModel
from src.infrastructure.database.models.preference_model import PreferenceModel
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.infrastructure.database.models.project_tracking_model import ProjectTrackingModel
from src.infrastructure.database.models.project_pending_model import ProjectPendingModel
from src.infrastructure.database.models.egreso_model import EgresoCategoriaModel, EgresoValorModel
from src.infrastructure.database.models.document_v2_model import (
    DocumentCategoryModel,
    DocumentModel,
    DocumentAccessLogModel,
    DocumentRequiredPerPhaseModel,
    ProjectDocumentsStatusModel,
)
from src.infrastructure.database.models.business_case_model import (
    BusinessCaseModel,
    BusinessCaseChapterModel,
    BusinessCaseAIUModel,
    BusinessCaseProcurementModel,
    BusinessCaseProcurementItemModel,
    BusinessCaseIndirectCostModel,
    BusinessCaseScenarioModel,
    BusinessCaseAuditLogModel,
    BusinessCaseDetailModel,
)
from src.infrastructure.database.models.cash_flow_v2_model import (
    CashFlowAuditLogModel,
    CashFlowImportLogModel,
)
from src.infrastructure.database.models.cash_flow_cell_detail_model import (
    CashFlowCellDetailModel,
)
from src.infrastructure.database.models.cronograma_model import CronogramaCorteModel
from src.infrastructure.database.models.cronograma_actividad_model import CronogramaActividadModel
from src.infrastructure.database.models.cronograma_proyectado_model import CronogramaProyectadoModel

__all__ = [
    "Base",
    "UserModel",
    "ProjectModel",
    "WBSItemModel",
    "BudgetItemModel",
    "TransactionModel",
    "InvoiceModel",
    "InvoiceLineItemModel",
    "CashFlowEntryModel",
    "ProjectAlertModel",
    "EntregableModel",
    "PreferenceModel",
    "ActivityLogModel",
    "ProjectTrackingModel",
    "ProjectPendingModel",
    "EgresoCategoriaModel",
    "EgresoValorModel",
    # Document management v2 (BD metadatos + SharePoint archivos)
    "DocumentCategoryModel",
    "DocumentModel",
    "DocumentAccessLogModel",
    "DocumentRequiredPerPhaseModel",
    "ProjectDocumentsStatusModel",
    # Caso de Negocio (origen: Excel)
    "BusinessCaseModel",
    "BusinessCaseChapterModel",
    "BusinessCaseAIUModel",
    "BusinessCaseProcurementModel",
    "BusinessCaseProcurementItemModel",
    "BusinessCaseIndirectCostModel",
    "BusinessCaseScenarioModel",
    "BusinessCaseAuditLogModel",
    "BusinessCaseDetailModel",
    # Cash Flow v2 (auditoría + import logs)
    "CashFlowAuditLogModel",
    "CashFlowImportLogModel",
    "CashFlowCellDetailModel",
    "CronogramaCorteModel",
]
