"""
Batch OCR and AI Analysis Endpoints
Enhanced multi-document processing for competitive advantage
"""
import asyncio
import time
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, File as FileModel, OCRResult
from app.deps import get_current_active_user
from app.services.ai_extraction import process_document_with_ai, detect_document_type
from app.api.api_v1.endpoints.ocr import validate_file_access
import os
from pathlib import Path

# OCR imports
try:
    from google.cloud import vision
    import fitz  # PyMuPDF
    from PIL import Image
    from docx import Document  # python-docx for DOCX files
    VISION_AVAILABLE = True
    DOCX_AVAILABLE = True
except ImportError as e:
    VISION_AVAILABLE = False
    DOCX_AVAILABLE = False

router = APIRouter()


class OCRPageResult(BaseModel):
    page: int
    text: str


class OCRResponse(BaseModel):
    pages: List[OCRPageResult]
    full_text: str
    total_pages: int
    file_path: str


def extract_text_from_image(image_data: bytes, client: vision.ImageAnnotatorClient, is_pdf_page: bool = False) -> str:
    """Extract text from image using Google Vision API with enhanced detection"""
    image = vision.Image(content=image_data)
    
    # Use document_text_detection for better layout preservation, especially for PDFs
    if is_pdf_page:
        response = client.document_text_detection(image=image)
        
        if response.error.message:
            raise Exception(f"Vision API error: {response.error.message}")
        
        # For document text detection, use full_text_annotation for better layout preservation
        if response.full_text_annotation:
            return response.full_text_annotation.text
        # Fallback to text_annotations if full_text_annotation is not available
        elif response.text_annotations:
            return response.text_annotations[0].description
        return ""
    else:
        # For regular images, use standard text detection
        response = client.text_detection(image=image)
        
        if response.error.message:
            raise Exception(f"Vision API error: {response.error.message}")
        
        texts = response.text_annotations
        return texts[0].description if texts else ""


def extract_text_with_ocr(file_path: str) -> OCRResponse:
    """Extract text from various file formats using OCR"""
    if not VISION_AVAILABLE:
        raise HTTPException(status_code=503, detail="OCR service not available")
    
    # Ensure Google credentials are set
    from app.core.config import settings
    if settings.GOOGLE_APPLICATION_CREDENTIALS and not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_APPLICATION_CREDENTIALS
    
    file_ext = Path(file_path).suffix.lower()
    client = vision.ImageAnnotatorClient()
    
    try:
        if file_ext == '.pdf':
            return process_pdf_file(file_path, client)
        elif file_ext == '.docx':
            return process_docx_file(file_path)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.tif']:
            return process_image_file(file_path, client)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


def process_pdf_file(pdf_path: str, client: vision.ImageAnnotatorClient) -> OCRResponse:
    """Process PDF file with OCR"""
    pages = []
    pdf_document = fitz.open(pdf_path)
    
    for page_num in range(len(pdf_document)):
        page = pdf_document.load_page(page_num)
        pix = page.get_pixmap()
        img_data = pix.tobytes("png")
        
        text = extract_text_from_image(img_data, client, is_pdf_page=True)
        pages.append(OCRPageResult(page=page_num + 1, text=text))
    
    pdf_document.close()
    full_text = "\n\n".join([p.text for p in pages])
    
    return OCRResponse(
        pages=pages,
        full_text=full_text,
        total_pages=len(pages),
        file_path=pdf_path
    )


def process_docx_file(docx_path: str) -> OCRResponse:
    """Process DOCX file by extracting text directly"""
    if not DOCX_AVAILABLE:
        raise HTTPException(status_code=503, detail="DOCX processing not available")
    
    doc = Document(docx_path)
    full_text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
    
    return OCRResponse(
        pages=[OCRPageResult(page=1, text=full_text)],
        full_text=full_text,
        total_pages=1,
        file_path=docx_path
    )


def process_image_file(image_path: str, client: vision.ImageAnnotatorClient) -> OCRResponse:
    """Process image file with OCR"""
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    text = extract_text_from_image(image_data, client, is_pdf_page=False)
    
    return OCRResponse(
        pages=[OCRPageResult(page=1, text=text)],
        full_text=text,
        total_pages=1,
        file_path=image_path
    )


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


class ConsolidatedAnalysis(BaseModel):
    """Consolidated insights from multiple related documents"""
    document_types_found: List[str]
    property_details: Dict[str, Any]
    cross_document_validation: Dict[str, Any]
    completeness_score: float
    recommendations: List[str]
    confidence_scores: Dict[str, float]


class BatchOCRResponse(BaseModel):
    batch_id: str
    total_files: int
    successful_files: int
    failed_files: int
    files: List[BatchOCRFileResult]
    consolidated_analysis: Optional[ConsolidatedAnalysis] = None
    total_processing_time: float
    auto_population_data: Optional[Dict[str, Any]] = None


async def process_single_file(
    file_model: FileModel,
    current_user: User,
    db: Session
) -> BatchOCRFileResult:
    """Process a single file with OCR and AI analysis"""
    start_time = time.time()
    
    try:
        # Validate file access
        file_path = validate_file_access(file_model.file_path, current_user)
        
        # Run OCR
        ocr_result = extract_text_with_ocr(file_path)
        full_text = ocr_result.full_text
        
        # Save OCR result to database
        ocr_record = OCRResult(
            file_id=file_model.id,
            processed_by=current_user.id,
            raw_text=full_text,
            blocks_json={"pages": [{"page": page.page, "text": page.text} for page in ocr_result.pages]},
            processing_time=int((time.time() - start_time) * 1000)
        )
        db.add(ocr_record)
        
        # Detect document type and run AI analysis
        document_type = detect_document_type(full_text)
        ai_analysis = None
        
        # Ensure Google Cloud credentials are set
        import os
        from app.core.config import settings
        if settings.GOOGLE_APPLICATION_CREDENTIALS and not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_APPLICATION_CREDENTIALS
        
        # DEBUG: Log OCR text length and sample for diagnosis
        debug_log_path = os.path.join(os.path.dirname(__file__), "../../../debug_batch_ocr.txt")
        with open(debug_log_path, "a", encoding="utf-8") as f:
            f.write(f"\n=== BATCH OCR DEBUG for {file_model.original_filename} ===\n")
            f.write(f"OCR text length: {len(full_text)} characters\n")
            f.write(f"OCR text sample (first 200 chars): {repr(full_text[:200])}\n")
            f.write(f"Detected document type: {document_type}\n")
        
        if full_text.strip():
            ai_analysis = process_document_with_ai(full_text, document_type)
            
            # DEBUG: Log AI analysis structure
            with open(debug_log_path, "a", encoding="utf-8") as f:
                if ai_analysis:
                    f.write(f"AI analysis keys: {list(ai_analysis.keys())}\n")
                    if 'comprehensive_data' in ai_analysis:
                        comp_data = ai_analysis['comprehensive_data']
                        if isinstance(comp_data, dict) and not comp_data.get('error'):
                            field_count = sum(1 for section in comp_data.values() 
                                            if isinstance(section, (dict, list)) and section)
                            f.write(f"Comprehensive data sections with data: {field_count}\n")
                        else:
                            f.write(f"Comprehensive data error: {comp_data.get('error', 'Unknown error')}\n")
                    else:
                        f.write("NO comprehensive_data in AI analysis!\n")
                else:
                    f.write("AI analysis is None/empty!\n")
        else:
            with open(debug_log_path, "a", encoding="utf-8") as f:
                f.write("OCR text is empty - skipping AI analysis\n")
        
        # Update OCR record with AI data
        ocr_record.document_type = document_type
        ocr_record.ai_extracted_data = ai_analysis
        
        db.commit()
        
        processing_time = time.time() - start_time
        
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
        processing_time = time.time() - start_time
        
        return BatchOCRFileResult(
            file_id=file_model.id,
            filename=file_model.original_filename,
            success=False,
            error=str(e),
            processing_time=processing_time
        )


def consolidate_multi_document_analysis(
    successful_results: List[BatchOCRFileResult]
) -> ConsolidatedAnalysis:
    """Create consolidated analysis from multiple documents"""
    
    document_types = []
    all_analyses = []
    property_details = {}
    confidence_scores = {}
    
    # Extract data from all successful analyses
    for result in successful_results:
        if result.document_type:
            document_types.append(result.document_type)
        if result.ai_analysis:
            all_analyses.append(result.ai_analysis)
    
    # Cross-reference property information across documents
    cross_validation = {}
    
    # Look for consistent property identifiers across documents
    property_refs = []
    land_areas = []
    ownership_info = []
    
    for analysis in all_analyses:
        # Extract property reference numbers
        if analysis.get('extracted_data', {}).get('property_reference'):
            property_refs.append(analysis['extracted_data']['property_reference'])
        
        # Extract land areas from different document types
        if analysis.get('extracted_data', {}).get('land_area'):
            land_areas.append(analysis['extracted_data']['land_area'])
        
        # Extract ownership information
        if analysis.get('extracted_data', {}).get('owner_name'):
            ownership_info.append(analysis['extracted_data']['owner_name'])
    
    # Validate consistency across documents
    cross_validation = {
        'property_reference_consistency': len(set(property_refs)) <= 1 if property_refs else None,
        'land_area_consistency': calculate_area_consistency(land_areas),
        'ownership_consistency': len(set(ownership_info)) <= 1 if ownership_info else None,
    }
    
    # Create comprehensive property details
    property_details = merge_property_details(all_analyses)
    
    # Calculate completeness score
    completeness_score = calculate_completeness_score(document_types, property_details)
    
    # Generate recommendations
    recommendations = generate_recommendations(document_types, cross_validation, completeness_score)
    
    # Calculate confidence scores
    for doc_type in set(document_types):
        confidence_scores[doc_type] = calculate_document_confidence(doc_type, all_analyses)
    
    return ConsolidatedAnalysis(
        document_types_found=list(set(document_types)),
        property_details=property_details,
        cross_document_validation=cross_validation,
        completeness_score=completeness_score,
        recommendations=recommendations,
        confidence_scores=confidence_scores
    )


def calculate_area_consistency(areas: List[str]) -> Optional[bool]:
    """Check if land areas from different documents are consistent"""
    if not areas:
        return None
    
    # Normalize area representations and check for consistency
    normalized_areas = []
    for area in areas:
        # Simple normalization - can be enhanced
        normalized = area.lower().replace(',', '').replace(' ', '')
        normalized_areas.append(normalized)
    
    return len(set(normalized_areas)) <= 1


def merge_property_details(analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Merge property details from multiple document analyses"""
    merged = {
        'property_reference': None,
        'land_area': None,
        'location': None,
        'owner_name': None,
        'survey_date': None,
        'deed_date': None,
        'property_type': None,
        'boundaries': [],
        'easements': [],
        'encumbrances': [],
        'improvements': []
    }
    
    for analysis in analyses:
        extracted = analysis.get('extracted_data', {})
        
        # Use the most complete information from any document
        for key in merged.keys():
            if key in extracted and extracted[key] and not merged[key]:
                merged[key] = extracted[key]
            elif key in extracted and isinstance(merged[key], list):
                # For list fields, combine from all documents
                if isinstance(extracted[key], list):
                    merged[key].extend(extracted[key])
                elif extracted[key]:
                    merged[key].append(extracted[key])
    
    # Remove duplicates from list fields
    for key, value in merged.items():
        if isinstance(value, list):
            merged[key] = list(set(value)) if value else []
    
    return merged


def calculate_completeness_score(document_types: List[str], property_details: Dict[str, Any]) -> float:
    """Calculate how complete the property information is"""
    essential_fields = ['property_reference', 'land_area', 'location', 'owner_name']
    important_fields = ['survey_date', 'deed_date', 'property_type']
    
    essential_score = sum(1 for field in essential_fields if property_details.get(field)) / len(essential_fields)
    important_score = sum(1 for field in important_fields if property_details.get(field)) / len(important_fields)
    
    # Bonus for having multiple document types
    document_bonus = min(len(set(document_types)) / 3, 1.0) * 0.2
    
    return (essential_score * 0.6 + important_score * 0.2 + document_bonus) * 100


def generate_recommendations(
    document_types: List[str], 
    cross_validation: Dict[str, Any], 
    completeness_score: float
) -> List[str]:
    """Generate recommendations based on analysis"""
    recommendations = []
    
    # Document completeness recommendations
    doc_types_set = set(document_types)
    if 'deed' not in doc_types_set:
        recommendations.append("Consider uploading the property deed for complete ownership verification")
    if 'survey_plan' not in doc_types_set:
        recommendations.append("A current survey plan would help verify boundaries and measurements")
    if 'prior_valuation' not in doc_types_set and len(doc_types_set) >= 2:
        recommendations.append("Previous valuation reports could provide comparative analysis")
    
    # Cross-validation recommendations
    if cross_validation.get('property_reference_consistency') is False:
        recommendations.append("⚠️ Property reference numbers don't match across documents - please verify")
    if cross_validation.get('land_area_consistency') is False:
        recommendations.append("⚠️ Land areas differ between documents - requires clarification")
    if cross_validation.get('ownership_consistency') is False:
        recommendations.append("⚠️ Owner names are inconsistent across documents - needs verification")
    
    # Completeness recommendations
    if completeness_score < 60:
        recommendations.append("Document set is incomplete - consider adding more supporting documents")
    elif completeness_score > 90:
        recommendations.append("✅ Excellent document completeness - ready for comprehensive valuation")
    
    return recommendations


def calculate_document_confidence(doc_type: str, analyses: List[Dict[str, Any]]) -> float:
    """Calculate confidence score for each document type analysis"""
    relevant_analyses = [a for a in analyses if a.get('document_type') == doc_type]
    
    if not relevant_analyses:
        return 0.0
    
    # Base confidence on completeness of extracted data
    total_score = 0
    for analysis in relevant_analyses:
        extracted = analysis.get('extracted_data', {})
        non_null_fields = sum(1 for value in extracted.values() if value)
        total_fields = len(extracted)
        score = (non_null_fields / total_fields) if total_fields > 0 else 0
        total_score += score
    
    return (total_score / len(relevant_analyses)) * 100


def create_auto_population_data(consolidated: ConsolidatedAnalysis) -> Dict[str, Any]:
    """Create data structure for auto-populating report wizard"""
    property_details = consolidated.property_details
    
    return {
        # Property Identification (Step 2)
        'property_reference': property_details.get('property_reference'),
        'property_type': property_details.get('property_type'),
        'land_area': property_details.get('land_area'),
        
        # Location (Step 4)
        'location_description': property_details.get('location'),
        
        # Site Information (Step 6) 
        'boundaries': property_details.get('boundaries', []),
        'easements': property_details.get('easements', []),
        'encumbrances': property_details.get('encumbrances', []),
        
        # Building Information (Step 7)
        'improvements': property_details.get('improvements', []),
        
        # Additional metadata
        'document_types_analyzed': consolidated.document_types_found,
        'completeness_score': consolidated.completeness_score,
        'confidence_scores': consolidated.confidence_scores,
        'analysis_recommendations': consolidated.recommendations,
        'last_updated': time.strftime('%Y-%m-%d %H:%M:%S')
    }


@router.post("/batch-process", response_model=BatchOCRResponse)
async def batch_process_documents(
    request: BatchOCRRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Process multiple documents with OCR and AI analysis
    
    This endpoint provides a significant competitive advantage by:
    - Processing multiple related documents (deeds, plans, surveys) together
    - Cross-validating information across documents  
    - Providing consolidated analysis and recommendations
    - Auto-populating report fields from combined insights
    """
    start_time = time.time()
    batch_id = f"batch_{int(time.time())}"
    
    # Validate file access
    files = []
    for file_id in request.file_ids:
        file_model = db.query(FileModel).filter(
            FileModel.id == file_id,
            FileModel.uploaded_by == current_user.id
        ).first()
        
        if not file_model:
            raise HTTPException(
                status_code=404,
                detail=f"File {file_id} not found or access denied"
            )
        files.append(file_model)
    
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 files allowed per batch"
        )
    
    # Process files concurrently for better performance
    tasks = [process_single_file(file_model, current_user, db) for file_model in files]
    results = await asyncio.gather(*tasks)
    
    # Separate successful and failed results
    successful_results = [r for r in results if r.success]
    failed_results = [r for r in results if not r.success]
    
    # Create consolidated analysis if requested and we have successful results
    consolidated_analysis = None
    auto_population_data = None
    
    if request.consolidate_analysis and successful_results:
        consolidated_analysis = consolidate_multi_document_analysis(successful_results)
        
        if request.auto_populate:
            auto_population_data = create_auto_population_data(consolidated_analysis)
    
    total_time = time.time() - start_time
    
    return BatchOCRResponse(
        batch_id=batch_id,
        total_files=len(files),
        successful_files=len(successful_results),
        failed_files=len(failed_results),
        files=results,
        consolidated_analysis=consolidated_analysis,
        total_processing_time=total_time,
        auto_population_data=auto_population_data
    )


@router.get("/batch-limits")
async def get_batch_limits():
    """Get current batch processing limits"""
    return {
        'max_files_per_batch': 10,
        'max_file_size_mb': 10,
        'supported_formats': ['PDF', 'JPG', 'JPEG', 'PNG', 'TIFF', 'DOCX'],
        'processing_timeout_minutes': 10,
        'features': {
            'batch_ocr': True,
            'ai_analysis': True,
            'cross_document_validation': True,
            'auto_population': True,
            'consolidated_reporting': True
        }
    }