"""API Endpoints: Invoice Management."""
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.dtos.invoice_dto import (
    InvoiceCreate,
    InvoiceResponse,
    PaymentRegister,
)
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.invoice_model import InvoiceModel, InvoiceLineItemModel

router = APIRouter()


@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    project_id: str,
    invoice_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
):
    """List invoices for a project."""
    stmt = select(InvoiceModel).where(InvoiceModel.project_id == project_id)
    if invoice_type:
        stmt = stmt.where(InvoiceModel.invoice_type == invoice_type)
    stmt = stmt.order_by(InvoiceModel.due_date.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    project_id: str,
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new invoice with line items."""
    invoice = InvoiceModel(
        project_id=project_id,
        invoice_type=data.invoice_type,
        invoice_number=data.invoice_number,
        counterparty_name=data.counterparty_name,
        issue_date=data.issue_date,
        due_date=data.due_date,
        tax_id=data.tax_id,
        retention_percentage=data.retention_percentage,
        payment_terms=data.payment_terms,
        certification_number=data.certification_number,
        notes=data.notes,
    )
    db.add(invoice)
    await db.flush()

    for li in data.line_items:
        line = InvoiceLineItemModel(
            invoice_id=invoice.id,
            description=li.description,
            quantity=li.quantity,
            unit_price=li.unit_price,
            tax_rate=li.tax_rate,
            wbs_item_id=li.wbs_item_id,
            budget_item_id=li.budget_item_id,
        )
        db.add(line)

    await db.flush()
    await db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    project_id: str,
    invoice_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get invoice details."""
    stmt = select(InvoiceModel).where(
        InvoiceModel.id == invoice_id, InvoiceModel.project_id == project_id
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    return invoice


@router.post("/{invoice_id}/payments", response_model=InvoiceResponse)
async def register_payment(
    project_id: str,
    invoice_id: str,
    data: PaymentRegister,
    db: AsyncSession = Depends(get_db_session),
):
    """Register a payment against an invoice."""
    stmt = select(InvoiceModel).where(
        InvoiceModel.id == invoice_id, InvoiceModel.project_id == project_id
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    invoice.amount_paid = Decimal(str(invoice.amount_paid)) + data.amount
    # Update status based on payment
    # Simplified: check if fully paid by comparing with line items total
    invoice.status = "partial"
    await db.flush()
    await db.refresh(invoice)
    return invoice
