from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Union, Optional
from pydantic import BaseModel
import fitz  # PyMuPDF
from google.cloud import vision
from PIL import Image
import os
import io
from pathlib import Path

from app.db import get_db
from app.models import User
from app.deps import get_current_active_user
from app.core.config import settings
from app.services.ai_extraction import process_document_with_ai, detect_document_type

router = APIRouter()


class DocumentAnalysisRequest(BaseModel):
    text: str
    document_type: Optional[str] = None


class DocumentAnalysisResponse(BaseModel):
    document_type: str
    extracted_data: Dict[str, Any]
    general_data: Dict[str, Any]
    processing_status: str


class OCRRequest(BaseModel):
    file_id: Union[str, None] = None
    path: Union[str, None] = None


class OCRPageResult(BaseModel):
    page: int
    text: str
    lang_hints: List[str] = []
    confidence: Union[float, None] = None


class OCRResponse(BaseModel):
    pages: List[OCRPageResult]
    full_text: str


def get_vision_client():
    """Get Google Vision API client with credentials from environment"""
    if not settings.GOOGLE_CLOUD_CREDENTIALS_PATH:
        raise HTTPException(
            status_code=500,
            detail="Google Cloud credentials not configured"
        )
    
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_CLOUD_CREDENTIALS_PATH
    return vision.ImageAnnotatorClient()


def extract_text_from_image(image_data: bytes) -> tuple[str, float]:
    """Extract text from image using Google Vision API"""
    client = get_vision_client()
    
    image = vision.Image(content=image_data)
    response = client.document_text_detection(image=image)
    
    if response.error.message:
        raise HTTPException(
            status_code=500,
            detail=f"Vision API error: {response.error.message}"
        )
    
    full_text = response.full_text_annotation.text if response.full_text_annotation else ""
    confidence = response.full_text_annotation.pages[0].confidence if response.full_text_annotation and response.full_text_annotation.pages else 0.0
    
    return full_text, confidence


def pdf_to_images(pdf_path: str) -> List[bytes]:
    """Convert PDF pages to image bytes using PyMuPDF"""
    images = []
    try:
        pdf_document = fitz.open(pdf_path)
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            # Render page to image (300 DPI for better OCR)
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            img_data = pix.tobytes("png")
            images.append(img_data)
        pdf_document.close()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )
    
    return images


@router.post("/extract_text", response_model=OCRResponse)
async def extract_text(
    request: OCRRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Extract text from uploaded documents using Google Cloud Vision API"""
    
    if not request.file_id and not request.path:
        raise HTTPException(
            status_code=400,
            detail="Either file_id or path must be provided"
        )
    
    # Determine file path
    if request.path:
        file_path = request.path
    else:
        # Look up file path by file_id from database
        from app.models import File as FileModel
        file_record = db.query(FileModel).filter(
            FileModel.id == request.file_id,
            FileModel.uploaded_by == current_user.id
        ).first()
        
        if not file_record:
            raise HTTPException(
                status_code=404,
                detail="File not found or access denied"
            )
        
        file_path = file_record.file_path
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    
    # Determine if file is PDF or image
    file_extension = Path(file_path).suffix.lower()
    
    try:
        pages = []
        
        if file_extension == '.pdf':
            # Process PDF: convert pages to images then OCR
            image_data_list = pdf_to_images(file_path)
            
            for page_num, image_data in enumerate(image_data_list, 1):
                text, confidence = extract_text_from_image(image_data)
                pages.append(OCRPageResult(
                    page=page_num,
                    text=text,
                    confidence=confidence
                ))
        
        elif file_extension in ['.jpg', '.jpeg', '.png']:
            # Process image directly
            with open(file_path, 'rb') as f:
                image_data = f.read()
            
            text, confidence = extract_text_from_image(image_data)
            pages.append(OCRPageResult(
                page=1,
                text=text,
                confidence=confidence
            ))
        
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Only PDF, JPG, JPEG, and PNG are supported."
            )
        
        # Combine all text
        full_text = "\n\n".join([page.text for page in pages])
        
        return OCRResponse(
            pages=pages,
            full_text=full_text
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )


@router.post("/translate")
async def translate_text(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Translate text from Sinhala to English using Google Cloud Translation API"""
    from app.services.translation import translate_sinhala_to_english, detect_language, process_mixed_language_text, is_translation_available
    
    if not data.get("text"):
        raise HTTPException(
            status_code=400,
            detail="Text field is required"
        )
    
    if not is_translation_available():
        raise HTTPException(
            status_code=503,
            detail="Translation service is not available. Please check Google Cloud credentials configuration."
        )
    
    try:
        text = data["text"]
        translation_mode = data.get("mode", "auto")  # auto, sinhala_only, mixed
        
        if translation_mode == "sinhala_only":
            # Direct Sinhala to English translation
            translated_text, was_translated = translate_sinhala_to_english(text)
            detected_language = "si" if was_translated else "en"
        elif translation_mode == "mixed":
            # Handle mixed language text
            translated_text, detected_languages = process_mixed_language_text(text)
            detected_language = detected_languages
            was_translated = "si" in detected_languages
        else:
            # Auto-detect and translate
            detected_language = detect_language(text)
            if detected_language == "si":
                translated_text, was_translated = translate_sinhala_to_english(text)
            else:
                translated_text = text
                was_translated = False
        
        return {
            "original_text": text,
            "translated_text": translated_text,
            "detected_language": detected_language,
            "was_translated": was_translated,
            "translation_mode": translation_mode,
            "status": "completed"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(e)}"
        )


@router.post("/analyze_document", response_model=DocumentAnalysisResponse)
async def analyze_document(
    request: DocumentAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze document text and extract structured data using AI"""
    if not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text content is required for analysis"
        )
    
    try:
        # Process document with AI extraction
        result = process_document_with_ai(request.text, request.document_type)
        
        return DocumentAnalysisResponse(
            document_type=result["document_type"],
            extracted_data=result["extracted_data"],
            general_data=result["general_data"],
            processing_status="completed"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Document analysis failed: {str(e)}"
        )


class DocumentBatchParseRequest(BaseModel):
    file_ids: List[str]
    report_id: Optional[str] = None
    auto_populate: bool = True


class DocumentBatchParseResponse(BaseModel):
    results: List[Dict[str, Any]]
    summary: Dict[str, Any]
    auto_populate_status: str


@router.post("/parse", response_model=DocumentBatchParseResponse)
async def parse_documents(
    request: DocumentBatchParseRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Parse and extract structured data from multiple documents with cross-validation"""
    from app.models import File as FileModel, Report
    from app.services.ai_extraction import process_document_with_ai
    
    if not request.file_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one file_id must be provided"
        )
    
    results = []
    processing_errors = []
    
    # Process each file
    for file_id in request.file_ids:
        try:
            # Get file from database
            file_record = db.query(FileModel).filter(
                FileModel.id == file_id,
                FileModel.uploaded_by == current_user.id
            ).first()
            
            if not file_record:
                processing_errors.append(f"File {file_id}: Not found or access denied")
                continue
            
            if not os.path.exists(file_record.file_path):
                processing_errors.append(f"File {file_id}: Physical file not found")
                continue
            
            # Extract OCR text first
            ocr_request = OCRRequest(file_id=file_id)
            ocr_response = await extract_text(ocr_request, current_user, db)
            
            if not ocr_response.full_text.strip():
                processing_errors.append(f"File {file_id}: No text could be extracted")
                continue
            
            # Process with AI extraction
            analysis_result = process_document_with_ai(ocr_response.full_text)
            
            # Add file metadata to result
            file_result = {
                "file_id": file_id,
                "filename": file_record.filename,
                "original_filename": file_record.original_filename,
                "mime_type": file_record.mime_type,
                "ocr_result": {
                    "page_count": len(ocr_response.pages),
                    "text_length": len(ocr_response.full_text),
                    "confidence": sum([p.confidence or 0 for p in ocr_response.pages]) / len(ocr_response.pages) if ocr_response.pages else 0
                },
                "analysis": analysis_result
            }
            
            results.append(file_result)
            
        except Exception as e:
            processing_errors.append(f"File {file_id}: {str(e)}")
    
    # Cross-validation and data consolidation
    summary = perform_cross_validation(results)
    
    # Auto-populate report if requested and report_id provided
    auto_populate_status = "not_requested"
    if request.auto_populate and request.report_id:
        try:
            # Verify report ownership
            report = db.query(Report).filter(
                Report.id == request.report_id,
                Report.author_id == current_user.id
            ).first()
            
            if report:
                from app.services.field_mapper import auto_populate_report_from_analysis
                populate_result = auto_populate_report_from_analysis(
                    report_id=request.report_id, 
                    analysis_results=results, 
                    db=db
                )
                auto_populate_status = populate_result.get("status", "failed")
            else:
                auto_populate_status = "report_not_found"
        except Exception as e:
            auto_populate_status = f"failed: {str(e)}"
    
    # Add errors to summary
    if processing_errors:
        summary["processing_errors"] = processing_errors
    
    return DocumentBatchParseResponse(
        results=results,
        summary=summary,
        auto_populate_status=auto_populate_status
    )


def perform_cross_validation(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Cross-validate extracted data across multiple documents"""
    summary = {
        "total_documents": len(results),
        "successful_extractions": 0,
        "document_types": {},
        "consolidated_data": {},
        "confidence_scores": {},
        "conflicts": []
    }
    
    # Track consolidated data from all documents
    consolidated_fields = {}
    
    for result in results:
        analysis = result.get("analysis", {})
        doc_type = analysis.get("document_type", "unknown")
        extracted_data = analysis.get("extracted_data", {})
        general_data = analysis.get("general_data", {})
        
        if extracted_data and not extracted_data.get("error"):
            summary["successful_extractions"] += 1
        
        # Track document types
        summary["document_types"][doc_type] = summary["document_types"].get(doc_type, 0) + 1
        
        # Consolidate key fields across documents
        all_data = {**extracted_data, **general_data}
        
        for field, value in all_data.items():
            if value and not isinstance(value, dict) or (isinstance(value, dict) and not value.get("error")):
                if field not in consolidated_fields:
                    consolidated_fields[field] = []
                consolidated_fields[field].append({
                    "value": value,
                    "source": result["filename"],
                    "doc_type": doc_type
                })
    
    # Find most common values and conflicts
    for field, values in consolidated_fields.items():
        if len(values) == 1:
            # Single source
            summary["consolidated_data"][field] = values[0]["value"]
            summary["confidence_scores"][field] = 0.9
        else:
            # Multiple sources - check for conflicts
            unique_values = list(set([str(v["value"]) for v in values]))
            if len(unique_values) == 1:
                # All sources agree
                summary["consolidated_data"][field] = values[0]["value"]
                summary["confidence_scores"][field] = 0.95
            else:
                # Conflict detected
                summary["conflicts"].append({
                    "field": field,
                    "values": values
                })
                # Use most frequent value
                value_counts = {}
                for v in values:
                    val_str = str(v["value"])
                    value_counts[val_str] = value_counts.get(val_str, 0) + 1
                
                most_common = max(value_counts.items(), key=lambda x: x[1])
                # Find the actual value object for the most common string
                for v in values:
                    if str(v["value"]) == most_common[0]:
                        summary["consolidated_data"][field] = v["value"]
                        break
                
                summary["confidence_scores"][field] = 0.6 - (len(unique_values) * 0.1)
    
    return summary