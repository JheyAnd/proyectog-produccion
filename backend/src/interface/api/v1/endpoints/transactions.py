"""API Endpoints: Financial Transactions (Income & Expenses)."""
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.transaction_dto import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.transaction_model import TransactionModel

router = APIRouter()


@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    project_id: str,
    transaction_type: Optional[str] = Query(None, description="Filter: 'income' or 'expense'"),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
):
    """List financial transactions for a project."""
    stmt = select(TransactionModel).where(TransactionModel.project_id == project_id)
    if transaction_type:
        stmt = stmt.where(TransactionModel.transaction_type == transaction_type)
    if status_filter:
        stmt = stmt.where(TransactionModel.status == status_filter)
    stmt = stmt.order_by(TransactionModel.transaction_date.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    project_id: str,
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Register a new financial transaction (income or expense)."""
    tx = TransactionModel(
        project_id=project_id,
        transaction_type=data.transaction_type,
        category=data.category,
        description=data.description,
        amount=data.amount,
        transaction_date=data.transaction_date,
        wbs_item_id=data.wbs_item_id,
        budget_item_id=data.budget_item_id,
        invoice_id=data.invoice_id,
        reference_number=data.reference_number,
        counterparty=data.counterparty,
        due_date=data.due_date,
        tax_amount=data.tax_amount,
        retention_amount=data.retention_amount,
        notes=data.notes,
    )
    db.add(tx)
    await db.flush()
    await db.refresh(tx)
    return tx


@router.put("/{tx_id}", response_model=TransactionResponse)
async def update_transaction(
    project_id: str,
    tx_id: str,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    """Update a transaction (status change, payment registration, etc.)."""
    stmt = select(TransactionModel).where(
        TransactionModel.id == tx_id, TransactionModel.project_id == project_id
    )
    result = await db.execute(stmt)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tx, field, value)

    await db.flush()
    await db.refresh(tx)
    return tx


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    project_id: str,
    tx_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a transaction."""
    stmt = select(TransactionModel).where(
        TransactionModel.id == tx_id, TransactionModel.project_id == project_id
    )
    result = await db.execute(stmt)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    await db.delete(tx)
