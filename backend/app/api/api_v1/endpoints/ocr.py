import os
import io
import time
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from uuid import UUID

from app.db import get_db
from app.models import User, File as FileModel, OCRResult
from app.deps import get_current_active_user
from app.core.config import settings
from app.schemas import OCRPageData, OCRResult as OCRResultSchema, OCRResultCreate, OCRResultUpdate
from app.services.ai_extraction import process_document_with_ai, detect_document_type
from app.services.translation import process_mixed_language_text, is_translation_available

# OCR imports
try:
    from google.cloud import vision
    import fitz  # PyMuPDF
    from PIL import Image
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False

router = APIRouter()


class OCRRequest(BaseModel):
    file_path: Optional[str] = None
    file_id: Optional[UUID] = None


class OCRPageResult(BaseModel):
    page: int
    text: str


class OCRResponse(BaseModel):
    pages: List[OCRPageResult]
    full_text: str
    total_pages: int
    file_path: str
    document_type: Optional[str] = None
    ai_extracted_data: Optional[Dict[str, Any]] = None
    translation_applied: Optional[bool] = None
    detected_languages: Optional[str] = None


def get_vision_client():
    """Initialize Google Vision client with proper credentials"""
    if not VISION_AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail="Google Cloud Vision dependencies not installed"
        )
    
    # Check for credentials
    credentials_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if credentials_path:
        # Handle both absolute and relative paths
        if not os.path.isabs(credentials_path):
            # Resolve relative to the backend root directory, not this file's location
            # __file__ is in: backend/app/api/api_v1/endpoints/ocr.py
            # We need to go up 5 levels to reach backend root
            backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
            credentials_path = os.path.join(backend_root, credentials_path.lstrip('./'))
        
        credentials_path = os.path.abspath(credentials_path)
        if os.path.exists(credentials_path):
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Google Cloud credentials file not found at: {credentials_path}"
            )
    elif not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        raise HTTPException(
            status_code=400,
            detail="Google Cloud credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable or provide credentials file."
        )
    
    try:
        return vision.ImageAnnotatorClient()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to initialize Google Vision client: {str(e)}"
        )


def extract_text_from_image(image_data: bytes, client: vision.ImageAnnotatorClient) -> str:
    """Extract text from image using Google Vision API"""
    try:
        image = vision.Image(content=image_data)
        response = client.document_text_detection(image=image)
        
        if response.error.message:
            raise Exception(f"Vision API error: {response.error.message}")
        
        # Get full text annotation
        texts = response.text_annotations
        if texts:
            return texts[0].description
        return ""
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract text from image: {str(e)}"
        )


def pdf_to_images_and_extract_text(pdf_path: str, client: vision.ImageAnnotatorClient) -> List[OCRPageResult]:
    """Convert PDF pages to images and extract text from each page"""
    try:
        doc = fitz.open(pdf_path)
        pages_text = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Convert page to image with reasonable DPI (150 is good balance of quality/speed)
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom = ~150 DPI
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image then to bytes
            img_data = pix.tobytes("png")
            
            # Extract text using Vision API
            text = extract_text_from_image(img_data, client)
            
            pages_text.append(OCRPageResult(page=page_num + 1, text=text))
            
        doc.close()
        return pages_text
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )


def validate_file_access(file_path: str, current_user: User) -> str:
    """Validate that the file exists and user has access to it"""
    if not file_path:
        raise HTTPException(status_code=400, detail="File path is required")
    
    # Convert to absolute path
    abs_path = os.path.abspath(file_path)
    storage_dir = os.path.abspath(settings.STORAGE_DIR)
    
    # Ensure file is within storage directory (security check)
    if not abs_path.startswith(storage_dir):
        raise HTTPException(status_code=403, detail="Access denied to file outside storage directory")
    
    # Check if file exists
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Validate file type
    file_ext = Path(abs_path).suffix.lower()
    if file_ext not in ['.pdf', '.jpg', '.jpeg', '.png']:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Supported types: PDF, JPG, JPEG, PNG"
        )
    
    return abs_path


@router.post("/extract_text", response_model=OCRResponse)
async def extract_text(
    request: OCRRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Extract text from PDF or image files using Google Vision API"""
    start_time = time.time()
    
    # Validate input
    if not request.file_path and not request.file_id:
        raise HTTPException(
            status_code=400,
            detail="Either file_path or file_id must be provided"
        )
    
    # Handle file_id lookup
    file_record = None
    if request.file_id:
        file_record = db.query(FileModel).filter(
            FileModel.id == request.file_id,
            FileModel.uploaded_by == current_user.id
        ).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        # Always validate file access even when using file_id
        abs_file_path = validate_file_access(file_record.file_path, current_user)
    else:
        # Validate file access using file_path
        abs_file_path = validate_file_access(request.file_path, current_user)
        # Try to find existing file record by path
        file_record = db.query(FileModel).filter(
            FileModel.file_path == abs_file_path,
            FileModel.uploaded_by == current_user.id
        ).first()
    
    # Check if OCR already exists for this file
    if file_record:
        existing_ocr = db.query(OCRResult).filter(
            OCRResult.file_id == file_record.id
        ).first()
        if existing_ocr:
            # Return existing OCR result
            pages_data = [OCRPageResult(page=p["page"], text=p["text"]) for p in existing_ocr.blocks_json or []]
            return OCRResponse(
                pages=pages_data,
                full_text=existing_ocr.edited_text or existing_ocr.raw_text or "",
                total_pages=len(pages_data),
                file_path=request.file_path or file_record.file_path
            )
    
    # Initialize Vision client
    vision_client = get_vision_client()
    
    # Determine file type and process accordingly
    try:
        file_ext = Path(abs_file_path).suffix.lower()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file path: {str(e)}")
    
    try:
        if file_ext == '.pdf':
            # Process PDF
            pages_text = pdf_to_images_and_extract_text(abs_file_path, vision_client)
            
        else:
            # Process image file
            with open(abs_file_path, 'rb') as f:
                image_data = f.read()
            
            text = extract_text_from_image(image_data, vision_client)
            pages_text = [OCRPageResult(page=1, text=text)]
        
        # Combine all text - handle potential Unicode issues
        try:
            raw_full_text = "\n\n".join([page.text for page in pages_text if page.text.strip()])
        except Exception as e:
            raw_full_text = ""
        
        # Process with translation if available
        translation_applied = False
        detected_languages = "unknown"
        processed_full_text = raw_full_text
        
        if is_translation_available() and raw_full_text.strip():
            try:
                processed_full_text, detected_languages = process_mixed_language_text(raw_full_text)
                translation_applied = detected_languages != "en" and "si" in detected_languages
            except Exception as e:
                pass  # Continue without translation
        
        # Process with AI extraction
        ai_extracted_data = None
        document_type = None
        
        if processed_full_text.strip():
            try:
                ai_result = process_document_with_ai(processed_full_text)
                document_type = ai_result.get("document_type")
                ai_extracted_data = {
                    "document_type": ai_result.get("document_type"),
                    "extracted_data": ai_result.get("extracted_data", {}),
                    "general_data": ai_result.get("general_data", {})
                }
            except Exception as e:
                ai_extracted_data = {"error": f"AI processing failed: {str(e)}"}
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        
        # Save OCR result to database if we have a file record
        if file_record:
            try:
                # Convert pages_text to JSON format for database
                pages_data_json = [{"page": page.page, "text": page.text} for page in pages_text]
                
                ocr_result = OCRResult(
                    raw_text=processed_full_text,  # Store processed (translated) text
                    blocks_json=pages_data_json,  # Use blocks_json instead of pages_data
                    confidence_score=85,  # Placeholder - Google Vision doesn't provide overall confidence
                    processing_time=processing_time,
                    ocr_engine="google_vision",
                    language=detected_languages,  # Use language instead of language_detected
                    file_id=file_record.id,
                    processed_by=current_user.id
                )
                db.add(ocr_result)
                db.commit()
                db.refresh(ocr_result)
            except Exception as e:
                # Don't fail the whole request if database save fails
                pass
        
        return OCRResponse(
            pages=pages_text,
            full_text=processed_full_text,
            total_pages=len(pages_text),
            file_path=request.file_path or (file_record.file_path if file_record else abs_file_path),
            document_type=document_type,
            ai_extracted_data=ai_extracted_data,
            translation_applied=translation_applied,
            detected_languages=detected_languages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )


@router.get("/results/{file_id}", response_model=OCRResultSchema)
def get_ocr_result(
    file_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get OCR result for a specific file"""
    # Verify file belongs to user
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.uploaded_by == current_user.id
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get OCR result
    ocr_result = db.query(OCRResult).filter(
        OCRResult.file_id == file_id
    ).first()
    if not ocr_result:
        raise HTTPException(status_code=404, detail="OCR result not found")
    
    return ocr_result


@router.put("/results/{ocr_id}", response_model=OCRResultSchema)
def update_ocr_result(
    ocr_id: UUID,
    update_data: OCRResultUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update OCR result (for user editing)"""
    # Get OCR result and verify user access
    ocr_result = db.query(OCRResult).join(FileModel).filter(
        OCRResult.id == ocr_id,
        FileModel.uploaded_by == current_user.id
    ).first()
    if not ocr_result:
        raise HTTPException(status_code=404, detail="OCR result not found")
    
    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(ocr_result, field, value)
    
    # Mark as edited if text was changed
    if update_data.edited_text is not None:
        ocr_result.is_edited = True
    
    db.commit()
    db.refresh(ocr_result)
    return ocr_result


@router.post("/analyze_document", response_model=Dict[str, Any])
async def analyze_document(
    request: OCRRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze document and extract structured data using AI (without running OCR again)"""
    
    # Get OCR result from database first
    file_record = None
    if request.file_id:
        file_record = db.query(FileModel).filter(
            FileModel.id == request.file_id,
            FileModel.uploaded_by == current_user.id
        ).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
    
    # Get existing OCR result
    if file_record:
        ocr_result = db.query(OCRResult).filter(
            OCRResult.file_id == file_record.id
        ).first()
        if not ocr_result:
            raise HTTPException(status_code=404, detail="OCR result not found. Please run OCR first.")
        
        ocr_text = ocr_result.edited_text or ocr_result.raw_text
    else:
        raise HTTPException(status_code=400, detail="file_id is required for document analysis")
    
    if not ocr_text:
        raise HTTPException(status_code=400, detail="No text available for analysis")
    
    try:
        # Process with AI extraction
        ai_result = process_document_with_ai(ocr_text)
        
        return {
            "file_id": str(file_record.id),
            "document_analysis": ai_result,
            "ocr_text_length": len(ocr_text),
            "analysis_timestamp": time.time()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Document analysis failed: {str(e)}"
        )