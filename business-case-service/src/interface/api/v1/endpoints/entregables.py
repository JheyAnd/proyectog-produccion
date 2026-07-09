"""Entregables endpoints — upload/download project deliverable documents stored in MySQL."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models.document_model import VALID_DOC_TYPES
from src.infrastructure.database.models.project_file_model import ProjectFileModel
from src.infrastructure.database.session import AsyncSessionLocal

router = APIRouter(tags=["Entregables"])

MIME_TYPES = {
    ".pdf":  "application/pdf",
    ".doc":  "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls":  "application/vnd.ms-excel",
    ".mpp":  "application/vnd.ms-project",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
}

MAX_FILE_SIZE = 30 * 1024 * 1024  # 30 MB


# ── DTOs ──────────────────────────────────────────────────────────────────────

class EntregableMetaResponse(BaseModel):
    id: str
    project_id: str
    doc_type: str
    filename: str
    file_size: int
    content_type: str
    uploaded_at: datetime
    uploaded_by: Optional[str]

    model_config = {"from_attributes": True}


# ── Dependency ────────────────────────────────────────────────────────────────

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_valid_doc_type(doc_type: str) -> bool:
    if doc_type in VALID_DOC_TYPES:
        return True
    # Soporta multiples adjuntos bancarios en CashFlowPage
    return doc_type.startswith("banco_credito_")


def _validate_doc_type(doc_type: str):
    if not _is_valid_doc_type(doc_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de documento no valido. Valores permitidos: {sorted(VALID_DOC_TYPES)}",
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/projects/{project_id}/entregables",
    response_model=List[EntregableMetaResponse],
    summary="Listar entregables del proyecto (metadata, sin binario)",
)
async def list_entregables(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    # Fetch from project_files table
    result_files = await db.execute(
        select(ProjectFileModel).where(ProjectFileModel.project_id == project_id)
    )
    rows_files = result_files.scalars().all()

    # Normalization map
    CATEGORIA_MAP = {
        "venta": "presupuesto_venta",
        "costo": "presupuesto_costo",
        "presupuesto_venta": "presupuesto_venta",
        "presupuesto_costo": "presupuesto_costo",
        "presupuesto-venta": "presupuesto_venta",
        "presupuesto-costo": "presupuesto_costo",
        "cronograma": "cronograma_obra",
        "cronograma_obra": "cronograma_obra",
        "equipo-ejecucion": "equipo_ejecucion",
        "equipo_ejecucion": "equipo_ejecucion",
        "flujo-caja": "flujo_caja",
        "flujo_caja": "flujo_caja",
    }

    merged = {}

    for f in rows_files:
        norm_type = CATEGORIA_MAP.get(f.categoria, f.categoria)
        dt = f.created_at
        if norm_type not in merged or dt > merged[norm_type]["uploaded_at"]:
            merged[norm_type] = {
                "id": str(f.id),
                "project_id": f.project_id,
                "doc_type": norm_type,
                "filename": f.nombre_original,
                "file_size": f.tamano_bytes,
                "content_type": f.tipo_mime,
                "uploaded_at": f.created_at,
                "uploaded_by": f.subido_por,
            }

    return list(merged.values())


@router.post(
    "/projects/{project_id}/entregables/{doc_type}",
    response_model=EntregableMetaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cargar o reemplazar un entregable",
)
async def upload_entregable(
    project_id: str,
    doc_type: str,
    file: UploadFile = File(...),
    uploaded_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    _validate_doc_type(doc_type)

    # Read and validate
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el limite de 30 MB.",
        )

    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")

    DOC_TYPE_TO_DB_CATEGORIES = {
        "presupuesto_venta": ["presupuesto_venta", "venta", "presupuesto-venta"],
        "presupuesto_costo": ["presupuesto_costo", "costo", "presupuesto-costo"],
        "cronograma_obra": ["cronograma_obra", "cronograma"],
        "equipo_ejecucion": ["equipo_ejecucion", "equipo-ejecucion"],
        "flujo_caja": ["flujo_caja", "flujo-caja"],
    }
    db_types = DOC_TYPE_TO_DB_CATEGORIES.get(doc_type, [doc_type])

    # Delete existing in project_files table to prevent stale file conflicts
    await db.execute(
        delete(ProjectFileModel).where(
            ProjectFileModel.project_id == project_id,
            ProjectFileModel.categoria.in_(db_types),
        )
    )

    record = ProjectFileModel(
        project_id=project_id,
        categoria=doc_type,
        nombre_original=file.filename or "archivo",
        tamano_bytes=len(data),
        tipo_mime=content_type,
        archivo=data,
        created_at=datetime.utcnow(),
        subido_por=uploaded_by or "Sistema",
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    return EntregableMetaResponse(
        id=str(record.id),
        project_id=record.project_id,
        doc_type=record.categoria,
        filename=record.nombre_original,
        file_size=record.tamano_bytes,
        content_type=record.tipo_mime,
        uploaded_at=record.created_at,
        uploaded_by=record.subido_por
    )


@router.get(
    "/projects/{project_id}/entregables/{doc_type}/download",
    summary="Descargar un entregable",
)
async def download_entregable(
    project_id: str,
    doc_type: str,
    db: AsyncSession = Depends(get_db),
):
    _validate_doc_type(doc_type)

    DOC_TYPE_TO_DB_CATEGORIES = {
        "presupuesto_venta": ["presupuesto_venta", "venta", "presupuesto-venta"],
        "presupuesto_costo": ["presupuesto_costo", "costo", "presupuesto-costo"],
        "cronograma_obra": ["cronograma_obra", "cronograma"],
        "equipo_ejecucion": ["equipo_ejecucion", "equipo-ejecucion"],
        "flujo_caja": ["flujo_caja", "flujo-caja"],
    }
    db_types = DOC_TYPE_TO_DB_CATEGORIES.get(doc_type, [doc_type])

    # Search in project_files table
    result_file = await db.execute(
        select(ProjectFileModel).where(
            ProjectFileModel.project_id == project_id,
            ProjectFileModel.categoria.in_(db_types),
        ).order_by(ProjectFileModel.created_at.desc())
    )
    file_record = result_file.scalars().first()
    if file_record:
        return Response(
            content=file_record.archivo,
            media_type=file_record.tipo_mime,
            headers={
                "Content-Disposition": f'attachment; filename="{file_record.nombre_original}"',
                "Content-Length": str(file_record.tamano_bytes),
            },
        )

    raise HTTPException(status_code=404, detail="Entregable no encontrado")


@router.delete(
    "/projects/{project_id}/entregables/{doc_type}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un entregable",
)
async def delete_entregable(
    project_id: str,
    doc_type: str,
    db: AsyncSession = Depends(get_db),
):
    _validate_doc_type(doc_type)

    DOC_TYPE_TO_DB_CATEGORIES = {
        "presupuesto_venta": ["presupuesto_venta", "venta", "presupuesto-venta"],
        "presupuesto_costo": ["presupuesto_costo", "costo", "presupuesto-costo"],
        "cronograma_obra": ["cronograma_obra", "cronograma"],
        "equipo_ejecucion": ["equipo_ejecucion", "equipo-ejecucion"],
        "flujo_caja": ["flujo_caja", "flujo-caja"],
    }
    db_types = DOC_TYPE_TO_DB_CATEGORIES.get(doc_type, [doc_type])

    # Delete from project_files table
    result_file = await db.execute(
        delete(ProjectFileModel).where(
            ProjectFileModel.project_id == project_id,
            ProjectFileModel.categoria.in_(db_types),
        )
    )

    await db.commit()

    if result_file.rowcount == 0:
        raise HTTPException(status_code=404, detail="Entregable no encontrado")

