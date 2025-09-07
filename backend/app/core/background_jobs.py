"""
Background job queue system for long-running tasks like OCR, AI processing, and document generation
"""
import asyncio
import json
import logging
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
import uuid
from concurrent.futures import ThreadPoolExecutor
import threading

logger = logging.getLogger(__name__)


class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(Enum):
    OCR_PROCESSING = "ocr_processing"
    DOCUMENT_ANALYSIS = "document_analysis"
    PDF_GENERATION = "pdf_generation"
    DOCX_GENERATION = "docx_generation"
    BATCH_PARSING = "batch_parsing"
    EMAIL_DELIVERY = "email_delivery"


@dataclass
class JobResult:
    """Result of a background job"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time_seconds: Optional[float] = None


@dataclass
class BackgroundJob:
    """Background job data structure"""
    id: str
    type: JobType
    status: JobStatus
    user_id: str
    payload: Dict[str, Any]
    result: Optional[JobResult] = None
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress_percent: int = 0
    progress_message: str = ""
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "type": self.type.value,
            "status": self.status.value,
            "user_id": self.user_id,
            "payload": self.payload,
            "result": asdict(self.result) if self.result else None,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "progress_percent": self.progress_percent,
            "progress_message": self.progress_message
        }


class JobQueue:
    """In-memory job queue with thread pool execution"""
    
    def __init__(self, max_workers: int = 4):
        self.jobs: Dict[str, BackgroundJob] = {}
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._lock = threading.Lock()
        self.job_handlers: Dict[JobType, Callable] = {}
        
        # Register default job handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default job handlers"""
        # from app.services.ai_extraction import process_document_with_ai  # Temporarily disabled
        from app.services.document_generation import document_service
        # from app.api.api_v1.endpoints.ai import extract_text, perform_cross_validation  # Temporarily disabled
        
        # Register handlers for different job types
        self.job_handlers[JobType.OCR_PROCESSING] = self._handle_ocr_job
        self.job_handlers[JobType.DOCUMENT_ANALYSIS] = self._handle_analysis_job
        self.job_handlers[JobType.PDF_GENERATION] = self._handle_pdf_generation
        self.job_handlers[JobType.DOCX_GENERATION] = self._handle_docx_generation
        self.job_handlers[JobType.BATCH_PARSING] = self._handle_batch_parsing
    
    def submit_job(self, job_type: JobType, user_id: str, payload: Dict[str, Any]) -> str:
        """Submit a new background job"""
        job_id = str(uuid.uuid4())
        
        job = BackgroundJob(
            id=job_id,
            type=job_type,
            status=JobStatus.PENDING,
            user_id=user_id,
            payload=payload
        )
        
        with self._lock:
            self.jobs[job_id] = job
        
        # Submit to thread pool
        self.executor.submit(self._execute_job, job_id)
        
        logger.info(f"Submitted job {job_id} of type {job_type.value} for user {user_id}")
        return job_id
    
    def get_job(self, job_id: str, user_id: str = None) -> Optional[BackgroundJob]:
        """Get job by ID with optional user validation"""
        with self._lock:
            job = self.jobs.get(job_id)
            if job and (user_id is None or job.user_id == user_id):
                return job
        return None
    
    def get_user_jobs(self, user_id: str, limit: int = 50) -> List[BackgroundJob]:
        """Get jobs for a specific user"""
        with self._lock:
            user_jobs = [job for job in self.jobs.values() if job.user_id == user_id]
            # Sort by creation time, most recent first
            user_jobs.sort(key=lambda x: x.created_at, reverse=True)
            return user_jobs[:limit]
    
    def cancel_job(self, job_id: str, user_id: str) -> bool:
        """Cancel a pending or running job"""
        with self._lock:
            job = self.jobs.get(job_id)
            if job and job.user_id == user_id and job.status in [JobStatus.PENDING, JobStatus.RUNNING]:
                job.status = JobStatus.CANCELLED
                job.completed_at = datetime.utcnow()
                logger.info(f"Cancelled job {job_id}")
                return True
        return False
    
    def _execute_job(self, job_id: str):
        """Execute a background job"""
        with self._lock:
            job = self.jobs.get(job_id)
            if not job or job.status != JobStatus.PENDING:
                return
            
            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
        
        try:
            # Get handler for job type
            handler = self.job_handlers.get(job.type)
            if not handler:
                raise Exception(f"No handler registered for job type {job.type.value}")
            
            # Execute the job
            start_time = datetime.utcnow()
            result_data = handler(job)
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Update job with success result
            with self._lock:
                job.result = JobResult(
                    success=True,
                    data=result_data,
                    execution_time_seconds=execution_time
                )
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                job.progress_percent = 100
                job.progress_message = "Completed successfully"
            
            logger.info(f"Job {job_id} completed successfully in {execution_time:.2f}s")
        
        except Exception as e:
            # Update job with failure result
            with self._lock:
                if job.status != JobStatus.CANCELLED:  # Don't override cancellation
                    job.result = JobResult(
                        success=False,
                        error=str(e)
                    )
                    job.status = JobStatus.FAILED
                    job.completed_at = datetime.utcnow()
                    job.progress_message = f"Failed: {str(e)}"
            
            logger.error(f"Job {job_id} failed: {str(e)}")
    
    def _update_progress(self, job_id: str, percent: int, message: str):
        """Update job progress"""
        with self._lock:
            job = self.jobs.get(job_id)
            if job:
                job.progress_percent = percent
                job.progress_message = message
    
    def _handle_ocr_job(self, job: BackgroundJob) -> Dict[str, Any]:
        """Handle OCR processing job - TEMPORARILY DISABLED"""
        # from app.api.api_v1.endpoints.ai import extract_text, OCRRequest  # Temporarily disabled
        from app.db import SessionLocal
        from app.models import User
        
        payload = job.payload
        file_id = payload.get("file_id")
        
        if not file_id:
            raise Exception("file_id is required for OCR job")
        
        self._update_progress(job.id, 10, "Starting OCR processing...")
        
        # Create database session
        db = SessionLocal()
        try:
            # Get user
            user = db.query(User).filter(User.id == job.user_id).first()
            if not user:
                raise Exception("User not found")
            
            self._update_progress(job.id, 30, "Extracting text from document...")
            
            # Run OCR extraction
            # ocr_request = OCRRequest(file_id=file_id)  # Temporarily disabled
            # ocr_result = extract_text(ocr_request, user, db)  # Temporarily disabled
            ocr_result = {"error": "OCR background job temporarily disabled"}
            
            self._update_progress(job.id, 90, "Finalizing results...")
            
            return {
                "file_id": file_id,
                "ocr_result": {
                    "pages": [page.dict() for page in ocr_result.pages],
                    "full_text": ocr_result.full_text,
                    "page_count": len(ocr_result.pages),
                    "total_characters": len(ocr_result.full_text)
                }
            }
        
        finally:
            db.close()
    
    def _handle_analysis_job(self, job: BackgroundJob) -> Dict[str, Any]:
        """Handle document analysis job"""
        # from app.services.ai_extraction import process_document_with_ai  # Temporarily disabled
        
        payload = job.payload
        text = payload.get("text")
        document_type = payload.get("document_type")
        
        if not text:
            raise Exception("text is required for analysis job")
        
        self._update_progress(job.id, 20, "Analyzing document...")
        
        # Run AI analysis
        # analysis_result = process_document_with_ai(text, document_type)  # Temporarily disabled
        analysis_result = {"error": "AI analysis temporarily disabled"}
        
        self._update_progress(job.id, 90, "Finalizing analysis...")
        
        return {
            "analysis": analysis_result,
            "text_length": len(text),
            "document_type": analysis_result.get("document_type")
        }
    
    def _handle_pdf_generation(self, job: BackgroundJob) -> Dict[str, Any]:
        """Handle PDF generation job"""
        from app.services.document_generation import document_service
        from app.db import SessionLocal
        from app.models import User, Report
        
        payload = job.payload
        report_id = payload.get("report_id")
        
        if not report_id:
            raise Exception("report_id is required for PDF generation job")
        
        self._update_progress(job.id, 20, "Loading report data...")
        
        # Create database session
        db = SessionLocal()
        try:
            # Get user and report
            user = db.query(User).filter(User.id == job.user_id).first()
            report = db.query(Report).filter(Report.id == report_id).first()
            
            if not user:
                raise Exception("User not found")
            if not report:
                raise Exception("Report not found")
            if report.author_id != user.id:
                raise Exception("Unauthorized access to report")
            
            self._update_progress(job.id, 50, "Generating PDF document...")
            
            # Generate PDF
            pdf_buffer = document_service.generate_pdf_report(report, user)
            
            self._update_progress(job.id, 90, "Finalizing document...")
            
            return {
                "report_id": report_id,
                "pdf_size_bytes": len(pdf_buffer.getvalue()),
                "generated_at": datetime.utcnow().isoformat()
            }
        
        finally:
            db.close()
    
    def _handle_docx_generation(self, job: BackgroundJob) -> Dict[str, Any]:
        """Handle DOCX generation job"""
        from app.services.document_generation import document_service
        from app.db import SessionLocal
        from app.models import User, Report
        
        payload = job.payload
        report_id = payload.get("report_id")
        
        if not report_id:
            raise Exception("report_id is required for DOCX generation job")
        
        self._update_progress(job.id, 20, "Loading report data...")
        
        # Create database session
        db = SessionLocal()
        try:
            # Get user and report
            user = db.query(User).filter(User.id == job.user_id).first()
            report = db.query(Report).filter(Report.id == report_id).first()
            
            if not user:
                raise Exception("User not found")
            if not report:
                raise Exception("Report not found")
            if report.author_id != user.id:
                raise Exception("Unauthorized access to report")
            
            self._update_progress(job.id, 50, "Generating DOCX document...")
            
            # Generate DOCX
            docx_buffer = document_service.generate_docx_report(report, user)
            
            self._update_progress(job.id, 90, "Finalizing document...")
            
            return {
                "report_id": report_id,
                "docx_size_bytes": len(docx_buffer.getvalue()),
                "generated_at": datetime.utcnow().isoformat()
            }
        
        finally:
            db.close()
    
    def _handle_batch_parsing(self, job: BackgroundJob) -> Dict[str, Any]:
        """Handle batch document parsing job"""
        from app.api.api_v1.endpoints.ai import DocumentBatchParseRequest, parse_documents
        from app.db import SessionLocal
        from app.models import User
        
        payload = job.payload
        file_ids = payload.get("file_ids", [])
        report_id = payload.get("report_id")
        
        if not file_ids:
            raise Exception("file_ids are required for batch parsing job")
        
        self._update_progress(job.id, 10, f"Starting batch parsing of {len(file_ids)} files...")
        
        # Create database session
        db = SessionLocal()
        try:
            # Get user
            user = db.query(User).filter(User.id == job.user_id).first()
            if not user:
                raise Exception("User not found")
            
            # Create batch parse request
            request = DocumentBatchParseRequest(
                file_ids=file_ids,
                report_id=report_id,
                auto_populate=True
            )
            
            self._update_progress(job.id, 50, "Processing documents with AI...")
            
            # Run batch parsing
            result = parse_documents(request, user, db)
            
            self._update_progress(job.id, 90, "Finalizing batch results...")
            
            return {
                "batch_results": result.dict(),
                "total_files": len(file_ids),
                "successful_files": result.summary.get("successful_extractions", 0)
            }
        
        finally:
            db.close()
    
    def cleanup_old_jobs(self, max_age_days: int = 7):
        """Clean up old completed jobs"""
        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)
        
        with self._lock:
            jobs_to_remove = []
            for job_id, job in self.jobs.items():
                if (job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED] 
                    and job.completed_at and job.completed_at < cutoff_date):
                    jobs_to_remove.append(job_id)
            
            for job_id in jobs_to_remove:
                del self.jobs[job_id]
            
            logger.info(f"Cleaned up {len(jobs_to_remove)} old jobs")


# Global job queue instance
job_queue = JobQueue()


def submit_ocr_job(user_id: str, file_id: str) -> str:
    """Submit an OCR processing job"""
    return job_queue.submit_job(
        JobType.OCR_PROCESSING,
        user_id,
        {"file_id": file_id}
    )


def submit_analysis_job(user_id: str, text: str, document_type: str = None) -> str:
    """Submit a document analysis job"""
    return job_queue.submit_job(
        JobType.DOCUMENT_ANALYSIS,
        user_id,
        {"text": text, "document_type": document_type}
    )


def submit_pdf_generation_job(user_id: str, report_id: str) -> str:
    """Submit a PDF generation job"""
    return job_queue.submit_job(
        JobType.PDF_GENERATION,
        user_id,
        {"report_id": report_id}
    )


def submit_docx_generation_job(user_id: str, report_id: str) -> str:
    """Submit a DOCX generation job"""
    return job_queue.submit_job(
        JobType.DOCX_GENERATION,
        user_id,
        {"report_id": report_id}
    )


def submit_batch_parsing_job(user_id: str, file_ids: List[str], report_id: str = None) -> str:
    """Submit a batch document parsing job"""
    return job_queue.submit_job(
        JobType.BATCH_PARSING,
        user_id,
        {"file_ids": file_ids, "report_id": report_id}
    )


def get_job_status(job_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
    """Get job status"""
    job = job_queue.get_job(job_id, user_id)
    return job.to_dict() if job else None


def get_user_jobs(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get jobs for a user"""
    jobs = job_queue.get_user_jobs(user_id, limit)
    return [job.to_dict() for job in jobs]


def cancel_job(job_id: str, user_id: str) -> bool:
    """Cancel a job"""
    return job_queue.cancel_job(job_id, user_id)