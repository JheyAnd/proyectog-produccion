"""
Domain Entity: BudgetItem (Presupuesto por Partida)
Represents budget allocation per WBS item / cost account.
Supports hierarchical budget structure: Capítulo > Subcapítulo > Partida.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4


class BudgetCategory(str, enum.Enum):
    MATERIALS = "materials"             # Materiales
    LABOR = "labor"                     # Mano de obra
    EQUIPMENT = "equipment"             # Equipos y herramientas
    SUBCONTRACTS = "subcontracts"       # Subcontratos
    INDIRECT_COSTS = "indirect_costs"   # Costos indirectos
    ENGINEERING = "engineering"         # Ingeniería
    CONTINGENCY = "contingency"         # Contingencia
    OTHER = "other"


class CostType(str, enum.Enum):
    DIRECT = "direct"
    INDIRECT = "indirect"


@dataclass
class BudgetItem:
    """
    Represents a budget line item associated with a WBS element.
    Tracks original budget, approved changes, and committed/actual costs.
    """
    project_id: UUID
    wbs_item_id: UUID
    code: str                   # Budget account code
    description: str
    category: BudgetCategory
    original_amount: Decimal    # Presupuesto original
    id: UUID = field(default_factory=uuid4)
    cost_type: CostType = CostType.DIRECT
    unit: Optional[str] = None           # Unit of measure (e.g., "ml", "kg", "hr")
    quantity: Decimal = Decimal("1.00")
    unit_price: Decimal = Decimal("0.00")
    approved_changes: Decimal = Decimal("0.00")  # Cambios aprobados (+/-)
    committed_amount: Decimal = Decimal("0.00")  # Comprometido (OC emitidas)
    actual_amount: Decimal = Decimal("0.00")     # Costo real (pagado/facturado)
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # --- Domain Logic (Earned Value Management) ---

    @property
    def current_budget(self) -> Decimal:
        """Presupuesto vigente = Original + Cambios aprobados."""
        return self.original_amount + self.approved_changes

    @property
    def available_budget(self) -> Decimal:
        """Saldo disponible = Presupuesto vigente - Comprometido."""
        return self.current_budget - self.committed_amount

    @property
    def cost_variance(self) -> Decimal:
        """Variación de costo = Presupuesto vigente - Costo real (+ = favorable)."""
        return self.current_budget - self.actual_amount

    @property
    def cost_variance_percentage(self) -> Decimal:
        """% de variación de costo."""
        if self.current_budget == 0:
            return Decimal("0")
        return ((self.cost_variance / self.current_budget) * 100).quantize(Decimal("0.01"))

    @property
    def budget_consumption_percentage(self) -> Decimal:
        """% de consumo del presupuesto."""
        if self.current_budget == 0:
            return Decimal("0")
        return ((self.actual_amount / self.current_budget) * 100).quantize(Decimal("0.01"))

    @property
    def is_over_budget(self) -> bool:
        return self.actual_amount > self.current_budget

    @property
    def is_near_budget_limit(self) -> bool:
        """Returns True if consumption is >= 95% of budget."""
        return self.budget_consumption_percentage >= Decimal("95.00")

    def register_change(self, amount: Decimal, reason: str) -> None:
        self.approved_changes += amount
        self.updated_at = datetime.utcnow()

    def register_commitment(self, amount: Decimal) -> None:
        self.committed_amount += amount
        self.updated_at = datetime.utcnow()

    def register_actual_cost(self, amount: Decimal) -> None:
        self.actual_amount += amount
        self.updated_at = datetime.utcnow()

    def validate(self) -> List[str]:
        errors = []
        if self.original_amount < 0:
            errors.append("Original amount cannot be negative.")
        if not self.description.strip():
            errors.append("Description is required.")
        return errors
