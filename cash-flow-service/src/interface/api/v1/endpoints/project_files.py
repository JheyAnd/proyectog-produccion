from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.project_file_model import ProjectFileModel
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.models.activity_model import ActivityLogModel
from src.interface.api.v1.dependencies.auth import get_current_user

router = APIRouter()

@router.post("")
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    categoria: str = Form("general"),
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Sube un archivo y lo almacena como BLOB en MySQL."""
    # Validar tamaño (16 MB)
    content = await file.read()
    size = len(content)
    if size > 16 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo excede el límite de 16 MB")

    new_file = ProjectFileModel(
        project_id=project_id,
        nombre_original=file.filename,
        tipo_mime=file.content_type or "application/octet-stream",
        tamano_bytes=size,
        categoria=categoria,
        archivo=content,
        subido_por=current_user.full_name or current_user.email
    )
    db.add(new_file)
    
    # Registro de actividad
    db.add(ActivityLogModel(
        user_id=str(current_user.id),
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role,
        module="project_files",
        page=f"projects/{project_id}/portfolio",
        action=f"upload_file: {file.filename}",
        field_name="archivo",
        after_state=f"Categoría: {categoria}, Tamaño: {size} bytes",
        project_id=project_id,
        timestamp=datetime.now(timezone.utc),
    ))
    
    await db.commit()
    await db.refresh(new_file)

    return {
        "id": new_file.id,
        "nombre": new_file.nombre_original,
        "tipo": new_file.tipo_mime,
        "tamano": new_file.tamano_bytes,
        "fecha": new_file.created_at,
        "categoria": new_file.categoria,
        "subido_por": new_file.subido_por
    }

@router.get("")
async def list_files(
    project_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Lista la metadata de los archivos de un proyecto."""
    stmt = select(ProjectFileModel).where(ProjectFileModel.project_id == project_id).order_by(ProjectFileModel.created_at.desc())
    result = await db.execute(stmt)
    files = result.scalars().all()
    
    return [
        {
            "id": f.id,
            "nombre": f.nombre_original,
            "tipo": f.tipo_mime,
            "tamano": f.tamano_bytes,
            "fecha": f.created_at,
            "categoria": f.categoria,
            "subido_por": f.subido_por
        }
        for f in files
    ]

@router.get("/{file_id}")
async def get_file(
    project_id: str,
    file_id: int,
    db: AsyncSession = Depends(get_db_session),
):
    """Retorna el contenido del archivo para descarga o visualización."""
    stmt = select(ProjectFileModel).where(ProjectFileModel.id == file_id, ProjectFileModel.project_id == project_id)
    result = await db.execute(stmt)
    file_record = result.scalar_one_or_none()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    return Response(
        content=file_record.archivo,
        media_type=file_record.tipo_mime,
        headers={
            "Content-Disposition": f"inline; filename={file_record.nombre_original}"
        }
    )

@router.delete("/{file_id}")
async def delete_file(
    project_id: str,
    file_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Elimina un archivo de la base de datos."""
    if current_user.role not in ["administrador", "gerente"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar archivos")

    stmt = select(ProjectFileModel).where(ProjectFileModel.id == file_id, ProjectFileModel.project_id == project_id)
    result = await db.execute(stmt)
    file_record = result.scalar_one_or_none()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    await db.delete(file_record)
    
    # Registro de actividad
    db.add(ActivityLogModel(
        user_id=str(current_user.id),
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role,
        module="project_files",
        page=f"projects/{project_id}/portfolio",
        action=f"delete_file: {file_record.nombre_original}",
        project_id=project_id,
        timestamp=datetime.now(timezone.utc),
    ))
    
    await db.commit()
    
    return {"message": "Archivo eliminado correctamente"}
