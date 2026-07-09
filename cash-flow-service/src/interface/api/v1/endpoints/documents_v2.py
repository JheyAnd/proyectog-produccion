"""
Endpoints REST para Gestión de Documentos v2.

Arquitectura:
- BD almacena metadatos
- SharePoint almacena archivos físicos (durante piloto: carpeta local)
- Trazabilidad completa: quién cargó/vio/descargó/eliminó cada doc

Endpoints principales:
  POST   /projects/{project_id}/documents/upload/{category_id}
  GET    /projects/{project_id}/documents
  GET    /projects/{project_id}/documents/{doc_id}/download
  GET    /projects/{project_id}/documents/{doc_id}/preview
  DELETE /projects/{project_id}/documents/{doc_id}        (soft delete)
  GET    /projects/{project_id}/documents/categories
  GET    /projects/{project_id}/documents/required-per-phase
  GET    /projects/{project_id}/documents/status
"""
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.document_v2_model import (
    DocumentCategoryModel,
    DocumentModel,
    DocumentAccessLogModel,
    DocumentRequiredPerPhaseModel,
    ProjectDocumentsStatusModel,
)
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.services.sharepoint_service import upload_file_to_sharepoint
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.interface.api.v1.dependencies.auth import get_current_user

router = APIRouter()

# Carpeta local fallback (durante piloto)
LOCAL_STORAGE_DIR = Path(__file__).resolve().parents[6] / "data" / "Sharepoint"
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

PREVIEWABLE_EXT = {"pdf", "jpg", "jpeg", "png"}

MIME_TYPES = {
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "mp4": "video/mp4",
    "mp3": "audio/mpeg",
    "dwg": "application/acad",
    "mpp": "application/vnd.ms-project",
}


# ══════════════════════════════════════════════════════════════════════════════
# RESPONSE SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    display_order: int
    icon: Optional[str] = None
    phase: Optional[str] = None
    is_required: bool
    allowed_extensions: Optional[str] = None
    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: str
    project_id: str
    category_id: str
    category_name: Optional[str] = None
    phase: Optional[str] = None
    filename: str
    file_extension: str
    mime_type: str
    file_size_bytes: Optional[int] = None
    sharepoint_url: str
    preview_url: Optional[str] = None
    storage_type: str
    uploaded_by_id: str
    uploaded_by_name: str
    uploaded_by_role: str
    uploaded_at: datetime
    version: int
    is_latest_version: bool
    status: str
    is_deleted: bool
    model_config = {"from_attributes": True}


class RequiredDocResponse(BaseModel):
    id: str
    phase: str
    category_id: str
    document_type: str
    description: Optional[str] = None
    is_mandatory: bool
    responsible_role: Optional[str] = None
    display_order: int
    model_config = {"from_attributes": True}


class StatusResponse(BaseModel):
    project_id: str
    phase: str
    total_required: int
    total_uploaded: int
    total_approved: int
    completion_pct: float
    last_updated: datetime
    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _get_client_ip(request: Request) -> Optional[str]:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def _get_user_agent(request: Request) -> Optional[str]:
    return request.headers.get("User-Agent", "")[:500] or None


async def _log_access(
    db: AsyncSession,
    document_id: str,
    user: UserModel,
    action: str,
    request: Request,
    notes: Optional[str] = None,
):
    """Registra una acción en document_access_log."""
    log_entry = DocumentAccessLogModel(
        id=str(uuid.uuid4()),
        document_id=document_id,
        user_id=user.id,
        user_name=user.full_name,
        user_role=user.role,
        action=action,
        ip_address=_get_client_ip(request),
        user_agent=_get_user_agent(request),
        notes=notes,
    )
    db.add(log_entry)
    
    # También registrar en la tabla global activity_logs para visibilidad centralizada
    # Buscamos el project_id del documento para el log global
    doc_result = await db.execute(select(DocumentModel.project_id).where(DocumentModel.id == document_id))
    project_id = doc_result.scalar_one_or_none()
    
    db.add(ActivityLogModel(
        user_id=str(user.id),
        user_name=user.full_name or user.email,
        user_role=user.role,
        module="documents",
        page=f"projects/{project_id}/documents" if project_id else "documents",
        action=f"doc_{action}: {document_id}",
        field_name="document",
        before_state=None,
        after_state=action,
        target_link=f"/projects/{project_id}/documents" if project_id else None,
        project_id=project_id,
        timestamp=datetime.now(timezone.utc),
    ))


async def _recalculate_status(db: AsyncSession, project_id: str):
    """Recalcula project_documents_status para todas las fases."""
    # Obtener fases únicas de required_per_phase
    phases_result = await db.execute(
        select(DocumentRequiredPerPhaseModel.phase).distinct()
    )
    phases = [p[0] for p in phases_result.all()]

    for phase in phases:
        # Total requeridos en esta fase
        req_count = await db.execute(
            select(func.count(DocumentRequiredPerPhaseModel.id)).where(
                DocumentRequiredPerPhaseModel.phase == phase
            )
        )
        total_required = req_count.scalar() or 0

        # Total cargados (no eliminados, última versión)
        upl_count = await db.execute(
            select(func.count(DocumentModel.id)).where(
                and_(
                    DocumentModel.project_id == project_id,
                    DocumentModel.phase == phase,
                    DocumentModel.is_deleted == False,
                    DocumentModel.is_latest_version == True,
                )
            )
        )
        total_uploaded = upl_count.scalar() or 0

        # Total aprobados
        appr_count = await db.execute(
            select(func.count(DocumentModel.id)).where(
                and_(
                    DocumentModel.project_id == project_id,
                    DocumentModel.phase == phase,
                    DocumentModel.is_deleted == False,
                    DocumentModel.is_latest_version == True,
                    DocumentModel.status == "approved",
                )
            )
        )
        total_approved = appr_count.scalar() or 0

        completion_pct = (total_uploaded / total_required * 100) if total_required > 0 else 0.0

        # Upsert
        existing = await db.execute(
            select(ProjectDocumentsStatusModel).where(
                and_(
                    ProjectDocumentsStatusModel.project_id == project_id,
                    ProjectDocumentsStatusModel.phase == phase,
                )
            )
        )
        row = existing.scalar_one_or_none()
        if row:
            row.total_required = total_required
            row.total_uploaded = total_uploaded
            row.total_approved = total_approved
            row.completion_pct = round(completion_pct, 2)
            row.last_updated = datetime.now(timezone.utc)
        else:
            db.add(ProjectDocumentsStatusModel(
                id=str(uuid.uuid4()),
                project_id=project_id,
                phase=phase,
                total_required=total_required,
                total_uploaded=total_uploaded,
                total_approved=total_approved,
                completion_pct=round(completion_pct, 2),
                last_updated=datetime.now(timezone.utc),
            ))


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - CATEGORÍAS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db_session)):
    """Lista todas las categorías de documentos disponibles."""
    result = await db.execute(
        select(DocumentCategoryModel)
        .where(DocumentCategoryModel.is_active == True)
        .order_by(DocumentCategoryModel.display_order)
    )
    return list(result.scalars().all())


@router.get("/required-per-phase", response_model=List[RequiredDocResponse])
async def list_required_docs(db: AsyncSession = Depends(get_db_session)):
    """Lista todos los documentos requeridos por fase (checklist)."""
    result = await db.execute(
        select(DocumentRequiredPerPhaseModel)
        .order_by(
            DocumentRequiredPerPhaseModel.phase,
            DocumentRequiredPerPhaseModel.display_order,
        )
    )
    return list(result.scalars().all())


@router.get("/documents", response_model=List[DocumentResponse])
async def list_all_documents(
    category_id: Optional[str] = None,
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db_session),
):
    """Lista todos los documentos del sistema. Filtrable por categoría."""
    query = select(DocumentModel)
    if not include_deleted:
        query = query.where(DocumentModel.is_deleted == False)
    if category_id:
        query = query.where(DocumentModel.category_id == category_id)
    query = query.order_by(DocumentModel.uploaded_at.desc())

    result = await db.execute(query)
    docs = list(result.scalars().all())

    cats_result = await db.execute(select(DocumentCategoryModel))
    cats_map = {c.id: c.name for c in cats_result.scalars().all()}

    response = []
    for d in docs:
        item = DocumentResponse.model_validate(d)
        item.category_name = cats_map.get(d.category_id)
        response.append(item)
    return response


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - POR PROYECTO
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/projects/{project_id}/documents", response_model=List[DocumentResponse])
async def list_project_documents(
    project_id: str,
    category_id: Optional[str] = None,
    phase: Optional[str] = None,
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db_session),
):
    """Lista los documentos de un proyecto. Filtrable por categoría y fase."""
    query = select(DocumentModel).where(DocumentModel.project_id == project_id)
    if not include_deleted:
        query = query.where(DocumentModel.is_deleted == False)
    if category_id:
        query = query.where(DocumentModel.category_id == category_id)
    if phase:
        query = query.where(DocumentModel.phase == phase)
    query = query.order_by(DocumentModel.uploaded_at.desc())

    result = await db.execute(query)
    docs = list(result.scalars().all())

    # Cargar nombres de categorías para enriquecer respuesta
    cats_result = await db.execute(select(DocumentCategoryModel))
    cats_map = {c.id: c.name for c in cats_result.scalars().all()}

    response = []
    for d in docs:
        item = DocumentResponse.model_validate(d)
        item.category_name = cats_map.get(d.category_id)
        response.append(item)
    return response


@router.get("/projects/{project_id}/documents/status", response_model=List[StatusResponse])
async def get_project_documents_status(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Estado de completitud de documentos por fase para un proyecto."""
    result = await db.execute(
        select(ProjectDocumentsStatusModel)
        .where(ProjectDocumentsStatusModel.project_id == project_id)
        .order_by(ProjectDocumentsStatusModel.phase)
    )
    return list(result.scalars().all())


@router.post("/projects/{project_id}/documents/upload/{category_id}", response_model=DocumentResponse)
async def upload_document(
    project_id: str,
    category_id: str,
    request: Request,
    file: UploadFile = File(...),
    phase: Optional[str] = Form(None),
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Sube un documento. Reemplaza la versión anterior si ya existe."""
    # Validar categoría
    cat_result = await db.execute(
        select(DocumentCategoryModel).where(DocumentCategoryModel.id == category_id)
    )
    category = cat_result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=400, detail=f"Categoría inválida: {category_id}")

    # Leer archivo
    file_bytes = await file.read()
    file_size = len(file_bytes)
    ext = Path(file.filename).suffix.lower().lstrip(".")
    mime = MIME_TYPES.get(ext, "application/octet-stream")
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Intentar subir a SharePoint
    sp_url = None
    sp_drive_id = None
    sp_item_id = None
    storage_type = "local"
    try:
        sp_result = await upload_file_to_sharepoint(
            category=category_id,
            file_name=file.filename,
            file_content=file_bytes,
        )
        if sp_result:
            sp_url = sp_result.get("webUrl") or sp_result.get("previewUrl")
            sp_drive_id = sp_result.get("driveId") or sp_result.get("parentReference", {}).get("driveId")
            sp_item_id = sp_result.get("id")
            storage_type = "sharepoint"
    except Exception as e:
        print(f"[upload] SharePoint failed, fallback to local: {e}")

    # Fallback: guardar local
    if not sp_url:
        project_dir = LOCAL_STORAGE_DIR / "projects" / project_id / category_id
        project_dir.mkdir(parents=True, exist_ok=True)
        local_path = project_dir / file.filename
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        sp_url = f"/data/Sharepoint/projects/{project_id}/{category_id}/{file.filename}"
        storage_type = "local"

    # Reemplazar versión anterior (mismo project_id + category + filename)
    existing_result = await db.execute(
        select(DocumentModel).where(
            and_(
                DocumentModel.project_id == project_id,
                DocumentModel.category_id == category_id,
                DocumentModel.filename == file.filename,
                DocumentModel.is_deleted == False,
                DocumentModel.is_latest_version == True,
            )
        )
    )
    previous = existing_result.scalar_one_or_none()

    new_version = 1
    parent_id = None
    if previous:
        # Marcar la anterior como no-latest y obsoleta
        previous.is_latest_version = False
        previous.status = "obsolete"
        new_version = previous.version + 1
        parent_id = previous.id

    # Crear nuevo registro
    new_doc = DocumentModel(
        id=str(uuid.uuid4()),
        project_id=project_id,
        category_id=category_id,
        phase=phase,
        filename=file.filename,
        file_extension=ext,
        mime_type=mime,
        file_size_bytes=file_size,
        sharepoint_url=sp_url,
        sharepoint_drive_id=sp_drive_id,
        sharepoint_item_id=sp_item_id,
        sharepoint_path=f"projects/{project_id}/{category_id}/{file.filename}",
        storage_type=storage_type,
        uploaded_by_id=current_user.id,
        uploaded_by_name=current_user.full_name,
        uploaded_by_role=current_user.role,
        uploaded_at=datetime.now(timezone.utc),
        uploader_ip=_get_client_ip(request),
        version=new_version,
        parent_document_id=parent_id,
        is_latest_version=True,
        status="approved",  # sin workflow
        file_hash_sha256=file_hash,
    )
    db.add(new_doc)
    await db.flush()

    # Log de acceso
    await _log_access(db, new_doc.id, current_user, "upload", request,
                      notes=f"version {new_version}" + (" (replace)" if previous else ""))

    # Recalcular status
    await _recalculate_status(db, project_id)

    await db.commit()
    await db.refresh(new_doc)

    response = DocumentResponse.model_validate(new_doc)
    response.category_name = category.name
    return response


@router.get("/projects/{project_id}/documents/{doc_id}/download")
async def download_document(
    project_id: str,
    doc_id: str,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Descarga un documento. Registra el acceso."""
    result = await db.execute(
        select(DocumentModel).where(
            and_(
                DocumentModel.id == doc_id,
                DocumentModel.project_id == project_id,
                DocumentModel.is_deleted == False,
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # Log
    await _log_access(db, doc.id, current_user, "download", request)
    await db.commit()

    # SharePoint: redirect a webUrl
    if doc.storage_type == "sharepoint" and doc.sharepoint_url:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=doc.sharepoint_url)

    # Local: servir archivo
    if doc.storage_type in ("local", "legacy"):
        # Resolver ruta local
        if doc.sharepoint_url.startswith("/data/Sharepoint/"):
            relative = doc.sharepoint_url.replace("/data/Sharepoint/", "")
            file_path = LOCAL_STORAGE_DIR / relative
        else:
            file_path = LOCAL_STORAGE_DIR / doc.sharepoint_path
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Archivo físico no encontrado: {file_path}")
        return FileResponse(
            path=str(file_path),
            filename=doc.filename,
            media_type=doc.mime_type,
            headers={"Content-Disposition": f"attachment; filename={doc.filename}"},
        )

    raise HTTPException(status_code=500, detail="Storage type desconocido")


@router.get("/projects/{project_id}/documents/{doc_id}/preview")
async def preview_document(
    project_id: str,
    doc_id: str,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Preview inline del documento (PDF, imagen)."""
    result = await db.execute(
        select(DocumentModel).where(
            and_(
                DocumentModel.id == doc_id,
                DocumentModel.project_id == project_id,
                DocumentModel.is_deleted == False,
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    if doc.file_extension not in PREVIEWABLE_EXT:
        raise HTTPException(status_code=415, detail="Tipo no previsualizable")

    await _log_access(db, doc.id, current_user, "preview", request)
    await db.commit()

    if doc.storage_type == "sharepoint" and doc.preview_url:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=doc.preview_url)

    if doc.sharepoint_url.startswith("/data/Sharepoint/"):
        relative = doc.sharepoint_url.replace("/data/Sharepoint/", "")
        file_path = LOCAL_STORAGE_DIR / relative
    else:
        file_path = LOCAL_STORAGE_DIR / (doc.sharepoint_path or doc.filename)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    return FileResponse(
        path=str(file_path),
        media_type=doc.mime_type,
        headers={"Content-Disposition": "inline"},
    )


@router.delete("/projects/{project_id}/documents/{doc_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    project_id: str,
    doc_id: str,
    request: Request,
    reason: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Soft delete de un documento. NO borra el archivo físico."""
    result = await db.execute(
        select(DocumentModel).where(
            and_(
                DocumentModel.id == doc_id,
                DocumentModel.project_id == project_id,
                DocumentModel.is_deleted == False,
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # Soft delete
    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    doc.deleted_by_id = current_user.id
    doc.deleted_reason = reason

    await _log_access(db, doc.id, current_user, "delete", request, notes=reason)
    await _recalculate_status(db, project_id)
    await db.commit()

    return {"deleted": True, "doc_id": doc_id, "is_deleted": True}


@router.post("/projects/{project_id}/documents/{doc_id}/restore", response_model=DocumentResponse)
async def restore_document(
    project_id: str,
    doc_id: str,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Restaura un documento soft-deleted."""
    result = await db.execute(
        select(DocumentModel).where(
            and_(
                DocumentModel.id == doc_id,
                DocumentModel.project_id == project_id,
                DocumentModel.is_deleted == True,
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento eliminado no encontrado")

    doc.is_deleted = False
    doc.deleted_at = None
    doc.deleted_by_id = None
    doc.deleted_reason = None

    await _log_access(db, doc.id, current_user, "restore", request)
    await _recalculate_status(db, project_id)
    await db.commit()
    await db.refresh(doc)

    return DocumentResponse.model_validate(doc)
