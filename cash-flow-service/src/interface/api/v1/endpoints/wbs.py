"""API Endpoints: Work Breakdown Structure."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.wbs_dto import WBSItemCreate, WBSItemResponse, WBSItemUpdate
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.wbs_model import WBSItemModel
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.infrastructure.database.models.user_model import UserModel
from src.interface.api.v1.dependencies.auth import get_current_user
import json
from datetime import datetime, timezone

router = APIRouter()


@router.get("", response_model=List[WBSItemResponse])
async def list_wbs_items(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """List all WBS items for a project (flat list, use parent_id for tree)."""
    stmt = (
        select(WBSItemModel)
        .where(WBSItemModel.project_id == project_id)
        .order_by(WBSItemModel.sort_order, WBSItemModel.code)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=WBSItemResponse, status_code=status.HTTP_201_CREATED)
async def create_wbs_item(
    project_id: str,
    data: WBSItemCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new WBS item."""
    item = WBSItemModel(
        project_id=project_id,
        code=data.code,
        name=data.name,
        level=data.level,
        parent_id=data.parent_id,
        description=data.description,
        planned_start_date=data.planned_start_date,
        planned_end_date=data.planned_end_date,
        weight=data.weight,
        sort_order=data.sort_order,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.put("/{item_id}", response_model=WBSItemResponse)
async def update_wbs_item(
    project_id: str,
    item_id: str,
    data: WBSItemUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Update a WBS item (including progress)."""
    stmt = select(WBSItemModel).where(
        WBSItemModel.id == item_id, WBSItemModel.project_id == project_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="WBS item not found.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_val = getattr(item, field)
        if old_val != value:
            setattr(item, field, value)
            # Auditoría global
            db.add(ActivityLogModel(
                user_id=str(current_user.id),
                user_name=current_user.full_name or current_user.email,
                user_role=current_user.role,
                module="cronograma",
                page=f"projects/{project_id}/cronograma",
                action=f"update_wbs: {item.name} ({field})",
                field_name=field,
                before_state=str(old_val) if old_val is not None else None,
                after_state=str(value) if value is not None else None,
                target_link=f"/projects/{project_id}/cronograma",
                project_id=project_id,
                timestamp=datetime.now(timezone.utc),
            ))

    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wbs_item(
    project_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a WBS item."""
    stmt = select(WBSItemModel).where(
        WBSItemModel.id == item_id, WBSItemModel.project_id == project_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="WBS item not found.")
    await db.delete(item)
