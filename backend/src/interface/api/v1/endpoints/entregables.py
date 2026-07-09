"""Entregables endpoints — upload/download project deliverable documents stored in MySQL."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models.document_model import EntregableModel, VALID_DOC_TYPES
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
    # 1. Fetch from entregables table
    result_entregables = await db.execute(
        select(EntregableModel).where(EntregableModel.project_id == project_id)
    )
    rows_entregables = result_entregables.scalars().all()

    # 2. Fetch from project_files table
    from src.infrastructure.database.models.project_file_model import ProjectFileModel
    result_files = await db.execute(
        select(ProjectFileModel).where(ProjectFileModel.project_id == project_id)
    )
    rows_files = result_files.scalars().all()

    # 3. Normalization map
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

    # Merged map to avoid duplicates and keep the newest record for each normalized doc_type
    merged = {}

    for e in rows_entregables:
        norm_type = CATEGORIA_MAP.get(e.doc_type, e.doc_type)
        dt = e.uploaded_at
        if norm_type not in merged or dt > merged[norm_type]["uploaded_at"]:
            merged[norm_type] = {
                "id": str(e.id),
                "project_id": e.project_id,
                "doc_type": norm_type,
                "filename": e.filename,
                "file_size": e.file_size,
                "content_type": e.content_type,
                "uploaded_at": e.uploaded_at,
                "uploaded_by": e.uploaded_by,
            }

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

    # Delete existing in entregables table
    await db.execute(
        delete(EntregableModel).where(
            EntregableModel.project_id == project_id,
            EntregableModel.doc_type.in_(db_types),
        )
    )

    # ALSO delete existing in project_files table to prevent stale file conflicts
    from src.infrastructure.database.models.project_file_model import ProjectFileModel
    await db.execute(
        delete(ProjectFileModel).where(
            ProjectFileModel.project_id == project_id,
            ProjectFileModel.categoria.in_(db_types),
        )
    )

    record = EntregableModel(
        project_id=project_id,
        doc_type=doc_type,
        filename=file.filename or "archivo",
        file_size=len(data),
        content_type=content_type,
        file_data=data,
        uploaded_at=datetime.utcnow(),
        uploaded_by=uploaded_by or "Sistema",
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


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

    # 1. Search in entregables table first
    result = await db.execute(
        select(EntregableModel).where(
            EntregableModel.project_id == project_id,
            EntregableModel.doc_type.in_(db_types),
        ).order_by(EntregableModel.uploaded_at.desc())
    )
    record = result.scalars().first()
    if record:
        return Response(
            content=record.file_data,
            media_type=record.content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{record.filename}"',
                "Content-Length": str(record.file_size),
            },
        )

    # 2. Search in project_files table
    from src.infrastructure.database.models.project_file_model import ProjectFileModel
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

    # 1. Delete from entregables table
    result_entregable = await db.execute(
        delete(EntregableModel).where(
            EntregableModel.project_id == project_id,
            EntregableModel.doc_type.in_(db_types),
        )
    )

    # 2. Delete from project_files table
    from src.infrastructure.database.models.project_file_model import ProjectFileModel
    result_file = await db.execute(
        delete(ProjectFileModel).where(
            ProjectFileModel.project_id == project_id,
            ProjectFileModel.categoria.in_(db_types),
        )
    )

    await db.commit()

    if result_entregable.rowcount == 0 and result_file.rowcount == 0:
        raise HTTPException(status_code=404, detail="Entregable no encontrado")

