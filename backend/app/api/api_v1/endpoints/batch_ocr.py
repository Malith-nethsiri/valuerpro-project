"""
Clean Batch OCR Endpoint - Uses unified OCR service for reliable processing
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import tempfile
import os
import json
from pathlib import Path

from app.db import get_db
from app.services.ocr_service import get_ocr_service
from app.services.ai_property_extractor import get_ai_extractor
from app.models import File as FileModel

router = APIRouter()

@router.post("/process-files")
async def process_files(
    files: List[UploadFile] = File(...),
    extract_fields: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Process multiple files with OCR and optional AI field extraction
    """
    print(f"[BATCH-OCR] Processing {len(files)} files")
    
    ocr_service = get_ocr_service()
    ai_extractor = get_ai_extractor()
    results = []
    
    for file in files:
        print(f"[BATCH-OCR] Processing file: {file.filename}")
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_file.flush()
                
                print(f"[BATCH-OCR] Created temp file: {temp_file.name}")
                
                # Extract text using OCR service
                extracted_text = ocr_service.extract_text_from_file(temp_file.name)
                
                print(f"[BATCH-OCR] OCR extracted {len(extracted_text)} characters")
                
                # AI analysis if requested and available
                ai_analysis = None
                if extract_fields and extracted_text.strip() and ai_extractor.is_available():
                    print(f"[BATCH-OCR] Running AI analysis on {file.filename}")
                    ai_analysis = ai_extractor.extract_property_data(extracted_text)
                    print(f"[BATCH-OCR] AI analysis complete for {file.filename}")
                elif extract_fields:
                    print(f"[BATCH-OCR] AI analysis requested but not available")
                
                # Prepare result
                file_result = {
                    "filename": file.filename,
                    "extracted_text": extracted_text,
                    "character_count": len(extracted_text),
                    "ai_analysis": ai_analysis,
                    "success": True
                }
                
                # Clean up temp file
                os.unlink(temp_file.name)
                
                results.append(file_result)
                print(f"[BATCH-OCR] Successfully processed {file.filename}")
                
        except Exception as e:
            print(f"[BATCH-OCR] Error processing {file.filename}: {e}")
            results.append({
                "filename": file.filename,
                "error": str(e),
                "success": False
            })
    
    print(f"[BATCH-OCR] Batch processing complete: {len(results)} results")
    
    return {
        "message": f"Processed {len(files)} files",
        "results": results,
        "total_files": len(files),
        "successful_files": len([r for r in results if r.get("success", False)])
    }


@router.post("/single-file")
async def process_single_file(
    file: UploadFile = File(...),
    extract_property_fields: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Process single file with OCR and optional property field extraction
    """
    print(f"[BATCH-OCR] Processing single file: {file.filename}")
    
    ocr_service = get_ocr_service()
    ai_extractor = get_ai_extractor()
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            
            print(f"[BATCH-OCR] Created temp file: {temp_file.name}")
            
            # Extract text using OCR service
            extracted_text = ocr_service.extract_text_from_file(temp_file.name)
            
            print(f"[BATCH-OCR] OCR extracted {len(extracted_text)} characters")
            
            # AI analysis if requested
            ai_analysis = None
            if extract_property_fields and extracted_text.strip() and ai_extractor.is_available():
                print(f"[BATCH-OCR] Running AI property field extraction on {file.filename}")
                ai_analysis = ai_extractor.extract_property_data(extracted_text)
                print(f"[BATCH-OCR] AI property field extraction complete for {file.filename}")
            elif extract_property_fields:
                print(f"[BATCH-OCR] AI property field extraction requested but not available")
            
            result = {
                "filename": file.filename,
                "extracted_text": extracted_text,
                "character_count": len(extracted_text),
                "ai_analysis": ai_analysis,
                "success": True
            }
            
            # Clean up temp file
            os.unlink(temp_file.name)
            
            print(f"[BATCH-OCR] Successfully processed {file.filename}")
            return result
            
    except Exception as e:
        print(f"[BATCH-OCR] Error processing {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}")


@router.post("/batch-process")
async def batch_process(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Process batch OCR from file IDs (frontend compatibility)
    Expected format: {"file_ids": [...], "consolidate_analysis": true, "auto_populate": true}
    """
    print(f"[BATCH-OCR] Received batch process request: {request_data}")
    
    try:
        file_ids = request_data.get("file_ids", [])
        if not file_ids:
            raise HTTPException(status_code=400, detail="No file_ids provided")
        
        print(f"[BATCH-OCR] Processing {len(file_ids)} files")
        
        ocr_service = get_ocr_service()
        ai_extractor = get_ai_extractor()
        results = []
        
        for file_id in file_ids:
            print(f"[BATCH-OCR] Processing file ID: {file_id}")
            
            # Query the file from database
            file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
            
            if not file_record:
                print(f"[BATCH-OCR] File not found: {file_id}")
                results.append({
                    "file_id": file_id,
                    "error": "File not found",
                    "success": False
                })
                continue
            
            try:
                # Get file path from the database record
                file_path = file_record.file_path
                print(f"[BATCH-OCR] File path from database: {file_path}")
                
                # Validate file exists and is readable
                if not file_path or not os.path.exists(file_path):
                    print(f"[BATCH-OCR] File path does not exist: {file_path}")
                    results.append({
                        "file_id": file_id,
                        "filename": file_record.filename,
                        "error": f"File not found at path: {file_path}",
                        "success": False
                    })
                    continue
                
                if not os.access(file_path, os.R_OK):
                    print(f"[BATCH-OCR] File not readable: {file_path}")
                    results.append({
                        "file_id": file_id,
                        "filename": file_record.filename,
                        "error": f"File not readable: {file_path}",
                        "success": False
                    })
                    continue
                
                # Extract text using OCR service
                extracted_text = ocr_service.extract_text_from_file(file_path)
                
                print(f"[BATCH-OCR] OCR extracted {len(extracted_text)} characters from {file_record.filename}")
                
                # Analyze text with AI for property data extraction
                ai_analysis = None
                if ai_extractor.is_available() and extracted_text.strip():
                    print(f"[BATCH-OCR] Running AI analysis on {file_record.filename}")
                    ai_analysis = ai_extractor.extract_property_data(extracted_text)
                    print(f"[BATCH-OCR] AI analysis complete for {file_record.filename}")
                    print(f"[BATCH-OCR] AI analysis result type: {type(ai_analysis)}")
                    if ai_analysis:
                        if isinstance(ai_analysis, dict):
                            print(f"[BATCH-OCR] AI analysis keys: {list(ai_analysis.keys())}")
                            if 'comprehensive_data' in ai_analysis:
                                print(f"[BATCH-OCR] Found comprehensive_data with keys: {list(ai_analysis['comprehensive_data'].keys()) if isinstance(ai_analysis['comprehensive_data'], dict) else 'non-dict'}")
                        else:
                            print(f"[BATCH-OCR] AI analysis content: {str(ai_analysis)[:200]}...")
                    else:
                        print(f"[BATCH-OCR] AI analysis is None or empty")
                else:
                    print(f"[BATCH-OCR] AI analysis skipped for {file_record.filename} - not available or no text")
                
                results.append({
                    "file_id": file_id,
                    "filename": file_record.filename,
                    "extracted_text": extracted_text,
                    "character_count": len(extracted_text),
                    "ai_analysis": ai_analysis,
                    "success": True
                })
                
                print(f"[BATCH-OCR] Successfully processed file {file_id} with AI analysis")
                
            except Exception as file_error:
                print(f"[BATCH-OCR] Error processing file {file_id}: {file_error}")
                results.append({
                    "file_id": file_id,
                    "error": str(file_error),
                    "success": False
                })
        
        print(f"[BATCH-OCR] Batch processing complete: {len(results)} results")
        
        # Consolidate AI analysis from successful results
        print(f"[BATCH-OCR] Consolidation: Processing {len(results)} total results")
        successful_results = [r for r in results if r.get("success", False) and r.get("ai_analysis")]
        print(f"[BATCH-OCR] Consolidation: Found {len(successful_results)} successful results with AI analysis")
        
        # Debug: show what we have in results
        for i, result in enumerate(results):
            print(f"[BATCH-OCR] Result {i}: success={result.get('success')}, ai_analysis_present={bool(result.get('ai_analysis'))}, ai_analysis_type={type(result.get('ai_analysis'))}")
        
        consolidated_ai_data = None
        
        if successful_results:
            # Take the first successful AI analysis or merge multiple
            ai_data = successful_results[0].get("ai_analysis")
            if ai_data:
                consolidated_ai_data = ai_data
                print(f"[BATCH-OCR] Consolidated AI data available with keys: {list(ai_data.keys()) if isinstance(ai_data, dict) else 'non-dict data'}")
            else:
                print(f"[BATCH-OCR] First successful result has null ai_data")
        else:
            print(f"[BATCH-OCR] No successful results with AI analysis found")
        
        return {
            "message": f"Processed {len(file_ids)} files",
            "files": results,  # For frontend compatibility
            "results": results,  # For backward compatibility
            "total_files": len(file_ids),
            "successful_files": len([r for r in results if r.get("success", False)]),
            "comprehensive_data": consolidated_ai_data,  # Frontend expects this field
            "ai_analysis": consolidated_ai_data  # Alternative field name
        }
        
    except Exception as e:
        print(f"[BATCH-OCR] Batch processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Batch processing error: {str(e)}")


@router.get("/test")
async def test_ocr_service():
    """
    Test OCR service initialization
    """
    try:
        ocr_service = get_ocr_service()
        return {
            "message": "OCR service initialized successfully",
            "api_key_configured": bool(ocr_service.api_key),
            "api_key_preview": f"{ocr_service.api_key[:10]}...{ocr_service.api_key[-5:]}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR service error: {str(e)}")