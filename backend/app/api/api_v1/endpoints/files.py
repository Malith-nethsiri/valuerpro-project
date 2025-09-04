"""
File management endpoints with cloud storage and validation.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import io
import logging
from datetime import datetime

from app.db import get_db
from app.models import User, File as FileModel
from app.deps import get_current_active_user
from app.services.cloud_storage import storage_service, CloudStorageError
from app.services.file_validator import validate_file_upload
from app.schemas.file import FileCreate, FileResponse, FileListResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form("document"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a file with validation and cloud storage."""
    
    # Validate the uploaded file
    validation_results = await validate_file_upload(file)
    
    try:
        # Upload to cloud storage
        storage_result = await storage_service.upload_file(
            file=file,
            user_id=str(current_user.id),
            metadata={
                'description': description or '',
                'category': category or 'document',
                'risk_level': validation_results.get('risk_level', 'low')
            }
        )
        
        # Save file record to database
        file_record = FileModel(
            filename=file.filename,
            original_filename=file.filename,
            file_path=storage_result.get('key', ''),  # Storage key for cloud files
            file_url=storage_result.get('url', ''),
            file_size=file.size or 0,
            mime_type=file.content_type or 'application/octet-stream',
            sha256_hash=validation_results.get('file_info', {}).get('sha256', ''),
            storage_provider=storage_result.get('provider', 'local'),
            uploaded_by=current_user.id,
            description=description,
            category=category or 'document',
            validation_status='passed',
            risk_level=validation_results.get('risk_level', 'low'),
            metadata_={
                'validation': validation_results,
                'storage': storage_result,
                'upload_timestamp': datetime.utcnow().isoformat()
            }
        )
        
        db.add(file_record)
        db.commit()
        db.refresh(file_record)
        
        logger.info(f"File uploaded successfully: {file.filename} by user {current_user.id}")
        
        return FileResponse(
            id=str(file_record.id),
            filename=file_record.filename,
            original_filename=file_record.original_filename,
            file_size=file_record.file_size,
            mime_type=file_record.mime_type,
            storage_provider=file_record.storage_provider,
            file_url=file_record.file_url,
            description=file_record.description,
            category=file_record.category,
            validation_status=file_record.validation_status,
            risk_level=file_record.risk_level,
            uploaded_at=file_record.uploaded_at,
            uploaded_by=str(file_record.uploaded_by)
        )
        
    except CloudStorageError as e:
        logger.error(f"Cloud storage error: {e}")
        raise HTTPException(status_code=500, detail=f"Storage failed: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/", response_model=FileListResponse)
async def list_files(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List files uploaded by the current user."""
    
    query = db.query(FileModel).filter(FileModel.uploaded_by == current_user.id)
    
    if category:
        query = query.filter(FileModel.category == category)
    
    # Get total count
    total = query.count()
    
    # Get files with pagination
    files = query.offset(skip).limit(limit).all()
    
    file_responses = []
    for file_record in files:
        file_responses.append(FileResponse(
            id=str(file_record.id),
            filename=file_record.filename,
            original_filename=file_record.original_filename,
            file_size=file_record.file_size,
            mime_type=file_record.mime_type,
            storage_provider=file_record.storage_provider,
            file_url=file_record.file_url,
            description=file_record.description,
            category=file_record.category,
            validation_status=file_record.validation_status,
            risk_level=file_record.risk_level,
            uploaded_at=file_record.uploaded_at,
            uploaded_by=str(file_record.uploaded_by)
        ))
    
    return FileListResponse(
        files=file_responses,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{file_id}")
async def get_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get file metadata by ID."""
    
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.uploaded_by == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        id=str(file_record.id),
        filename=file_record.filename,
        original_filename=file_record.original_filename,
        file_size=file_record.file_size,
        mime_type=file_record.mime_type,
        storage_provider=file_record.storage_provider,
        file_url=file_record.file_url,
        description=file_record.description,
        category=file_record.category,
        validation_status=file_record.validation_status,
        risk_level=file_record.risk_level,
        uploaded_at=file_record.uploaded_at,
        uploaded_by=str(file_record.uploaded_by)
    )


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download file content."""
    
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.uploaded_by == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Download from storage
        file_content = await storage_service.download_file(file_record.file_path)
        
        # Create streaming response
        def iter_file():
            yield file_content
        
        headers = {
            'Content-Disposition': f'attachment; filename="{file_record.original_filename}"',
            'Content-Type': file_record.mime_type,
            'Content-Length': str(len(file_content))
        }
        
        return StreamingResponse(
            iter_file(),
            media_type=file_record.mime_type,
            headers=headers
        )
        
    except CloudStorageError as e:
        logger.error(f"File download error: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/{file_id}/url")
async def get_file_url(
    file_id: str,
    expires_in: int = 3600,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a presigned URL for file access."""
    
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.uploaded_by == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Get presigned URL from storage service
        file_url = await storage_service.get_file_url(
            file_record.file_path, 
            expires_in
        )
        
        return {
            'url': file_url,
            'expires_in': expires_in,
            'filename': file_record.original_filename
        }
        
    except CloudStorageError as e:
        logger.error(f"URL generation error: {e}")
        raise HTTPException(status_code=500, detail=f"URL generation failed: {str(e)}")


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a file."""
    
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.uploaded_by == current_user.id
    ).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Delete from storage
        storage_deleted = await storage_service.delete_file(file_record.file_path)
        
        # Delete from database
        db.delete(file_record)
        db.commit()
        
        logger.info(f"File deleted: {file_record.filename} by user {current_user.id}")
        
        return {
            'message': 'File deleted successfully',
            'filename': file_record.original_filename,
            'storage_deleted': storage_deleted
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"File deletion error: {e}")
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")


@router.post("/validate")
async def validate_file_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Validate a file without uploading it."""
    
    try:
        validation_results = await validate_file_upload(file)
        return {
            'valid': validation_results['valid'],
            'filename': file.filename,
            'file_info': validation_results.get('file_info', {}),
            'errors': validation_results.get('errors', []),
            'warnings': validation_results.get('warnings', []),
            'risk_level': validation_results.get('risk_level', 'low'),
            'security_scan': validation_results.get('security_scan', {}),
            'content_validation': validation_results.get('content_validation', {})
        }
    except HTTPException as e:
        return {
            'valid': False,
            'filename': file.filename,
            'errors': [e.detail['message']] if isinstance(e.detail, dict) else [str(e.detail)],
            'risk_level': 'high'
        }


@router.get("/categories")
async def get_file_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of file categories used by the current user."""
    
    categories = db.query(FileModel.category)\
        .filter(FileModel.uploaded_by == current_user.id)\
        .distinct()\
        .all()
    
    return {
        'categories': [cat[0] for cat in categories if cat[0]],
        'default_categories': [
            'document',
            'image', 
            'report',
            'title_deed',
            'survey_plan',
            'valuation_report',
            'photograph',
            'other'
        ]
    }


@router.get("/stats")
async def get_file_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get file upload statistics for the current user."""
    
    # Get total files and storage used
    files = db.query(FileModel).filter(FileModel.uploaded_by == current_user.id).all()
    
    total_files = len(files)
    total_storage = sum(f.file_size for f in files)
    
    # Group by category
    category_stats = {}
    for file in files:
        category = file.category or 'other'
        if category not in category_stats:
            category_stats[category] = {'count': 0, 'size': 0}
        category_stats[category]['count'] += 1
        category_stats[category]['size'] += file.file_size
    
    # Group by risk level
    risk_stats = {}
    for file in files:
        risk = file.risk_level or 'unknown'
        risk_stats[risk] = risk_stats.get(risk, 0) + 1
    
    return {
        'total_files': total_files,
        'total_storage_bytes': total_storage,
        'total_storage_mb': round(total_storage / (1024 * 1024), 2),
        'storage_limit_mb': round(settings.MAX_FILE_SIZE * 100 / (1024 * 1024), 2),  # Assume 100 files limit
        'category_breakdown': category_stats,
        'risk_level_breakdown': risk_stats,
        'cloud_storage_enabled': storage_service.is_cloud_provider()
    }