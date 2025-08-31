"""
AI-powered document data extraction service using OpenAI GPT-4
"""
import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from openai import OpenAI
from app.core.config import settings

# Import performance optimization utilities
try:
    from app.utils.performance_optimizer import cached_extraction, timed_operation, PerformanceOptimizer
    from app.utils.data_validator import DataValidator, ValidationLevel
    OPTIMIZATIONS_AVAILABLE = True
except ImportError:
    # Fallback decorators if optimization modules aren't available
    def cached_extraction(expiry_minutes: int = 60):
        def decorator(func):
            return func
        return decorator
    
    def timed_operation(operation_name: str):
        def decorator(func):
            return func
        return decorator
    
    OPTIMIZATIONS_AVAILABLE = False

logger = logging.getLogger(__name__)

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
    "licensed_surveyor_number": "string or null",
    "land_name": "string or null",
    "extent": "string (e.g. '20.5 perches') or null",
    "extent_perches": "number (convert to perches) or null",
    "extent_square_meters": "number (convert to sq.m) or null",
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
    "location": {{
        "village": "string or null",
        "grama_niladhari_division": "string or null",
        "divisional_secretariat": "string or null",
        "district": "string or null",
        "province": "string or null"
    }},
    "scale": "string or null",
    "survey_method": "string or null",
    "datum": "string or null",
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
        "divisional_secretariat": "string or null",
        "district": "string or null",
        "province": "string or null",
        "postal_code": "string or null"
    }},
    "owner_name": "string or null",
    "property_type": "string or null (e.g. 'residential', 'commercial', 'industrial', 'agricultural', 'bare_land')",
    "building_details": {{
        "type": "string or null (e.g. 'house', 'apartment', 'shop', 'factory')",
        "floors": "number or null",
        "area": "string or null",
        "construction_year": "string or null",
        "construction_material": "string or null",
        "condition": "string or null (e.g. 'excellent', 'good', 'fair', 'poor')"
    }},
    "utilities": {{
        "electricity": "boolean or null",
        "water": "boolean or null",
        "telephone": "boolean or null",
        "internet": "boolean or null",
        "gas": "boolean or null",
        "drainage": "boolean or null"
    }},
    "access_details": {{
        "road_type": "string or null (e.g. 'paved', 'gravel', 'earth')",
        "road_width": "string or null",
        "public_transport": "string or null"
    }},
    "site_features": {{
        "topography": "string or null (e.g. 'flat', 'sloping', 'hilly')",
        "soil_type": "string or null",
        "drainage": "string or null",
        "special_features": ["list of special features or empty array"]
    }},
    "nearby_amenities": {{
        "schools": ["list of nearby schools or empty array"],
        "hospitals": ["list of nearby hospitals or empty array"],
        "banks": ["list of nearby banks or empty array"],
        "markets": ["list of nearby markets or empty array"]
    }},
    "landmarks": ["list of nearby landmarks or empty array"],
    "legal_status": {{
        "ownership_type": "string or null",
        "encumbrances": "string or null",
        "restrictions": "string or null"
    }}
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


@cached_extraction(expiry_minutes=120)  # Cache for 2 hours
@timed_operation("comprehensive_extraction")
def extract_comprehensive_property_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract comprehensive property information for all wizard steps
    """
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    prompt = f"""
You are an expert at extracting comprehensive property information from Sri Lankan property documents (survey plans, deeds, valuation reports, etc.).
Analyze the following OCR text and extract ALL available information that would be useful for creating a detailed property valuation report.

OCR Text:
{ocr_text}

Please extract and return ONLY a JSON object with these comprehensive fields:
{{
    "identification": {{
        "lot_number": "string or null",
        "plan_number": "string or null", 
        "plan_date": "string (YYYY-MM-DD format) or null",
        "surveyor_name": "string or null",
        "licensed_surveyor_number": "string or null",
        "land_name": "string or null",
        "extent_perches": "number or null",
        "extent_sqm": "number or null",
        "extent_local": "string or null (e.g. '2A-3R-15.5P')",
        "boundaries": {{
            "north": "string or null",
            "south": "string or null", 
            "east": "string or null",
            "west": "string or null"
        }},
        "title_owner": "string or null",
        "deed_no": "string or null",
        "deed_date": "string (YYYY-MM-DD format) or null",
        "notary": "string or null",
        "interest": "string (freehold/leasehold) or null"
    }},
    "location": {{
        "address": {{
            "house_number": "string or null",
            "street": "string or null",
            "city": "string or null",
            "postal_code": "string or null"
        }},
        "gn_division": "string or null",
        "ds_division": "string or null", 
        "district": "string or null",
        "province": "string or null",
        "latitude": "number or null",
        "longitude": "number or null",
        "road_access": "string or null",
        "road_width": "number or null",
        "nearest_landmark": "string or null",
        "directions": "string or null",
        "public_transport": "string or null",
        "distance_to_town": "number or null",
        "distance_to_colombo": "number or null",
        "nearest_railway_station": "string or null"
    }},
    "site": {{
        "shape": "string or null",
        "frontage": "number or null",
        "depth": "number or null", 
        "aspect": "string or null",
        "topography": "string or null",
        "gradient": "number or null",
        "level_relative_to_road": "string or null",
        "elevation_difference": "number or null",
        "soil_type": "string or null",
        "drainage": "string or null",
        "flood_risk": "string or null",
        "bearing_capacity": "string or null",
        "soil_notes": "string or null",
        "site_features": ["list of features or empty array"],
        "other_features": "string or null",
        "noise_level": "string or null",
        "air_quality": "string or null",
        "environmental_issues": "string or null",
        "pedestrian_access": "string or null",
        "vehicle_access": "string or null",
        "access_notes": "string or null"
    }},
    "buildings": [
        {{
            "type": "string or null",
            "use": "string or null",
            "floor_area": "number or null",
            "construction_year": "number or null",
            "construction_type": "string or null",
            "roof_type": "string or null",
            "wall_type": "string or null",
            "floor_type": "string or null", 
            "condition": "string or null",
            "stories": "number or null",
            "description": "string or null"
        }}
    ],
    "utilities": {{
        "electricity": {{
            "available": "string (yes/nearby/no) or null",
            "type": "string or null", 
            "connection_status": "string or null",
            "provider": "string or null",
            "account_number": "string or null"
        }},
        "water": {{
            "main_source": "string or null",
            "quality": "string or null",
            "reliability": "string or null",
            "provider": "string or null"
        }},
        "telecom": {{
            "fixed_line": "boolean or null",
            "mobile_coverage": "boolean or null", 
            "broadband": "boolean or null",
            "providers": "string or null"
        }},
        "sewerage": {{
            "type": "string or null",
            "condition": "string or null"
        }},
        "drainage": {{
            "surface": "string or null",
            "storm_water": "string or null"
        }}
    }},
    "locality": {{
        "neighborhood_character": "string or null",
        "development_stage": "string or null",
        "property_types": ["list of property types or empty array"],
        "commercial_activities": ["list of activities or empty array"],
        "schools": ["list of schools or empty array"],
        "hospitals": ["list of hospitals or empty array"],
        "banks": ["list of banks or empty array"],
        "markets": ["list of markets or empty array"],
        "religious_places": ["list of places or empty array"],
        "recreational_facilities": ["list of facilities or empty array"],
        "security_situation": "string or null",
        "future_development": "string or null"
    }},
    "planning": {{
        "zoning": "string or null",
        "permitted_uses": ["list of uses or empty array"],
        "building_height_limit": "number or null",
        "setback_requirements": {{
            "front": "number or null",
            "rear": "number or null",
            "side": "number or null"
        }},
        "floor_area_ratio": "number or null",
        "coverage_ratio": "number or null",
        "special_conditions": "string or null"
    }},
    "legal": {{
        "ownership_type": "string or null",
        "encumbrances": "string or null",
        "restrictions": "string or null",
        "easements": "string or null",
        "pending_litigation": "string or null",
        "statutory_approvals": "string or null"
    }}
}}

Instructions:
- Extract ALL available information, don't limit to just survey plan data
- Look for building descriptions, construction details, amenities mentioned
- Identify utilities mentioned (electricity account numbers, water connections, etc.)
- Extract neighborhood information, nearby facilities mentioned
- Identify any legal restrictions, encumbrances, or special conditions
- For coordinates, look for GPS coordinates, survey coordinates, or location references
- For areas, convert between different units (perches, sq.m, acres, etc.) 
- Be comprehensive but accurate - only include information clearly stated in the document

Return only valid JSON, no other text.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert Sri Lankan property document analyzer. Extract comprehensive data accurately and return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.1
        )
        
        result = response.choices[0].message.content.strip()
        
        # Clean the response - remove markdown code blocks if present
        if result.startswith('```json'):
            result = result.replace('```json', '').replace('```', '').strip()
        elif result.startswith('```'):
            result = result.replace('```', '').strip()
        
        # Parse JSON response
        extracted_data = json.loads(result)
        extracted_data["extraction_type"] = "comprehensive"
        extracted_data["model_used"] = "gpt-4o"
        
        # Apply data validation and optimization if available
        if OPTIMIZATIONS_AVAILABLE:
            # Optimize OCR text for better processing
            optimized_text = PerformanceOptimizer.optimize_ocr_text(ocr_text)
            if optimized_text != ocr_text:
                logger.info("OCR text was optimized for better processing")
            
            # Validate and clean the extracted data
            try:
                cleaned_data, validation_errors = DataValidator.validate_comprehensive_data(
                    extracted_data, ValidationLevel.MODERATE
                )
                
                if validation_errors:
                    logger.warning(f"Data validation found {len(validation_errors)} issues: {validation_errors}")
                    extracted_data["validation_warnings"] = validation_errors
                
                # Merge cleaned data back
                for section, section_data in cleaned_data.items():
                    if section_data:  # Only update sections with valid data
                        extracted_data[section] = section_data
                        
                extracted_data["data_validated"] = True
                extracted_data["validation_errors_count"] = len(validation_errors)
                
            except Exception as validation_error:
                logger.error(f"Data validation failed: {str(validation_error)}")
                extracted_data["validation_error"] = str(validation_error)
                extracted_data["data_validated"] = False
        
        # Add extraction metadata
        extracted_data["extraction_timestamp"] = json.dumps(datetime.now().isoformat())
        extracted_data["text_length"] = len(ocr_text)
        
        return extracted_data
        
    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse AI response as JSON: {str(e)}", "raw_response": result}
    except Exception as e:
        return {"error": f"OpenAI API error: {str(e)}"}


def extract_utilities_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract detailed utilities information from property documents
    Specifically focused on electricity, water, telecom, and sewerage systems
    """
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    prompt = f"""
You are an expert at extracting utilities information from Sri Lankan property documents including deeds, survey plans, and inspection reports.
Analyze the following OCR text and extract detailed utilities information.
Look for indicators like account numbers, connection status, service providers, and infrastructure details.

OCR Text:
{ocr_text}

Please extract and return ONLY a JSON object with these fields:
{{
    "electricity": {{
        "available": "string (yes/nearby/no) or null",
        "type": "string (single_phase/three_phase/industrial) or null", 
        "connection_status": "string (connected/meter_installed/wiring_ready/not_connected) or null",
        "provider": "string (CEB/LECO/Other) or null",
        "account_number": "string or null",
        "notes": "string or null"
    }},
    "water": {{
        "main_source": "string (mains/community_well/private_well/borehole/spring/rainwater/none) or null",
        "quality": "string (excellent/good/fair/poor/not_potable) or null",
        "reliability": "string (continuous/frequent/intermittent/seasonal/unreliable) or null",
        "provider": "string (NWSDB/Local Authority/Private) or null",
        "notes": "string or null"
    }},
    "telecom": {{
        "fixed_line": "boolean or null",
        "mobile_coverage": "boolean or null", 
        "broadband": "boolean or null",
        "fiber_optic": "boolean or null",
        "cable_tv": "boolean or null",
        "providers": "string or null (e.g. 'SLT, Dialog')",
        "internet_speed": "number or null"
    }},
    "sewerage": {{
        "type": "string (mains_sewer/septic_tank/soakage_pit/biogas_plant/composting_toilet/none) or null",
        "condition": "string (excellent/good/fair/poor/failing) or null"
    }},
    "drainage": {{
        "surface": "string (excellent/good/fair/poor/very_poor) or null",
        "storm_water": "string (municipal_drains/natural_drainage/retention_ponds/inadequate/none) or null",
        "notes": "string or null"
    }},
    "other": {{
        "gas_connection": "boolean or null",
        "garbage_collection": "boolean or null",
        "street_lighting": "boolean or null",
        "security_services": "boolean or null",
        "postal_service": "boolean or null",
        "fire_hydrant": "boolean or null"
    }},
    "analysis_notes": "string with reasoning for connections and status determinations"
}}

Instructions:
- For electricity: If you find account numbers (CEB/LECO account), set connection_status as "connected"
- For electricity: If you see "electricity available" or "power connection", set available as "yes"
- For water: Look for "water connection", "NWSDB", "well", "bore hole" etc.
- For telecom: Look for "telephone", "internet", "broadband", "SLT", "Dialog" etc.  
- Consider context clues - if a building exists, utilities likely available
- If document mentions "developed area" or "residential area", utilities more likely available
- Be conservative - only set values when there's clear evidence
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert property document analyzer specializing in Sri Lankan utilities extraction. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1500
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove any markdown formatting
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        
        data = json.loads(content)
        data["extraction_type"] = "utilities"
        data["model_used"] = "gpt-4"
        
        return data
        
    except Exception as e:
        return {"error": f"Utilities extraction failed: {str(e)}"}


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
        "comprehensive_data": {},
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
    
    # Extract comprehensive data for all wizard steps (NEW ENHANCED VERSION)
    try:
        result["comprehensive_data"] = extract_comprehensive_property_data(processed_text)
    except Exception as e:
        result["comprehensive_data"] = {"error": f"Comprehensive extraction failed: {str(e)}"}
    
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
    
    # Extract detailed utilities data using processed text
    try:
        result["utilities_data"] = extract_utilities_data(processed_text)
    except Exception as e:
        result["utilities_data"] = {"error": f"Utilities extraction failed: {str(e)}"}
    
    return result