import os
import uuid
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, File as FileModel
from app.deps import get_current_active_user
from app.core.config import settings
from app.schemas import FileUploadResponse, MultipleFileUploadResponse

router = APIRouter()


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove path separators and dangerous characters
    safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
    sanitized = "".join(c for c in filename if c in safe_chars)
    
    # Ensure it's not empty and has reasonable length
    if not sanitized:
        sanitized = "file"
    if len(sanitized) > 100:
        name, ext = os.path.splitext(sanitized)
        sanitized = name[:100-len(ext)] + ext
    
    return sanitized


def validate_file(file: UploadFile) -> None:
    """Validate file size and MIME type"""
    # Check file size
    if file.size and file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE} bytes"
        )
    
    # Check MIME type
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"File type not allowed. Allowed types: {', '.join(settings.ALLOWED_MIME_TYPES)}"
        )


async def save_file(file: UploadFile, report_id: Optional[str] = None, current_user: User = None, db: Session = None) -> FileUploadResponse:
    """Save uploaded file to storage and return metadata"""
    validate_file(file)
    
    # Generate unique file ID and sanitize filename
    file_id = str(uuid.uuid4())
    sanitized_name = sanitize_filename(file.filename or "file")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    final_filename = f"{timestamp}_{sanitized_name}"
    
    # Create storage path
    if report_id:
        storage_path = Path(settings.STORAGE_DIR) / report_id
    else:
        storage_path = Path(settings.STORAGE_DIR) / "general"
    
    storage_path.mkdir(parents=True, exist_ok=True)
    file_path = storage_path / final_filename
    
    # Save file
    try:
        content = await file.read()
        
        # Additional size validation after reading
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE} bytes"
            )
        
        with open(file_path, "wb") as f:
            f.write(content)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Save file record to database if db and current_user are provided
    if db and current_user:
        db_file = FileModel(
            filename=final_filename,
            original_filename=file.filename or "unknown",
            file_path=str(file_path),
            mime_type=file.content_type or "application/octet-stream",
            file_size=len(content),
            report_id=report_id,
            uploaded_by=current_user.id
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        file_id = str(db_file.id)  # Use database ID instead of random UUID
    
    return FileUploadResponse(
        file_id=file_id,
        filename=final_filename,
        original_filename=file.filename or "unknown",
        path=str(file_path),
        mime_type=file.content_type or "application/octet-stream",
        size=len(content),
        report_id=report_id,
        uploaded_at=datetime.utcnow()
    )


@router.post("/single", response_model=FileUploadResponse)
async def upload_single_file(
    file: UploadFile = FastAPIFile(...),
    report_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a single file with security validation"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    return await save_file(file, report_id, current_user, db)


@router.post("/multiple", response_model=MultipleFileUploadResponse)
async def upload_multiple_files(
    files: List[UploadFile] = FastAPIFile(...),
    report_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload multiple files with security validation"""
    if not files:
        raise HTTPException(status_code=400, detail="No files selected")
    
    if len(files) > 10:  # Limit number of files
        raise HTTPException(status_code=400, detail="Too many files. Maximum 10 files allowed")
    
    uploaded_files = []
    total_size = 0
    
    for file in files:
        if not file.filename:
            continue
            
        file_response = await save_file(file, report_id, current_user, db)
        uploaded_files.append(file_response)
        total_size += file_response.size
    
    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No valid files to upload")
    
    return MultipleFileUploadResponse(
        files=uploaded_files,
        total_files=len(uploaded_files),
        total_size=total_size
    )


@router.get("/", response_model=List[FileUploadResponse])
def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    report_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    """List files with optional filtering by report_id"""
    query = db.query(FileModel).filter(FileModel.uploaded_by == current_user.id)
    
    if report_id:
        query = query.filter(FileModel.report_id == report_id)
    
    files = query.offset(skip).limit(limit).all()
    
    return [
        FileUploadResponse(
            file_id=str(file.id),
            filename=file.filename,
            original_filename=file.original_filename,
            path=file.file_path,
            mime_type=file.mime_type,
            size=file.file_size,
            report_id=file.report_id,
            uploaded_at=file.created_at
        )
        for file in files
    ]


@router.get("/{file_id}", response_model=FileUploadResponse)
def get_file(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    file_id: str,
):
    """Get file information by ID"""
    file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if user has access to this file
    if file.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return FileUploadResponse(
        file_id=str(file.id),
        filename=file.filename,
        original_filename=file.original_filename,
        path=file.file_path,
        mime_type=file.mime_type,
        size=file.file_size,
        report_id=file.report_id,
        uploaded_at=file.created_at
    )


@router.delete("/{file_id}")
def delete_file(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    file_id: str,
):
    """Delete a file"""
    file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if user has access to this file
    if file.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # Delete file from disk
        file_path = Path(file.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete database record
        db.delete(file)
        db.commit()
        
        return {"message": "File deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")


@router.put("/{file_id}", response_model=FileUploadResponse)
def update_file_metadata(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    file_id: str,
    description: Optional[str] = Form(None),
):
    """Update file metadata"""
    file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if user has access to this file
    if file.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if description is not None:
        file.description = description
        db.commit()
        db.refresh(file)
    
    return FileUploadResponse(
        file_id=str(file.id),
        filename=file.filename,
        original_filename=file.original_filename,
        path=file.file_path,
        mime_type=file.mime_type,
        size=file.file_size,
        report_id=file.report_id,
        uploaded_at=file.created_at
    )