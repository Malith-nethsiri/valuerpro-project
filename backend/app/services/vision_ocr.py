"""
Clean Google Vision OCR Service
Simple, reliable OCR using Google Vision API with API key authentication
"""
import base64
import requests
from typing import Optional, List, Dict, Any
from pathlib import Path
from fastapi import HTTPException
from app.core.config import settings


class VisionOCRClient:
    """Simple Google Vision API client using API key"""
    
    def __init__(self):
        if not settings.GOOGLE_CLOUD_VISION_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="GOOGLE_CLOUD_VISION_API_KEY not configured"
            )
        
        self.api_key = settings.GOOGLE_CLOUD_VISION_API_KEY
        self.base_url = "https://vision.googleapis.com/v1"
        print(f"[OCR] Initialized Vision client with API key: {self.api_key[:10]}...{self.api_key[-5:]}")
    
    def extract_text_from_image_bytes(self, image_bytes: bytes, use_document_detection: bool = False) -> str:
        """Extract text from image bytes using Google Vision API"""
        
        detection_type = "DOCUMENT_TEXT_DETECTION" if use_document_detection else "TEXT_DETECTION"
        url = f"{self.base_url}/images:annotate?key={self.api_key}"
        
        payload = {
            "requests": [
                {
                    "image": {
                        "content": base64.b64encode(image_bytes).decode('utf-8')
                    },
                    "features": [
                        {
                            "type": detection_type,
                            "maxResults": 10
                        }
                    ]
                }
            ]
        }
        
        headers = {'Content-Type': 'application/json'}
        
        print(f"[OCR] Making {detection_type} request to Google Vision API")
        print(f"[OCR] Image size: {len(image_bytes)} bytes")
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            print(f"[OCR] Response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"[OCR] Error response: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Google Vision API error: {response.text}"
                )
            
            result = response.json()
            print(f"[OCR] Response received successfully")
            
            # Parse response
            if 'responses' in result and result['responses']:
                response_data = result['responses'][0]
                
                if 'error' in response_data:
                    error_msg = response_data['error']['message']
                    print(f"[OCR] Vision API error: {error_msg}")
                    raise HTTPException(status_code=500, detail=f"Vision API error: {error_msg}")
                
                # Extract text
                extracted_text = ""
                
                if use_document_detection:
                    # For document detection, try full text annotation first
                    if 'fullTextAnnotation' in response_data:
                        extracted_text = response_data['fullTextAnnotation'].get('text', '')
                    elif 'textAnnotations' in response_data and response_data['textAnnotations']:
                        extracted_text = response_data['textAnnotations'][0].get('description', '')
                else:
                    # For regular text detection
                    if 'textAnnotations' in response_data and response_data['textAnnotations']:
                        extracted_text = response_data['textAnnotations'][0].get('description', '')
                
                print(f"[OCR] Extracted text length: {len(extracted_text)} characters")
                if extracted_text:
                    print(f"[OCR] Text sample: {extracted_text[:100]}...")
                else:
                    print("[OCR] No text found in image")
                    
                return extracted_text
            
            print("[OCR] No response data from Vision API")
            return ""
            
        except requests.exceptions.Timeout:
            print("[OCR] Request timeout")
            raise HTTPException(status_code=500, detail="Vision API request timeout")
        except requests.exceptions.RequestException as e:
            print(f"[OCR] Request error: {e}")
            raise HTTPException(status_code=500, detail=f"Vision API request error: {str(e)}")


class OCRResult:
    """Simple OCR result container"""
    def __init__(self, file_path: str, text: str, pages: int = 1):
        self.file_path = file_path
        self.text = text  
        self.pages = pages


def extract_text_from_file(file_path: str) -> OCRResult:
    """Extract text from various file types"""
    
    print(f"[OCR] Processing file: {file_path}")
    
    file_ext = Path(file_path).suffix.lower()
    client = VisionOCRClient()
    
    if file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.tif']:
        return _process_image_file(file_path, client)
    elif file_ext == '.pdf':
        return _process_pdf_file(file_path, client)  
    elif file_ext == '.docx':
        return _process_docx_file(file_path)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")


def _process_image_file(image_path: str, client: VisionOCRClient) -> OCRResult:
    """Process single image file"""
    
    print(f"[OCR] Processing image: {image_path}")
    
    with open(image_path, 'rb') as f:
        image_bytes = f.read()
    
    text = client.extract_text_from_image_bytes(image_bytes, use_document_detection=False)
    
    return OCRResult(
        file_path=image_path,
        text=text,
        pages=1
    )


def _process_pdf_file(pdf_path: str, client: VisionOCRClient) -> OCRResult:
    """Process PDF file by converting pages to images"""
    
    print(f"[OCR] Processing PDF: {pdf_path}")
    
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PyMuPDF not installed for PDF processing")
    
    doc = fitz.open(pdf_path)
    all_text = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        
        # Convert page to image
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        
        # Extract text using Vision API
        text = client.extract_text_from_image_bytes(img_data, use_document_detection=True)
        all_text.append(text)
        
        print(f"[OCR] Processed PDF page {page_num + 1}/{len(doc)}")
    
    doc.close()
    
    full_text = "\n\n".join(all_text)
    
    return OCRResult(
        file_path=pdf_path,
        text=full_text,
        pages=len(all_text)
    )


def _process_docx_file(docx_path: str) -> OCRResult:
    """Process DOCX file by extracting text directly"""
    
    print(f"[OCR] Processing DOCX: {docx_path}")
    
    try:
        from docx import Document
    except ImportError:
        raise HTTPException(status_code=500, detail="python-docx not installed for DOCX processing")
    
    doc = Document(docx_path)
    full_text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
    
    return OCRResult(
        file_path=docx_path,
        text=full_text,
        pages=1
    )