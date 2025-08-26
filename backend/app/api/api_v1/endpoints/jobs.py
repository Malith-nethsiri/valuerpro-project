"""
Background Jobs API endpoints
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.models import User
from app.deps import get_current_active_user
from app.core.background_jobs import (
    job_queue, submit_ocr_job, submit_analysis_job, submit_pdf_generation_job,
    submit_docx_generation_job, submit_batch_parsing_job, get_job_status,
    get_user_jobs, cancel_job, JobType
)

router = APIRouter()


class OCRJobRequest(BaseModel):
    file_id: str


class AnalysisJobRequest(BaseModel):
    text: str
    document_type: str = None


class DocumentGenerationJobRequest(BaseModel):
    report_id: str


class BatchParsingJobRequest(BaseModel):
    file_ids: List[str]
    report_id: str = None


class JobResponse(BaseModel):
    job_id: str
    message: str


@router.post("/ocr", response_model=JobResponse)
def submit_ocr_job_endpoint(
    request: OCRJobRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit an OCR processing job"""
    job_id = submit_ocr_job(current_user.id, request.file_id)
    
    return JobResponse(
        job_id=job_id,
        message=f"OCR job submitted successfully. Job ID: {job_id}"
    )


@router.post("/analysis", response_model=JobResponse)
def submit_analysis_job_endpoint(
    request: AnalysisJobRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit a document analysis job"""
    job_id = submit_analysis_job(
        current_user.id, 
        request.text, 
        request.document_type
    )
    
    return JobResponse(
        job_id=job_id,
        message=f"Analysis job submitted successfully. Job ID: {job_id}"
    )


@router.post("/generate-pdf", response_model=JobResponse)
def submit_pdf_generation_job_endpoint(
    request: DocumentGenerationJobRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit a PDF generation job"""
    job_id = submit_pdf_generation_job(current_user.id, request.report_id)
    
    return JobResponse(
        job_id=job_id,
        message=f"PDF generation job submitted successfully. Job ID: {job_id}"
    )


@router.post("/generate-docx", response_model=JobResponse)
def submit_docx_generation_job_endpoint(
    request: DocumentGenerationJobRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit a DOCX generation job"""
    job_id = submit_docx_generation_job(current_user.id, request.report_id)
    
    return JobResponse(
        job_id=job_id,
        message=f"DOCX generation job submitted successfully. Job ID: {job_id}"
    )


@router.post("/batch-parse", response_model=JobResponse)
def submit_batch_parsing_job_endpoint(
    request: BatchParsingJobRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit a batch document parsing job"""
    job_id = submit_batch_parsing_job(
        current_user.id, 
        request.file_ids,
        request.report_id
    )
    
    return JobResponse(
        job_id=job_id,
        message=f"Batch parsing job submitted successfully. Job ID: {job_id}"
    )


@router.get("/{job_id}")
def get_job_status_endpoint(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get job status and results"""
    job_data = get_job_status(job_id, current_user.id)
    
    if not job_data:
        raise HTTPException(
            status_code=404,
            detail="Job not found or access denied"
        )
    
    return job_data


@router.get("/")
def get_user_jobs_endpoint(
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all jobs for the current user"""
    jobs = get_user_jobs(current_user.id, limit)
    
    return {
        "jobs": jobs,
        "total": len(jobs)
    }


@router.delete("/{job_id}")
def cancel_job_endpoint(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a running job"""
    success = cancel_job(job_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Job not found, access denied, or cannot be cancelled"
        )
    
    return {"message": f"Job {job_id} cancelled successfully"}


@router.get("/stats/summary")
def get_job_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get job statistics for the current user"""
    user_jobs = get_user_jobs(current_user.id, 1000)  # Get more jobs for stats
    
    stats = {
        "total_jobs": len(user_jobs),
        "by_status": {},
        "by_type": {},
        "recent_jobs": user_jobs[:10]  # Most recent 10 jobs
    }
    
    for job in user_jobs:
        status = job["status"]
        job_type = job["type"]
        
        stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
        stats["by_type"][job_type] = stats["by_type"].get(job_type, 0) + 1
    
    return stats