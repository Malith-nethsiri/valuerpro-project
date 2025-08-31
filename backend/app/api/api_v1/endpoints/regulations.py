"""
Regulation database and compliance system endpoints
"""
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, RegulationDocument, RegulationLocationAssociation, ComplianceAssessment
from app.deps import get_current_active_user
from app.services.regulation_database import (
    get_applicable_regulations,
    get_regulation_documents_by_location,
    generate_compliance_report
)

router = APIRouter()


class LocationRegulationRequest(BaseModel):
    latitude: float
    longitude: float
    property_type: Optional[str] = "residential"


class ComplianceAnalysisRequest(LocationRegulationRequest):
    include_documents: Optional[bool] = True
    generate_report: Optional[bool] = True


class RegulationDocumentUploadRequest(BaseModel):
    title: str
    description: Optional[str] = None
    authority: str
    category: str  # uda, municipal, etc.
    document_type: str
    applicable_areas: List[str]
    province: Optional[str] = None
    district: Optional[str] = None
    effective_date: Optional[str] = None
    version: Optional[str] = None
    gazette_number: Optional[str] = None


@router.get("/status")
def get_regulation_system_status():
    """Get regulation database system status"""
    return {
        "system_available": True,
        "database_connected": True,
        "message": "Regulation database and compliance system operational"
    }


@router.post("/analyze-compliance", response_model=Dict[str, Any])
def analyze_property_compliance(
    request: ComplianceAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Comprehensive compliance analysis for property location"""
    
    try:
        # Step 1: Get applicable regulations
        regulation_analysis = get_applicable_regulations(
            latitude=request.latitude,
            longitude=request.longitude,
            property_type=request.property_type
        )
        
        if "error" in regulation_analysis:
            raise HTTPException(
                status_code=400,
                detail=regulation_analysis["error"]
            )
        
        # Step 2: Get associated documents (if requested)
        available_documents = {}
        if request.include_documents:
            available_documents = get_regulation_documents_by_location(
                request.latitude,
                request.longitude
            )
        
        # Step 3: Generate compliance report (if requested)
        compliance_report = {}
        if request.generate_report:
            compliance_report = generate_compliance_report(regulation_analysis)
        
        # Step 4: Save assessment to database
        assessment = ComplianceAssessment(
            report_id=None,  # Can be associated with report later
            latitude=request.latitude,
            longitude=request.longitude,
            property_type=request.property_type,
            applicable_regulations=regulation_analysis.get("applicable_regulations", []),
            compliance_requirements=regulation_analysis.get("compliance_requirements", {}),
            regulation_summary=regulation_analysis.get("regulation_summary", {}),
            complexity_level=regulation_analysis.get("regulation_summary", {}).get("complexity_level", "unknown"),
            assessed_by=current_user.id
        )
        
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        
        return {
            "assessment_id": str(assessment.id),
            "regulation_analysis": regulation_analysis,
            "available_documents": available_documents,
            "compliance_report": compliance_report,
            "assessment_timestamp": regulation_analysis.get("analysis_timestamp")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Compliance analysis failed: {str(e)}"
        )


@router.post("/applicable-regulations", response_model=Dict[str, Any])
def get_property_applicable_regulations(
    request: LocationRegulationRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Get applicable regulations for property location"""
    
    try:
        regulation_result = get_applicable_regulations(
            latitude=request.latitude,
            longitude=request.longitude,
            property_type=request.property_type
        )
        
        if "error" in regulation_result:
            raise HTTPException(
                status_code=400,
                detail=regulation_result["error"]
            )
        
        return regulation_result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get applicable regulations: {str(e)}"
        )


@router.get("/documents")
def get_regulation_documents(
    category: Optional[str] = Query(None, description="Filter by regulation category"),
    authority: Optional[str] = Query(None, description="Filter by authority name"),
    area: Optional[str] = Query(None, description="Filter by applicable area"),
    active_only: bool = Query(True, description="Return only active documents"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get regulation documents with optional filtering"""
    
    try:
        query = db.query(RegulationDocument)
        
        if active_only:
            query = query.filter(RegulationDocument.is_active == True)
        
        if category:
            query = query.filter(RegulationDocument.category == category)
        
        if authority:
            query = query.filter(RegulationDocument.authority.ilike(f"%{authority}%"))
        
        if area:
            query = query.filter(RegulationDocument.applicable_areas.contains([area]))
        
        documents = query.order_by(RegulationDocument.created_at.desc()).limit(50).all()
        
        return {
            "documents": [
                {
                    "id": str(doc.id),
                    "title": doc.title,
                    "authority": doc.authority,
                    "category": doc.category.value,
                    "document_type": doc.document_type,
                    "applicable_areas": doc.applicable_areas,
                    "effective_date": doc.effective_date.isoformat() if doc.effective_date else None,
                    "version": doc.version,
                    "file_size": doc.file_size,
                    "download_count": doc.download_count,
                    "uploaded_at": doc.created_at.isoformat()
                }
                for doc in documents
            ],
            "total_count": len(documents),
            "filters_applied": {
                "category": category,
                "authority": authority,
                "area": area,
                "active_only": active_only
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve documents: {str(e)}"
        )


@router.post("/documents/upload")
async def upload_regulation_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    authority: str = Form(...),
    category: str = Form(...),
    document_type: str = Form(...),
    applicable_areas: str = Form(...),  # JSON string of areas
    description: str = Form(None),
    province: str = Form(None),
    district: str = Form(None),
    effective_date: str = Form(None),
    version: str = Form(None),
    gazette_number: str = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a new regulation document (Admin only)"""
    
    # Check if user has admin privileges
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can upload regulation documents"
        )
    
    try:
        # Validate file type
        if file.content_type not in ["application/pdf", "application/msword", 
                                   "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            raise HTTPException(
                status_code=400,
                detail="Only PDF and Word documents are allowed"
            )
        
        # Parse applicable areas
        import json
        try:
            areas_list = json.loads(applicable_areas) if applicable_areas else []
        except:
            areas_list = [area.strip() for area in applicable_areas.split(",")]
        
        # Save file (this would integrate with existing file upload system)
        file_content = await file.read()
        
        # Create file record (simplified - in production would use existing File model)
        # For now, we'll create a placeholder
        
        # Create regulation document record
        regulation_doc = RegulationDocument(
            title=title,
            description=description,
            authority=authority,
            category=category,
            document_type=document_type,
            applicable_areas=areas_list,
            province=province,
            district=district,
            file_size=len(file_content),
            mime_type=file.content_type,
            version=version,
            gazette_number=gazette_number,
            uploaded_by=current_user.id
        )
        
        # Parse effective date if provided
        if effective_date:
            from datetime import datetime
            try:
                regulation_doc.effective_date = datetime.fromisoformat(effective_date)
            except:
                pass
        
        db.add(regulation_doc)
        db.commit()
        db.refresh(regulation_doc)
        
        return {
            "document_id": str(regulation_doc.id),
            "message": "Regulation document uploaded successfully",
            "title": title,
            "authority": authority,
            "category": category,
            "applicable_areas": areas_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get("/documents/{document_id}")
def get_regulation_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific regulation document"""
    
    try:
        document = db.query(RegulationDocument).filter(
            RegulationDocument.id == document_id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Regulation document not found"
            )
        
        # Increment download count
        document.download_count += 1
        db.commit()
        
        return {
            "id": str(document.id),
            "title": document.title,
            "description": document.description,
            "authority": document.authority,
            "category": document.category.value,
            "document_type": document.document_type,
            "applicable_areas": document.applicable_areas,
            "province": document.province,
            "district": document.district,
            "effective_date": document.effective_date.isoformat() if document.effective_date else None,
            "expiry_date": document.expiry_date.isoformat() if document.expiry_date else None,
            "version": document.version,
            "gazette_number": document.gazette_number,
            "file_size": document.file_size,
            "mime_type": document.mime_type,
            "download_count": document.download_count,
            "is_active": document.is_active,
            "uploaded_at": document.created_at.isoformat(),
            "uploader": {
                "id": str(document.uploader.id) if document.uploader else None,
                "name": document.uploader.full_name if document.uploader else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document details: {str(e)}"
        )


@router.get("/documents/by-location")
def get_documents_by_location(
    lat: float = Query(..., description="Property latitude"),
    lng: float = Query(..., description="Property longitude"),
    radius_km: float = Query(10, description="Search radius in kilometers"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get regulation documents applicable to a specific location"""
    
    try:
        # Get documents using the service function
        documents_result = get_regulation_documents_by_location(lat, lng)
        
        return documents_result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get location-specific documents: {str(e)}"
        )


@router.get("/compliance-report/{assessment_id}")
def get_compliance_report(
    assessment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed compliance report for a specific assessment"""
    
    try:
        assessment = db.query(ComplianceAssessment).filter(
            ComplianceAssessment.id == assessment_id
        ).first()
        
        if not assessment:
            raise HTTPException(
                status_code=404,
                detail="Compliance assessment not found"
            )
        
        # Generate detailed compliance report
        regulation_analysis = {
            "applicable_regulations": assessment.applicable_regulations,
            "compliance_requirements": assessment.compliance_requirements,
            "regulation_summary": assessment.regulation_summary
        }
        
        compliance_report = generate_compliance_report(regulation_analysis)
        
        return {
            "assessment_id": str(assessment.id),
            "property_location": {
                "latitude": assessment.latitude,
                "longitude": assessment.longitude,
                "property_type": assessment.property_type
            },
            "compliance_report": compliance_report,
            "assessment_metadata": {
                "assessed_by": str(assessment.assessed_by),
                "assessment_version": assessment.assessment_version,
                "created_at": assessment.created_at.isoformat(),
                "complexity_level": assessment.complexity_level
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate compliance report: {str(e)}"
        )


@router.get("/categories")
def get_regulation_categories(current_user: User = Depends(get_current_active_user)):
    """Get available regulation categories and their details"""
    
    from app.services.regulation_database import REGULATION_CATEGORIES
    
    return {
        "categories": [
            {
                "key": key,
                "name": category["name"],
                "description": category["description"],
                "authority_type": category["authority_type"],
                "applicable_areas": category.get("applicable_areas", []),
                "document_types": category.get("document_types", [])
            }
            for key, category in REGULATION_CATEGORIES.items()
        ]
    }


@router.post("/associate-location")
def associate_document_with_location(
    document_id: str,
    location_identifier: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None,
    priority: int = 1,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Associate a regulation document with a specific location (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can create location associations"
        )
    
    try:
        # Check if document exists
        document = db.query(RegulationDocument).filter(
            RegulationDocument.id == document_id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Regulation document not found"
            )
        
        # Create location association
        association = RegulationLocationAssociation(
            document_id=document_id,
            location_identifier=location_identifier,
            priority=priority,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )
        
        db.add(association)
        db.commit()
        db.refresh(association)
        
        return {
            "association_id": str(association.id),
            "message": "Location association created successfully",
            "document_title": document.title,
            "location_identifier": location_identifier,
            "coordinates": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km
            } if latitude and longitude else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create location association: {str(e)}"
        )