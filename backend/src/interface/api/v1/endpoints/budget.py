"""API Endpoints: Budget Management."""
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.budget_dto import (
    BudgetItemCreate,
    BudgetItemResponse,
    BudgetItemUpdate,
    BudgetSummaryResponse,
)
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.budget_model import BudgetItemModel

router = APIRouter()


@router.get("", response_model=List[BudgetItemResponse])
async def list_budget_items(
    project_id: str,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
):
    """List all budget items for a project, optionally filtered by category."""
    stmt = select(BudgetItemModel).where(BudgetItemModel.project_id == project_id)
    if category:
        stmt = stmt.where(BudgetItemModel.category == category)
    stmt = stmt.order_by(BudgetItemModel.code)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/summary", response_model=BudgetSummaryResponse)
async def get_budget_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get aggregated budget summary for a project."""
    stmt = select(BudgetItemModel).where(BudgetItemModel.project_id == project_id)
    result = await db.execute(stmt)
    items = result.scalars().all()

    total_original = sum(Decimal(str(i.original_amount)) for i in items)
    total_changes = sum(Decimal(str(i.approved_changes)) for i in items)
    total_current = total_original + total_changes
    total_committed = sum(Decimal(str(i.committed_amount)) for i in items)
    total_actual = sum(Decimal(str(i.actual_amount)) for i in items)
    total_available = total_current - total_committed

    consumption_pct = Decimal("0")
    if total_current > 0:
        consumption_pct = (total_actual / total_current * 100).quantize(Decimal("0.01"))

    over_budget = sum(1 for i in items if Decimal(str(i.actual_amount)) > Decimal(str(i.original_amount)) + Decimal(str(i.approved_changes)))
    near_limit = sum(
        1 for i in items
        if not (Decimal(str(i.actual_amount)) > Decimal(str(i.original_amount)) + Decimal(str(i.approved_changes)))
        and (Decimal(str(i.original_amount)) + Decimal(str(i.approved_changes))) > 0
        and (Decimal(str(i.actual_amount)) / (Decimal(str(i.original_amount)) + Decimal(str(i.approved_changes))) * 100) >= 95
    )

    return BudgetSummaryResponse(
        project_id=project_id,
        total_original_budget=total_original,
        total_approved_changes=total_changes,
        total_current_budget=total_current,
        total_committed=total_committed,
        total_actual=total_actual,
        total_available=total_available,
        overall_consumption_percentage=consumption_pct,
        items_over_budget=over_budget,
        items_near_limit=near_limit,
    )


@router.post("", response_model=BudgetItemResponse, status_code=status.HTTP_201_CREATED)
async def create_budget_item(
    project_id: str,
    data: BudgetItemCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new budget line item."""
    item = BudgetItemModel(
        project_id=project_id,
        wbs_item_id=data.wbs_item_id,
        code=data.code,
        description=data.description,
        category=data.category,
        cost_type=data.cost_type,
        original_amount=data.original_amount,
        unit=data.unit,
        quantity=data.quantity,
        unit_price=data.unit_price,
        notes=data.notes,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.put("/{item_id}", response_model=BudgetItemResponse)
async def update_budget_item(
    project_id: str,
    item_id: str,
    data: BudgetItemUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    """Update a budget item (e.g., register approved changes, actual costs)."""
    stmt = select(BudgetItemModel).where(
        BudgetItemModel.id == item_id, BudgetItemModel.project_id == project_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget_item(
    project_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a budget item."""
    stmt = select(BudgetItemModel).where(
        BudgetItemModel.id == item_id, BudgetItemModel.project_id == project_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found.")
    await db.delete(item)
