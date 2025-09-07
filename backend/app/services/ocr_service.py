"""
Unified OCR Service - Clean Google Vision API Implementation
Uses proven API key authentication method for reliable text extraction
"""
import base64
import requests
from typing import Optional
from pathlib import Path
from fastapi import HTTPException
from app.core.config import settings


class OCRService:
    """Clean, simple OCR service using Google Vision API with API key"""
    
    def __init__(self):
        if not settings.GOOGLE_CLOUD_VISION_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="GOOGLE_CLOUD_VISION_API_KEY not configured in .env file"
            )
        
        self.api_key = settings.GOOGLE_CLOUD_VISION_API_KEY
        self.base_url = "https://vision.googleapis.com/v1"
        print(f"[OCR-SERVICE] Initialized with API key: {self.api_key[:10]}...{self.api_key[-5:]}")
    
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
        
        print(f"[OCR-SERVICE] Making {detection_type} request")
        print(f"[OCR-SERVICE] Image size: {len(image_bytes)} bytes")
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            print(f"[OCR-SERVICE] Vision API response status: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                print(f"[OCR-SERVICE] Vision API error: {error_text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Google Vision API error: {error_text}"
                )
            
            result = response.json()
            print(f"[OCR-SERVICE] Vision API response received successfully")
            
            # Parse response
            if 'responses' in result and result['responses']:
                response_data = result['responses'][0]
                
                if 'error' in response_data:
                    error_msg = response_data['error']['message']
                    print(f"[OCR-SERVICE] Vision API error in response: {error_msg}")
                    raise HTTPException(status_code=500, detail=f"Vision API error: {error_msg}")
                
                # Extract text
                extracted_text = ""
                
                if use_document_detection:
                    # For document detection, try full text annotation first
                    if 'fullTextAnnotation' in response_data and response_data['fullTextAnnotation']:
                        extracted_text = response_data['fullTextAnnotation'].get('text', '')
                        print(f"[OCR-SERVICE] Used fullTextAnnotation")
                    elif 'textAnnotations' in response_data and response_data['textAnnotations']:
                        extracted_text = response_data['textAnnotations'][0].get('description', '')
                        print(f"[OCR-SERVICE] Used textAnnotations fallback")
                else:
                    # For regular text detection
                    if 'textAnnotations' in response_data and response_data['textAnnotations']:
                        extracted_text = response_data['textAnnotations'][0].get('description', '')
                        print(f"[OCR-SERVICE] Used textAnnotations")
                
                print(f"[OCR-SERVICE] Extracted text length: {len(extracted_text)} characters")
                if extracted_text:
                    print(f"[OCR-SERVICE] Text sample: {extracted_text[:100].replace(chr(10), ' ')}...")
                else:
                    print("[OCR-SERVICE] No text found in image")
                    
                return extracted_text
            
            print("[OCR-SERVICE] No response data from Vision API")
            return ""
            
        except requests.exceptions.Timeout:
            print("[OCR-SERVICE] Request timeout")
            raise HTTPException(status_code=500, detail="Vision API request timeout")
        except requests.exceptions.RequestException as e:
            print(f"[OCR-SERVICE] Request error: {e}")
            raise HTTPException(status_code=500, detail=f"Vision API request error: {str(e)}")
    
    def extract_text_from_file(self, file_path: str) -> str:
        """Extract text from various file types"""
        
        print(f"[OCR-SERVICE] Processing file: {file_path}")
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.tif']:
            return self._process_image_file(file_path)
        elif file_ext == '.pdf':
            return self._process_pdf_file(file_path)  
        elif file_ext == '.docx':
            return self._process_docx_file(file_path)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
    
    def _process_image_file(self, image_path: str) -> str:
        """Process single image file"""
        
        print(f"[OCR-SERVICE] Processing image: {Path(image_path).name}")
        
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        text = self.extract_text_from_image_bytes(image_bytes, use_document_detection=False)
        
        print(f"[OCR-SERVICE] Image processing complete")
        return text
    
    def _process_pdf_file(self, pdf_path: str) -> str:
        """Process PDF file by converting pages to images"""
        
        print(f"[OCR-SERVICE] Processing PDF: {Path(pdf_path).name}")
        
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
            text = self.extract_text_from_image_bytes(img_data, use_document_detection=True)
            all_text.append(text)
            
            print(f"[OCR-SERVICE] Processed PDF page {page_num + 1}/{len(doc)}")
        
        doc.close()
        
        full_text = "\n\n".join(all_text)
        print(f"[OCR-SERVICE] PDF processing complete, total text length: {len(full_text)}")
        
        return full_text
    
    def _process_docx_file(self, docx_path: str) -> str:
        """Process DOCX file by extracting text directly"""
        
        print(f"[OCR-SERVICE] Processing DOCX: {Path(docx_path).name}")
        
        try:
            from docx import Document
        except ImportError:
            raise HTTPException(status_code=500, detail="python-docx not installed for DOCX processing")
        
        doc = Document(docx_path)
        full_text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
        
        print(f"[OCR-SERVICE] DOCX processing complete, text length: {len(full_text)}")
        
        return full_text


# Global service instance
_ocr_service = None

def get_ocr_service() -> OCRService:
    """Get singleton OCR service instance"""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service