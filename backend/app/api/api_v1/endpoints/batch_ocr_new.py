"""
Clean Batch OCR Endpoint - Rewritten from scratch
Simple, reliable batch OCR processing using our clean Vision service
"""
import time
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, File as FileModel, OCRResult
from app.deps import get_current_active_user
from app.services.vision_ocr import extract_text_from_file
from app.services.ai_extraction import process_document_with_ai, detect_document_type

router = APIRouter()


class BatchOCRRequest(BaseModel):
    file_ids: List[UUID]
    consolidate_analysis: bool = True
    auto_populate: bool = True


class BatchOCRFileResult(BaseModel):
    file_id: UUID
    filename: str
    success: bool
    document_type: Optional[str] = None
    ocr_text: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None


class BatchOCRResponse(BaseModel):
    batch_id: str
    total_files: int
    successful_files: int
    failed_files: int
    files: List[BatchOCRFileResult]
    total_processing_time: float


def validate_file_access(file_path: str, current_user: User) -> str:
    """Validate file exists and user has access"""
    from pathlib import Path
    
    file_path_obj = Path(file_path)
    if not file_path_obj.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Basic security check - file should be in uploads directory
    if 'uploads' not in str(file_path_obj):
        raise HTTPException(status_code=403, detail="File access denied")
    
    return str(file_path_obj.absolute())


async def process_single_file(
    file_model: FileModel,
    current_user: User,
    db: Session
) -> BatchOCRFileResult:
    """Process a single file with OCR and AI analysis"""
    start_time = time.time()
    
    print(f"[BATCH OCR] Processing file: {file_model.original_filename} (ID: {file_model.id})")
    
    try:
        # Validate file access
        file_path = validate_file_access(file_model.file_path, current_user)
        
        # Run OCR using our clean service
        print(f"[BATCH OCR] Starting OCR extraction for {file_model.original_filename}")
        ocr_result = extract_text_from_file(file_path)
        full_text = ocr_result.text
        
        print(f"[BATCH OCR] OCR completed. Text length: {len(full_text)}")
        
        # Save OCR result to database
        ocr_record = OCRResult(
            file_id=file_model.id,
            processed_by=current_user.id,
            raw_text=full_text,
            blocks_json={"pages": [{"page": 1, "text": full_text}]},  # Simplified
            processing_time=int((time.time() - start_time) * 1000)
        )
        db.add(ocr_record)
        
        # Detect document type and run AI analysis
        document_type = None
        ai_analysis = None
        
        if full_text.strip():
            print(f"[BATCH OCR] Running AI analysis for {file_model.original_filename}")
            document_type = detect_document_type(full_text)
            ai_analysis = process_document_with_ai(full_text, document_type)
            print(f"[BATCH OCR] AI analysis completed. Document type: {document_type}")
        else:
            print(f"[BATCH OCR] No text extracted, skipping AI analysis")
        
        # Update OCR record with AI data
        ocr_record.document_type = document_type
        ocr_record.ai_extracted_data = ai_analysis
        
        db.commit()
        
        processing_time = time.time() - start_time
        
        print(f"[BATCH OCR] Successfully processed {file_model.original_filename} in {processing_time:.2f}s")
        
        return BatchOCRFileResult(
            file_id=file_model.id,
            filename=file_model.original_filename,
            success=True,
            document_type=document_type,
            ocr_text=full_text,
            ai_analysis=ai_analysis,
            processing_time=processing_time
        )
        
    except Exception as e:
        error_msg = str(e)
        processing_time = time.time() - start_time
        
        print(f"[BATCH OCR] Failed to process {file_model.original_filename}: {error_msg}")
        
        # Still try to commit any partial data
        try:
            db.commit()
        except:
            pass
        
        return BatchOCRFileResult(
            file_id=file_model.id,
            filename=file_model.original_filename,
            success=False,
            error=error_msg,
            processing_time=processing_time
        )


@router.post("/batch-process", response_model=BatchOCRResponse)
async def batch_process_documents(
    request: BatchOCRRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Process multiple documents with OCR and AI analysis - Clean Implementation
    """
    start_time = time.time()
    batch_id = f"batch_{int(time.time())}"
    
    print(f"[BATCH OCR] Starting batch {batch_id} with {len(request.file_ids)} files")
    
    # Validate file access
    files = []
    for file_id in request.file_ids:
        file_obj = db.query(FileModel).filter(
            FileModel.id == file_id,
            FileModel.uploaded_by == current_user.id
        ).first()
        
        if not file_obj:
            raise HTTPException(
                status_code=404,
                detail=f"File {file_id} not found or access denied"
            )
        
        files.append(file_obj)
    
    print(f"[BATCH OCR] All {len(files)} files validated")
    
    # Process each file
    results = []
    for file_obj in files:
        result = await process_single_file(file_obj, current_user, db)
        results.append(result)
    
    # Calculate summary
    successful_files = sum(1 for r in results if r.success)
    failed_files = len(results) - successful_files
    total_processing_time = time.time() - start_time
    
    print(f"[BATCH OCR] Batch {batch_id} completed:")
    print(f"[BATCH OCR]   Total files: {len(results)}")
    print(f"[BATCH OCR]   Successful: {successful_files}")
    print(f"[BATCH OCR]   Failed: {failed_files}")
    print(f"[BATCH OCR]   Total time: {total_processing_time:.2f}s")
    
    return BatchOCRResponse(
        batch_id=batch_id,
        total_files=len(results),
        successful_files=successful_files,
        failed_files=failed_files,
        files=results,
        total_processing_time=total_processing_time
    )