"""Document upload/download/preview endpoints."""
import json
import shutil
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from src.infrastructure.services.sharepoint_service import upload_file_to_sharepoint

SHAREPOINT_DIR = Path(__file__).resolve().parents[6] / "data" / "Sharepoint"

MIME_TYPES = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
}

PREVIEWABLE = {".pdf", ".jpg", ".jpeg", ".png"}

ALLOWED_CATEGORIES = {
    "contratos", "ofertas", "facturas", "reportes", "fotos", 
    "disenos", "tecnico", "garantias", "tramites", "planificacion", "varios"
}

router = APIRouter(prefix="/documents", tags=["documents"])


def _category_dir(category: str, project_id: str = "patio-sur-oe1035") -> Path:
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categoría no permitida: {category}")
    
    # Backward compatibility for Patio Sur
    normalized = re.sub(r"[\s-]", "", project_id.lower())
    is_patio_sur = normalized in {'patiosuroe1035', 'oe1035'}
    
    if is_patio_sur:
        d = SHAREPOINT_DIR / category
    else:
        # Enforce isolation by project_id
        d = SHAREPOINT_DIR / "projects" / project_id / category
    
    d.mkdir(parents=True, exist_ok=True)
    return d


def _find_file(category_dir: Path, doc_id: str) -> Optional[Path]:
    for path in category_dir.iterdir():
        if path.stem == doc_id and path.suffix != ".meta":
            return path
    return None


def _meta_path(category_dir: Path, doc_id: str) -> Path:
    return category_dir / f"{doc_id}.meta"


def _save_meta(
    category_dir: Path,
    doc_id: str,
    original_name: str,
    sharepoint_url: str = None,
    uploaded_by: str = None,
    uploaded_by_id: str = None,
    uploaded_by_role: str = None,
    project_id: str = None,
    project_name: str = None,
) -> None:
    data = {
        "original_name": original_name,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    if sharepoint_url:
        data["sharepoint_url"] = sharepoint_url
    if uploaded_by:
        data["uploaded_by"] = uploaded_by
    if uploaded_by_id:
        data["uploaded_by_id"] = uploaded_by_id
    if uploaded_by_role:
        data["uploaded_by_role"] = uploaded_by_role
    if project_id:
        data["project_id"] = project_id
    if project_name:
        data["project_name"] = project_name

    _meta_path(category_dir, doc_id).write_text(
        json.dumps(data, ensure_ascii=False), encoding="utf-8"
    )


def _read_meta(category_dir: Path, doc_id: str) -> dict:
    meta = _meta_path(category_dir, doc_id)
    if meta.exists():
        try:
            val = json.loads(meta.read_text(encoding="utf-8"))
            if isinstance(val, dict):
                return val
            else:
                return {"original_name": str(val)}
        except Exception:
            pass
    return {"original_name": doc_id}


@router.post("/upload/{category}")
async def upload_document(
    category: str,
    doc_id: str = Form(...),
    file: UploadFile = File(...),
    uploaded_by: Optional[str] = Form(None),
    uploaded_by_id: Optional[str] = Form(None),
    uploaded_by_role: Optional[str] = Form(None),
    project_id: str = Form(...),
    project_name: Optional[str] = Form(None),
):
    """Upload a document for a given category and ID. Tracks uploader + timestamp."""
    try:
        cat_dir = _category_dir(category, project_id)
        ext = Path(file.filename).suffix.lower()

        # Fallback MIME type if not in our predefined list
        mime_type = MIME_TYPES.get(ext, "application/octet-stream")

        existing = _find_file(cat_dir, doc_id)
        if existing:
            try:
                existing.unlink()
            except: pass

        dest = cat_dir / f"{doc_id}{ext}"

        # Read file content
        file_bytes = await file.read()

        # Attempt Microsoft Graph API upload
        sp_url = None
        try:
            sharepoint_result = await upload_file_to_sharepoint(
                category=category,
                file_name=file.filename,
                file_content=file_bytes
            )
            if sharepoint_result:
                sp_url = sharepoint_result.get("previewUrl") or sharepoint_result.get("webUrl")
        except Exception as e:
            print(f"DEBUG: SharePoint upload failed: {e}")

        # Save local copy
        with dest.open("wb") as f:
            f.write(file_bytes)

        # Save meta
        _save_meta(
            cat_dir,
            doc_id,
            file.filename,
            sharepoint_url=sp_url,
            uploaded_by=uploaded_by,
            uploaded_by_id=uploaded_by_id,
            uploaded_by_role=uploaded_by_role,
            project_id=project_id,
            project_name=project_name,
        )

        meta_data = _read_meta(cat_dir, doc_id)
        return {
            "doc_id": doc_id,
            "category": category,
            "filename": dest.name,
            "original_name": file.filename,
            "previewable": ext in PREVIEWABLE,
            "sharepoint_url": sp_url,
            "uploaded_by": meta_data.get("uploaded_by"),
            "uploaded_at": meta_data.get("uploaded_at"),
            "project_id": meta_data.get("project_id"),
            "project_name": meta_data.get("project_name"),
        }
    except Exception as e:
        print(f"DEBUG: General upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category}/{doc_id}/preview")
async def preview_document(category: str, doc_id: str, project_id: str = "patio-sur-oe1035"):
    """Serve file inline for in-app preview (PDF, images)."""
    cat_dir = _category_dir(category, project_id)
    path = _find_file(cat_dir, doc_id)
    if not path:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    ext = path.suffix.lower()
    if ext not in PREVIEWABLE:
        raise HTTPException(status_code=415, detail="Vista previa no disponible para este tipo de archivo")
    return FileResponse(
        path=str(path),
        media_type=MIME_TYPES[ext],
        headers={"Content-Disposition": "inline"},
    )


@router.get("/{category}/{doc_id}/download")
async def download_document(category: str, doc_id: str, project_id: str = "patio-sur-oe1035"):
    """Download a document."""
    cat_dir = _category_dir(category, project_id)
    path = _find_file(cat_dir, doc_id)
    if not path:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    meta_data = _read_meta(cat_dir, doc_id)
    original_name = meta_data.get("original_name", doc_id)
    return FileResponse(
        path=str(path),
        filename=original_name,
        media_type=MIME_TYPES.get(path.suffix.lower(), "application/octet-stream"),
        headers={"Content-Disposition": f"attachment; filename={original_name}"},
    )


@router.delete("/{category}/{doc_id}")
async def delete_document(category: str, doc_id: str, project_id: str = "patio-sur-oe1035"):
    """Delete a document and its metadata."""
    cat_dir = _category_dir(category, project_id)
    path = _find_file(cat_dir, doc_id)
    if not path:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    path.unlink()
    meta = _meta_path(cat_dir, doc_id)
    if meta.exists():
        meta.unlink()
    return {"deleted": True}


@router.get("/{category}")
async def list_documents(category: str, project_id: str = "patio-sur-oe1035"):
    """List all documents in a category for a specific project."""
    cat_dir = _category_dir(category, project_id)
    files = {}
    for path in cat_dir.iterdir():
        if path.suffix == ".meta":
            continue
        meta_data = _read_meta(cat_dir, path.stem)
        files[path.stem] = {
            "filename": meta_data.get("original_name", path.stem),
            "previewable": path.suffix.lower() in PREVIEWABLE,
            "sharepoint_url": meta_data.get("sharepoint_url"),
            "uploaded_by": meta_data.get("uploaded_by"),
            "uploaded_by_id": meta_data.get("uploaded_by_id"),
            "uploaded_by_role": meta_data.get("uploaded_by_role"),
            "uploaded_at": meta_data.get("uploaded_at"),
            "project_id": meta_data.get("project_id"),
            "project_name": meta_data.get("project_name"),
        }
    return files


# ── Backwards-compatible aliases for contratos (used in CashFlowPage) ──
@router.post("/upload-contrato")
async def upload_contrato(item_id: str = Form(...), file: UploadFile = File(...), project_id: str = Form("patio-sur-oe1035")):
    return await upload_document("contratos", item_id, file, project_id=project_id)


@router.get("/contrato/{item_id}/preview")
async def preview_contrato(item_id: str, project_id: str = "patio-sur-oe1035"):
    return await preview_document("contratos", item_id, project_id=project_id)


@router.get("/contrato/{item_id}")
async def download_contrato(item_id: str, project_id: str = "patio-sur-oe1035"):
    return await download_document("contratos", item_id, project_id=project_id)


@router.delete("/contrato/{item_id}")
async def delete_contrato(item_id: str, project_id: str = "patio-sur-oe1035"):
    return await delete_document("contratos", item_id, project_id=project_id)


@router.get("/contratos")
async def list_contratos(project_id: str = "patio-sur-oe1035"):
    return await list_documents("contratos", project_id=project_id)
