"""
Domain Repository Interfaces (Ports)
Clean Architecture: These are abstract contracts that the infrastructure layer implements.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from src.domain.entities.project import Project
from src.domain.entities.wbs import WBSItem
from src.domain.entities.budget import BudgetItem
from src.domain.entities.transaction import Transaction, TransactionType
from src.domain.entities.invoice import Invoice
from src.domain.entities.cash_flow import CashFlowEntry


class ProjectRepository(ABC):
    @abstractmethod
    async def get_by_id(self, project_id: UUID) -> Optional[Project]: ...

    @abstractmethod
    async def get_by_code(self, code: str) -> Optional[Project]: ...

    @abstractmethod
    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Project]: ...

    @abstractmethod
    async def create(self, project: Project) -> Project: ...

    @abstractmethod
    async def update(self, project: Project) -> Project: ...

    @abstractmethod
    async def delete(self, project_id: UUID) -> None: ...


class WBSRepository(ABC):
    @abstractmethod
    async def get_by_id(self, item_id: UUID) -> Optional[WBSItem]: ...

    @abstractmethod
    async def list_by_project(self, project_id: UUID) -> List[WBSItem]: ...

    @abstractmethod
    async def list_children(self, parent_id: UUID) -> List[WBSItem]: ...

    @abstractmethod
    async def create(self, item: WBSItem) -> WBSItem: ...

    @abstractmethod
    async def update(self, item: WBSItem) -> WBSItem: ...

    @abstractmethod
    async def delete(self, item_id: UUID) -> None: ...


class BudgetRepository(ABC):
    @abstractmethod
    async def get_by_id(self, item_id: UUID) -> Optional[BudgetItem]: ...

    @abstractmethod
    async def list_by_project(self, project_id: UUID) -> List[BudgetItem]: ...

    @abstractmethod
    async def list_by_wbs(self, wbs_item_id: UUID) -> List[BudgetItem]: ...

    @abstractmethod
    async def create(self, item: BudgetItem) -> BudgetItem: ...

    @abstractmethod
    async def update(self, item: BudgetItem) -> BudgetItem: ...

    @abstractmethod
    async def delete(self, item_id: UUID) -> None: ...

    @abstractmethod
    async def get_total_budget_by_project(self, project_id: UUID) -> Decimal: ...

    @abstractmethod
    async def get_total_actual_by_project(self, project_id: UUID) -> Decimal: ...


class TransactionRepository(ABC):
    @abstractmethod
    async def get_by_id(self, tx_id: UUID) -> Optional[Transaction]: ...

    @abstractmethod
    async def list_by_project(
        self, project_id: UUID,
        tx_type: Optional[TransactionType] = None,
        skip: int = 0, limit: int = 100
    ) -> List[Transaction]: ...

    @abstractmethod
    async def create(self, tx: Transaction) -> Transaction: ...

    @abstractmethod
    async def update(self, tx: Transaction) -> Transaction: ...

    @abstractmethod
    async def delete(self, tx_id: UUID) -> None: ...

    @abstractmethod
    async def get_total_income_by_project(self, project_id: UUID) -> Decimal: ...

    @abstractmethod
    async def get_total_expenses_by_project(self, project_id: UUID) -> Decimal: ...

    @abstractmethod
    async def get_overdue_transactions(self, project_id: UUID) -> List[Transaction]: ...


class InvoiceRepository(ABC):
    @abstractmethod
    async def get_by_id(self, invoice_id: UUID) -> Optional[Invoice]: ...

    @abstractmethod
    async def list_by_project(
        self, project_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Invoice]: ...

    @abstractmethod
    async def create(self, invoice: Invoice) -> Invoice: ...

    @abstractmethod
    async def update(self, invoice: Invoice) -> Invoice: ...

    @abstractmethod
    async def delete(self, invoice_id: UUID) -> None: ...

    @abstractmethod
    async def get_invoices_due_soon(self, project_id: UUID, days: int = 30) -> List[Invoice]: ...


class CashFlowRepository(ABC):
    @abstractmethod
    async def get_by_period(
        self, project_id: UUID, year: int, month: int
    ) -> Optional[CashFlowEntry]: ...

    @abstractmethod
    async def list_by_project(self, project_id: UUID) -> List[CashFlowEntry]: ...

    @abstractmethod
    async def create(self, entry: CashFlowEntry) -> CashFlowEntry: ...

    @abstractmethod
    async def update(self, entry: CashFlowEntry) -> CashFlowEntry: ...

    @abstractmethod
    async def upsert(self, entry: CashFlowEntry) -> CashFlowEntry: ...
