"""
AI-powered document data extraction service using OpenAI GPT-4
"""
import os
import json
from typing import Dict, List, Optional, Any
from openai import OpenAI
from app.core.config import settings

# Initialize OpenAI client
client = None
if settings.OPENAI_API_KEY:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)


class DocumentType:
    SURVEY_PLAN = "survey_plan"
    DEED = "deed"
    PRIOR_VALUATION = "prior_valuation"
    OTHER = "other"


def detect_document_type(ocr_text: str) -> str:
    """
    Detect the type of document based on OCR text content
    """
    text_lower = ocr_text.lower()
    
    # Survey plan indicators
    survey_indicators = [
        "survey plan", "plan no", "lot no", "surveyor", "licensed surveyor",
        "scale", "bearing", "coordinates", "boundaries"
    ]
    
    # Deed indicators  
    deed_indicators = [
        "deed", "notary", "attorney", "witnesseth", "transfer", "conveyance",
        "party of the first part", "party of the second part", "consideration"
    ]
    
    # Valuation report indicators
    valuation_indicators = [
        "valuation report", "market value", "forced sale value", "chartered valuer",
        "assessment", "appraisal", "estimate"
    ]
    
    survey_count = sum(1 for indicator in survey_indicators if indicator in text_lower)
    deed_count = sum(1 for indicator in deed_indicators if indicator in text_lower)
    valuation_count = sum(1 for indicator in valuation_indicators if indicator in text_lower)
    
    if survey_count >= 2:
        return DocumentType.SURVEY_PLAN
    elif deed_count >= 2:
        return DocumentType.DEED
    elif valuation_count >= 2:
        return DocumentType.PRIOR_VALUATION
    else:
        return DocumentType.OTHER


def extract_survey_plan_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract structured data from survey plan OCR text using GPT-4
    """
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    prompt = f"""
You are an expert at extracting information from Sri Lankan survey plans. 
Analyze the following OCR text from a survey plan document and extract the following information.
If any information is not found or unclear, use null for that field.

OCR Text:
{ocr_text}

Please extract and return ONLY a JSON object with these fields:
{{
    "lot_number": "string or null",
    "plan_number": "string or null", 
    "plan_date": "string (YYYY-MM-DD format) or null",
    "surveyor_name": "string or null",
    "land_name": "string or null",
    "extent": "string (e.g. '20.5 perches') or null",
    "boundaries": {{
        "north": "string or null",
        "south": "string or null", 
        "east": "string or null",
        "west": "string or null"
    }},
    "coordinates": {{
        "latitude": "number or null",
        "longitude": "number or null"
    }},
    "scale": "string or null",
    "additional_notes": "string or null"
}}

Return only valid JSON, no other text.
"""
    
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=settings.OPENAI_MAX_TOKENS,
            temperature=settings.OPENAI_TEMPERATURE
        )
        
        result = response.choices[0].message.content.strip()
        
        # Clean the response - remove markdown code blocks if present
        if result.startswith('```json'):
            result = result.replace('```json', '').replace('```', '').strip()
        elif result.startswith('```'):
            result = result.replace('```', '').strip()
        
        # Parse JSON response
        return json.loads(result)
        
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse AI response as JSON: {str(e)}", "raw_response": result}
    except Exception as e:
        return {"error": f"OpenAI API error: {str(e)}"}


def extract_deed_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract structured data from deed OCR text using GPT-4
    """
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    prompt = f"""
You are an expert at extracting information from Sri Lankan property deeds and legal documents.
Analyze the following OCR text from a deed document and extract the following information.
If any information is not found or unclear, use null for that field.

OCR Text:
{ocr_text}

Please extract and return ONLY a JSON object with these fields:
{{
    "deed_number": "string or null",
    "deed_date": "string (YYYY-MM-DD format) or null",
    "notary_attorney": "string or null", 
    "parties": {{
        "vendor": "string or null",
        "purchaser": "string or null"
    }},
    "property_description": "string or null",
    "consideration_amount": "string or null",
    "lot_number": "string or null",
    "plan_reference": "string or null",
    "encumbrances": "string or null",
    "conditions": "string or null",
    "witnesses": ["list of witness names or empty array"],
    "additional_notes": "string or null"
}}

Return only valid JSON, no other text.
"""
    
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=settings.OPENAI_MAX_TOKENS,
            temperature=settings.OPENAI_TEMPERATURE
        )
        
        result = response.choices[0].message.content.strip()
        
        # Clean the response - remove markdown code blocks if present
        if result.startswith('```json'):
            result = result.replace('```json', '').replace('```', '').strip()
        elif result.startswith('```'):
            result = result.replace('```', '').strip()
        
        return json.loads(result)
        
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse AI response as JSON: {str(e)}", "raw_response": result}
    except Exception as e:
        return {"error": f"OpenAI API error: {str(e)}"}


def extract_general_property_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract general property information from any document type
    """
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    prompt = f"""
You are an expert at extracting property information from various Sri Lankan property documents.
Analyze the following OCR text and extract any relevant property information you can find.
If any information is not found or unclear, use null for that field.

OCR Text:
{ocr_text}

Please extract and return ONLY a JSON object with these fields:
{{
    "property_address": "string or null",
    "location_details": {{
        "village": "string or null",
        "grama_niladhari_division": "string or null",
        "district": "string or null",
        "province": "string or null"
    }},
    "owner_name": "string or null",
    "property_type": "string or null (e.g. 'residential', 'commercial', 'land')",
    "building_details": {{
        "type": "string or null",
        "floors": "number or null",
        "area": "string or null",
        "construction_year": "string or null"
    }},
    "utilities": {{
        "electricity": "boolean or null",
        "water": "boolean or null",
        "telephone": "boolean or null"
    }},
    "access_road": "string or null",
    "landmarks": ["list of nearby landmarks or empty array"],
    "additional_features": ["list of additional features or empty array"]
}}

Return only valid JSON, no other text.
"""
    
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=settings.OPENAI_MAX_TOKENS,
            temperature=settings.OPENAI_TEMPERATURE
        )
        
        result = response.choices[0].message.content.strip()
        
        # Clean the response - remove markdown code blocks if present
        if result.startswith('```json'):
            result = result.replace('```json', '').replace('```', '').strip()
        elif result.startswith('```'):
            result = result.replace('```', '').strip()
        
        return json.loads(result)
        
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse AI response as JSON: {str(e)}", "raw_response": result}
    except Exception as e:
        return {"error": f"OpenAI API error: {str(e)}"}


def process_document_with_ai(ocr_text: str, document_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Main function to process a document with AI extraction including translation
    """
    from app.services.translation import process_mixed_language_text, detect_language, is_translation_available
    
    # Initialize result structure
    result = {
        "document_type": document_type,
        "extracted_data": {},
        "general_data": {},
        "translation_info": {
            "original_language": None,
            "was_translated": False,
            "translation_available": is_translation_available()
        }
    }
    
    # Handle translation if service is available
    processed_text = ocr_text
    if is_translation_available():
        try:
            # Detect original language
            detected_language = detect_language(ocr_text)
            result["translation_info"]["original_language"] = detected_language
            
            # Process mixed language text (translate Sinhala portions to English)
            if detected_language in ['si', 'mixed'] or 'si' in str(detected_language):
                processed_text, detected_languages = process_mixed_language_text(ocr_text)
                result["translation_info"]["was_translated"] = True
                result["translation_info"]["detected_languages"] = detected_languages
                result["translation_info"]["translated_text"] = processed_text
            else:
                result["translation_info"]["detected_languages"] = detected_language or "en"
        except Exception as e:
            # If translation fails, continue with original text
            result["translation_info"]["translation_error"] = str(e)
            processed_text = ocr_text
    
    # Auto-detect document type if not provided
    if not document_type:
        document_type = detect_document_type(processed_text)
        result["document_type"] = document_type
    
    # Extract specific data based on document type using processed (translated) text
    try:
        if document_type == DocumentType.SURVEY_PLAN:
            result["extracted_data"] = extract_survey_plan_data(processed_text)
        elif document_type == DocumentType.DEED:
            result["extracted_data"] = extract_deed_data(processed_text)
        else:
            # For other document types, try general extraction
            result["extracted_data"] = {"type": "other", "note": "Document type not specifically supported"}
    except Exception as e:
        result["extracted_data"] = {"error": f"Data extraction failed: {str(e)}"}
    
    # Always extract general property data using processed text
    try:
        result["general_data"] = extract_general_property_data(processed_text)
    except Exception as e:
        result["general_data"] = {"error": f"General data extraction failed: {str(e)}"}
    
    return result