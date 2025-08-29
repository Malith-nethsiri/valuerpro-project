from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID
import logging
from datetime import datetime

from app.db import get_db
from app.models import (
    Report, User, File as FileModel, OCRResult, Client, Property,
    Identification, Location, ValuationLine, ValuationSummary
)
from app.schemas import (
    ReportCreate, ReportUpdate, Report as ReportSchema, ReportWithAuthor,
    OCRResultWithFile, File as FileSchema, ClientCreate, Client as ClientSchema,
    PropertyCreate, Property as PropertySchema, IdentificationCreate,
    LocationCreate, ValuationLineCreate, ValuationSummaryCreate,
    ValuationLine as ValuationLineSchema, ValuationSummary as ValuationSummarySchema
)
from app.deps import get_current_active_user
from app.services.document_generation import document_service
from app.services.validation_engine import create_validation_engine
from app.services.appendix_generator import create_appendix_generator

router = APIRouter()


# Client management endpoints
@router.post("/clients/", response_model=ClientSchema)
def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client_data = client_in.model_dump()
    client_data["author_id"] = current_user.id  # Associate with current user
    client = Client(**client_data)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/clients/", response_model=List[ClientSchema])
def list_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Filter clients by current user
    clients = db.query(Client).filter(Client.author_id == current_user.id).offset(skip).limit(limit).all()
    return clients


@router.get("/clients/{client_id}", response_model=ClientSchema)
def get_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(Client).filter(
        Client.id == client_id, 
        Client.author_id == current_user.id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/clients/{client_id}", response_model=ClientSchema)
def update_client(
    client_id: str,
    client_in: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(Client).filter(
        Client.id == client_id, 
        Client.author_id == current_user.id
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update client data
    for field, value in client_in.model_dump().items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    return client


# Report management endpoints
@router.post("/", response_model=ReportSchema)
def create_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if reference number is provided and already exists
    if report_in.ref:
        existing_report = db.query(Report).filter(
            Report.ref == report_in.ref
        ).first()
        if existing_report:
            raise HTTPException(
                status_code=400, 
                detail=f"A report with reference number '{report_in.ref}' already exists"
            )
    
    # Create client if provided
    client = None
    if report_in.client_id:
        client = db.query(Client).filter(
            Client.id == report_in.client_id,
            Client.author_id == current_user.id
        ).first()
        if not client:
            raise HTTPException(status_code=400, detail="Client not found")
    
    report = Report(
        ref=report_in.ref,
        purpose=report_in.purpose,
        basis_of_value=report_in.basis_of_value,
        report_type=report_in.report_type,
        status=report_in.status or "draft",
        report_date=report_in.report_date or datetime.utcnow(),
        inspection_date=report_in.inspection_date,
        currency=report_in.currency,
        fsv_percentage=report_in.fsv_percentage,
        author_id=current_user.id,
        client_id=report_in.client_id
    )
    db.add(report)
    
    try:
        db.commit()
        db.refresh(report)
        return report
    except IntegrityError as e:
        db.rollback()
        if "ref" in str(e):
            raise HTTPException(
                status_code=400, 
                detail=f"A report with reference number '{report_in.ref}' already exists"
            )
        raise HTTPException(status_code=400, detail="Database constraint violation")


@router.get("/", response_model=List[ReportWithAuthor])
def list_reports(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Report).filter(
        Report.author_id == current_user.id
    )
    
    if status:
        query = query.filter(Report.status == status)
    
    reports = query.offset(skip).limit(limit).all()
    return reports


@router.get("/{report_id}", response_model=ReportWithAuthor)
def get_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    return report


@router.put("/{report_id}", response_model=ReportSchema)
def update_report(
    report_id: UUID,
    report_in: ReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    update_data = report_in.model_dump(exclude_unset=True)
    
    # Check for duplicate reference if ref is being updated
    if 'ref' in update_data and update_data['ref']:
        # Only check if the reference is actually changing
        if update_data['ref'] != report.ref:
            existing_report = db.query(Report).filter(
                Report.ref == update_data['ref'],
                Report.author_id == current_user.id,
                Report.id != report_id  # Exclude current report
            ).first()
            
            if existing_report:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Reference number '{update_data['ref']}' already exists"
                )
    
    for field, value in update_data.items():
        setattr(report, field, value)
    
    db.commit()
    db.refresh(report)
    return report


@router.get("/check-reference/{ref}")
def check_reference_availability(
    ref: str,
    report_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check if a reference number is available for use"""
    query = db.query(Report).filter(
        Report.ref == ref,
        Report.author_id == current_user.id
    )
    
    # Exclude current report if updating
    if report_id:
        query = query.filter(Report.id != report_id)
    
    existing_report = query.first()
    
    return {
        "available": existing_report is None,
        "ref": ref,
        "message": "Reference available" if existing_report is None else f"Reference '{ref}' already exists"
    }


@router.delete("/{report_id}")
def delete_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}


# Report finalization
@router.post("/{report_id}/finalize")
def finalize_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    # Validate report is ready for finalization
    if not report.ref:
        raise HTTPException(status_code=400, detail="Report reference number is required")
    if not report.purpose:
        raise HTTPException(status_code=400, detail="Report purpose is required")
    if not report.inspection_date:
        raise HTTPException(status_code=400, detail="Inspection date is required")
    
    # Check if report has at least one property
    property_count = db.query(Property).filter(Property.report_id == report_id).count()
    if property_count == 0:
        raise HTTPException(status_code=400, detail="Report must have at least one property")
    
    # Check if report has valuation data
    valuation_summary = db.query(ValuationSummary).filter(ValuationSummary.report_id == report_id).first()
    if not valuation_summary:
        raise HTTPException(status_code=400, detail="Report must have valuation summary")
    
    # Finalize the report
    report.status = "finalized"
    report.finalized_at = datetime.utcnow()
    
    db.commit()
    db.refresh(report)
    
    return {"message": "Report finalized successfully", "status": report.status}


@router.get("/{report_id}/validate")
def validate_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Validate report completeness and business rules
    Returns validation status, errors, warnings, and completion percentage
    """
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    try:
        # Run validation using the validation engine
        validation_engine = create_validation_engine(db)
        validation_report = validation_engine.validate_report(str(report_id))
        
        # Convert to JSON-serializable format
        return {
            "report_id": validation_report.report_id,
            "is_valid": validation_report.is_valid,
            "can_finalize": validation_report.can_finalize,
            "completion_percentage": validation_report.completion_percentage,
            "total_issues": validation_report.total_issues,
            "error_count": validation_report.error_count,
            "warning_count": validation_report.warning_count,
            "errors": [
                {
                    "rule": error.rule,
                    "message": error.message,
                    "field": error.field,
                    "section": error.section
                }
                for error in validation_report.errors
            ],
            "warnings": [
                {
                    "rule": warning.rule,
                    "message": warning.message,
                    "field": warning.field,
                    "section": warning.section
                }
                for warning in validation_report.warnings
            ],
            "info": [
                {
                    "rule": info.rule,
                    "message": info.message,
                    "field": info.field,
                    "section": info.section
                }
                for info in validation_report.info
            ]
        }
    
    except Exception as e:
        logging.error(f"Validation failed for report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/{report_id}/pre-finalize-check")
def pre_finalize_check(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Run pre-finalization checks to ensure report meets minimum requirements
    Returns detailed validation results and recommendations
    """
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    try:
        # Run comprehensive validation
        validation_engine = create_validation_engine(db)
        validation_report = validation_engine.validate_report(str(report_id))
        
        # Generate recommendations for improvement
        recommendations = []
        
        if validation_report.completion_percentage < 80:
            recommendations.append("Complete all required sections to reach 80% completion threshold")
        
        if validation_report.error_count > 0:
            recommendations.append("Fix all validation errors before attempting to finalize")
        
        if validation_report.warning_count > 5:
            recommendations.append("Consider addressing validation warnings for better report quality")
        
        # Check specific business requirements
        valuation_summary = db.query(ValuationSummary).filter(
            ValuationSummary.report_id == report_id
        ).first()
        
        if not valuation_summary or not valuation_summary.market_value_words:
            recommendations.append("Ensure market value is converted to words format")
        
        return {
            "can_finalize": validation_report.can_finalize,
            "validation_summary": {
                "completion_percentage": validation_report.completion_percentage,
                "total_issues": validation_report.total_issues,
                "critical_errors": validation_report.error_count,
                "warnings": validation_report.warning_count
            },
            "blocking_errors": [
                {
                    "rule": error.rule,
                    "message": error.message,
                    "section": error.section,
                    "field": error.field
                }
                for error in validation_report.errors
            ],
            "recommendations": recommendations,
            "next_steps": [
                "Review and fix all blocking errors",
                "Complete missing required sections",
                "Verify all calculations and amounts",
                "Review professional standards compliance"
            ] if not validation_report.can_finalize else [
                "Report is ready for finalization",
                "All validation checks passed",
                "Professional standards requirements met"
            ]
        }
        
    except Exception as e:
        logging.error(f"Pre-finalization check failed for report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pre-finalization check failed: {str(e)}")


@router.post("/{report_id}/generate-appendices")
def generate_report_appendices(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate professional appendices for the report including location maps,
    organized photographs, and survey plan references
    """
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    try:
        # Generate all appendices using the appendix generator
        appendix_generator = create_appendix_generator(db)
        appendices = appendix_generator.generate_all_appendices(str(report_id))
        
        if not appendices:
            return {
                "message": "No appendices could be generated",
                "reason": "Insufficient data (location coordinates, files, etc.)",
                "suggestions": [
                    "Add property location coordinates for map generation",
                    "Upload survey plans and photographs",
                    "Ensure Google Maps API is configured"
                ]
            }
        
        # Save appendix references to database
        appendix_generator.save_appendix_references(str(report_id), appendices)
        
        # Return summary of generated appendices
        appendix_summary = {}
        for appendix_type, data in appendices.items():
            if isinstance(data, list):
                appendix_summary[appendix_type] = {
                    'count': len(data),
                    'files': [item.get('caption', item.get('filename', 'File')) if isinstance(item, dict) else str(item) for item in data]
                }
            else:
                appendix_summary[appendix_type] = {
                    'count': 1,
                    'file': data
                }
        
        return {
            "message": "Appendices generated successfully",
            "appendices_generated": list(appendices.keys()),
            "summary": appendix_summary,
            "total_appendices": len(appendices)
        }
        
    except Exception as e:
        logging.error(f"Appendix generation failed for report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Appendix generation failed: {str(e)}")


# Property management
@router.post("/{report_id}/properties", response_model=PropertySchema)
def create_property(
    report_id: UUID,
    property_in: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    property_data = property_in.model_dump()
    property_data["report_id"] = report_id
    
    property = Property(**property_data)
    db.add(property)
    db.commit()
    db.refresh(property)
    
    return property


@router.get("/{report_id}/properties", response_model=List[PropertySchema])
def get_report_properties(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    properties = db.query(Property).filter(Property.report_id == report_id).all()
    return properties


# Valuation management
@router.post("/{report_id}/valuation-lines")
def create_valuation_lines(
    report_id: UUID,
    lines: List[ValuationLineCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    created_lines = []
    for line_data in lines:
        line = ValuationLine(**line_data.model_dump())
        db.add(line)
        created_lines.append(line)
    
    db.commit()
    return created_lines


@router.post("/{report_id}/valuation-summary")
def create_valuation_summary(
    report_id: UUID,
    summary_in: ValuationSummaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    # Delete existing summary if exists
    existing = db.query(ValuationSummary).filter(ValuationSummary.report_id == report_id).first()
    if existing:
        db.delete(existing)
    
    summary_data = summary_in.model_dump()
    summary_data["report_id"] = report_id
    
    summary = ValuationSummary(**summary_data)
    db.add(summary)
    db.commit()
    db.refresh(summary)
    
    return summary


# Document generation endpoints
@router.get("/{report_id}/generate-pdf")
def generate_pdf(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate professional PDF report"""
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    try:
        # Generate PDF using the enhanced document service with database mapping
        document_service.db_session = db
        pdf_buffer = document_service.generate_enhanced_pdf_report(str(report_id))
        
        # Prepare filename
        safe_ref = "".join(c for c in (report.ref or '') if c.isalnum() or c in (' ', '-', '_')).strip()
        filename = f"Report_{safe_ref or str(report_id)[:8]}.pdf"
        
        # Return PDF as response
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
    
    except Exception as e:
        logging.error(f"PDF generation failed for report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/{report_id}/generate-docx")
def generate_docx(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate professional DOCX report"""
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    try:
        # Generate DOCX using the enhanced document service with database mapping
        document_service.db_session = db
        docx_buffer = document_service.generate_professional_docx_report(str(report_id))
        
        # Prepare filename
        safe_ref = "".join(c for c in (report.ref or '') if c.isalnum() or c in (' ', '-', '_')).strip()
        filename = f"Report_{safe_ref or str(report_id)[:8]}.docx"
        
        # Return DOCX as response
        return Response(
            content=docx_buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except Exception as e:
        logging.error(f"DOCX generation failed for report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {str(e)}")


# File and OCR endpoints
@router.get("/{report_id}/ocr-results", response_model=List[OCRResultWithFile])
def get_report_ocr_results(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all OCR results for files in a report"""
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    # Get all OCR results for files in this report
    ocr_results = db.query(OCRResult).join(FileModel).filter(
        FileModel.report_id == report_id,
        FileModel.uploaded_by == current_user.id
    ).all()
    
    return ocr_results


@router.get("/{report_id}/files", response_model=List[FileSchema])
def get_report_files(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all files for a report"""
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership
    if report.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report")
    
    # Get all files for this report
    files = db.query(FileModel).filter(
        FileModel.report_id == report_id,
        FileModel.uploaded_by == current_user.id
    ).all()
    
    return files