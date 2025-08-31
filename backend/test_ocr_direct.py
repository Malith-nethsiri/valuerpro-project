#!/usr/bin/env python3
"""
Direct OCR and AI testing script
Tests Google Vision OCR and OpenAI document analysis
"""

import os
import sys
import time
from pathlib import Path

# Add the backend app to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

# Set environment variables for testing (only if not already set)
if 'GOOGLE_APPLICATION_CREDENTIALS' not in os.environ:
    credentials_path = os.environ.get('GOOGLE_CLOUD_CREDENTIALS_PATH', './credentials/google-cloud-key.json')
    if os.path.exists(credentials_path):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
    else:
        print(f"[WARNING] Google Cloud credentials not found at {credentials_path}")
        print("[INFO] Please set GOOGLE_APPLICATION_CREDENTIALS environment variable")

try:
    from google.cloud import vision
    from app.services.ai_extraction import process_document_with_ai
    from app.services.translation import process_mixed_language_text, is_translation_available
    VISION_AVAILABLE = True
    print("[SUCCESS] All required libraries imported successfully")
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    VISION_AVAILABLE = False
    sys.exit(1)

def test_google_vision_credentials():
    """Test Google Vision API credentials"""
    print("\n[TEST] Testing Google Vision API credentials...")
    try:
        client = vision.ImageAnnotatorClient()
        print("[SUCCESS] Google Vision client initialized successfully")
        return client
    except Exception as e:
        print(f"[ERROR] Failed to initialize Google Vision client: {e}")
        return None

def test_ocr_extraction(image_path: str, client):
    """Test OCR text extraction"""
    print(f"\n[TEST] Testing OCR extraction on: {image_path}")
    try:
        # Read image file
        with open(image_path, 'rb') as f:
            image_data = f.read()
        print(f"[SUCCESS] Image file read successfully, size: {len(image_data)} bytes")
        
        # Create Vision Image
        image = vision.Image(content=image_data)
        print("[SUCCESS] Vision Image object created")
        
        # Call Google Vision API
        print("[TEST] Calling Google Vision API...")
        response = client.document_text_detection(image=image)
        print("[SUCCESS] Google Vision API call completed")
        
        # Check for API errors
        if response.error.message:
            print(f"[ERROR] Vision API error: {response.error.message}")
            return None
        
        # Extract text
        texts = response.text_annotations
        if texts and len(texts) > 0:
            extracted_text = texts[0].description
            print(f"[SUCCESS] Text extracted successfully!")
            print(f"[INFO] Text length: {len(extracted_text)} characters")
            # Handle potential encoding issues in display
            try:
                preview = extracted_text[:200].encode('ascii', 'ignore').decode('ascii')
                print(f"[INFO] First 200 characters (ASCII only): {preview}...")
            except:
                print("[INFO] Text contains non-ASCII characters - skipping preview")
            return extracted_text
        else:
            print("[WARNING] No text found in image")
            return ""
            
    except Exception as e:
        print(f"[ERROR] OCR extraction failed: {e}")
        return None

def test_translation_service(text: str):
    """Test translation service"""
    print(f"\n[TEST] Testing translation service...")
    try:
        if is_translation_available():
            print("[SUCCESS] Translation service is available")
            processed_text, detected_languages = process_mixed_language_text(text)
            print(f"[SUCCESS] Translation processed successfully")
            print(f"[INFO] Detected languages: {detected_languages}")
            print(f"[INFO] Processed text length: {len(processed_text)} characters")
            return processed_text, detected_languages
        else:
            print("[WARNING] Translation service not available")
            return text, "en"
    except Exception as e:
        print(f"[ERROR] Translation failed: {e}")
        return text, "unknown"

def test_ai_extraction(text: str):
    """Test AI document analysis"""
    print(f"\n[TEST] Testing AI document analysis...")
    try:
        ai_result = process_document_with_ai(text)
        print("[SUCCESS] AI document analysis completed successfully")
        print(f"[INFO] Document type: {ai_result.get('document_type', 'unknown')}")
        
        extracted_data = ai_result.get('extracted_data', {})
        general_data = ai_result.get('general_data', {})
        
        print(f"[INFO] Extracted data fields: {len(extracted_data)}")
        print(f"[INFO] General data fields: {len(general_data)}")
        
        if extracted_data:
            print("[INFO] Extracted data preview:")
            for key, value in list(extracted_data.items())[:3]:
                print(f"  - {key}: {str(value)[:50]}...")
        
        return ai_result
    except Exception as e:
        print(f"[ERROR] AI extraction failed: {e}")
        return {"error": str(e)}

def main():
    """Main test function"""
    print("[START] Starting OCR and AI Testing")
    print("=" * 50)
    
    image_path = "./test_image.jpg"
    
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"[ERROR] Test image not found: {image_path}")
        return
    
    # Test Google Vision credentials
    vision_client = test_google_vision_credentials()
    if not vision_client:
        return
    
    # Test OCR extraction
    extracted_text = test_ocr_extraction(image_path, vision_client)
    if not extracted_text:
        print("[ERROR] Cannot proceed without extracted text")
        return
    
    # Test translation service
    processed_text, detected_languages = test_translation_service(extracted_text)
    
    # Test AI extraction
    ai_result = test_ai_extraction(processed_text)
    
    # Summary
    print("\n" + "=" * 50)
    print("[SUMMARY] TEST SUMMARY")
    print("=" * 50)
    print(f"[RESULT] OCR Extraction: {'SUCCESS' if extracted_text else 'FAILED'}")
    print(f"[RESULT] Translation: {'SUCCESS' if detected_languages != 'unknown' else 'FAILED'}")
    print(f"[RESULT] AI Analysis: {'SUCCESS' if 'error' not in ai_result else 'FAILED'}")
    
    if extracted_text and 'error' not in ai_result:
        print("\n[SUCCESS] All tests completed successfully!")
        print("[INFO] The OCR and AI pipeline is working correctly")
    else:
        print("\n[WARNING] Some tests failed - check the logs above")

if __name__ == "__main__":
    main()