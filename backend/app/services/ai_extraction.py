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
from app.services.srilanka_admin_divisions import enhance_location_with_admin_divisions

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
    CERTIFICATE_OF_SALE = "certificate_of_sale"
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
    
    # Certificate of Sale indicators
    certificate_of_sale_indicators = [
        "certificate of sale", "fiscal", "auction", "upset price", "highest bidder",
        "public auction", "sale by auction", "knocked down", "auctioneer", 
        "certificate under", "gazette notification", "recovery of debt"
    ]
    
    survey_count = sum(1 for indicator in survey_indicators if indicator in text_lower)
    deed_count = sum(1 for indicator in deed_indicators if indicator in text_lower)
    valuation_count = sum(1 for indicator in valuation_indicators if indicator in text_lower)
    certificate_count = sum(1 for indicator in certificate_of_sale_indicators if indicator in text_lower)
    
    if certificate_count >= 2:
        return DocumentType.CERTIFICATE_OF_SALE
    elif survey_count >= 2:
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


def extract_certificate_of_sale_data(ocr_text: str) -> Dict[str, Any]:
    """
    Extract structured data from Certificate of Sale OCR text using GPT-4
    """
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    prompt = f"""
You are an expert at extracting information from Sri Lankan Certificate of Sale documents and auction records.
Analyze the following OCR text from a certificate of sale document and extract the following information.
If any information is not found or unclear, use null for that field.

OCR Text:
{ocr_text}

Please extract and return ONLY a JSON object with these fields:
{{
    "certificate_number": "string or null",
    "certificate_date": "string (YYYY-MM-DD format) or null",
    "fiscal_officer": "string or null",
    "auction_date": "string (YYYY-MM-DD format) or null",
    "auction_location": "string or null",
    "property_description": "string or null",
    "lot_number": "string or null",
    "plan_reference": "string or null",
    "extent": "string or null",
    "extent_perches": "number (convert to perches) or null",
    "location_details": {{
        "village": "string or null",
        "grama_niladhari_division": "string or null",
        "divisional_secretariat": "string or null",
        "district": "string or null",
        "province": "string or null"
    }},
    "sale_details": {{
        "upset_price": "string or null",
        "sale_price": "string or null",
        "highest_bidder": "string or null",
        "auctioneer": "string or null",
        "conditions_of_sale": "string or null"
    }},
    "legal_details": {{
        "judgment_debtor": "string or null",
        "judgment_creditor": "string or null",
        "case_number": "string or null",
        "court": "string or null",
        "gazette_notification": "string or null",
        "writ_number": "string or null"
    }},
    "boundaries": {{
        "north": "string or null",
        "south": "string or null",
        "east": "string or null",
        "west": "string or null"
    }},
    "encumbrances": "string or null",
    "special_conditions": "string or null",
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
You are an expert at extracting comprehensive property information from Sri Lankan property documents (survey plans, deeds, valuation reports, certificate of sale, etc.).
Analyze the following OCR text and extract ALL available information that would be useful for completing ALL 12 steps of a detailed property valuation report wizard.

IMPORTANT: This data will be used to auto-populate a 12-step valuation wizard covering:
1. Report Information
2. Property Identification  
3. Location Details
4. Site Characteristics
5. Legal Information
6. Locality Analysis
7. Planning & Zoning
8. Utilities Assessment
9. Transport & Access
10. Environmental Factors
11. Market Analysis
12. Appendices

OCR Text:
{ocr_text}

Please extract and return ONLY a JSON object with these comprehensive fields organized by wizard steps:
{{
    "report_information": {{
        "client_name": "string or null",
        "property_owner": "string or null", 
        "valuation_purpose": "string or null",
        "inspection_date": "string (YYYY-MM-DD format) or null",
        "report_date": "string (YYYY-MM-DD format) or null"
    }},
    "property_identification": {{
        "lot_number": "string or null",
        "plan_number": "string or null", 
        "plan_date": "string (YYYY-MM-DD format) or null",
        "surveyor_name": "string or null",
        "licensed_surveyor_number": "string or null",
        "land_name": "string or null",
        "property_name": "string or null",
        "extent_perches": "number or null",
        "extent_sqm": "number or null",
        "extent_acres": "number or null",
        "extent_local": "string or null (e.g. '2A-3R-15.5P')",
        "boundaries": {{
            "north": "string or null",
            "south": "string or null", 
            "east": "string or null",
            "west": "string or null"
        }},
        "ownership_type": "string (freehold/leasehold/permit/other) or null"
    }},
    "location_details": {{
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
        "nearest_landmark": "string or null",
        "directions_to_property": "string or null"
    }},
    "site_characteristics": {{
        "shape": "string or null",
        "frontage": "number (meters) or null",
        "depth": "number (meters) or null", 
        "aspect": "string or null",
        "topography": "string (flat/sloping/hilly) or null",
        "gradient": "string or null",
        "level_relative_to_road": "string (above/level/below) or null",
        "soil_type": "string or null",
        "drainage": "string (excellent/good/fair/poor) or null",
        "flood_risk": "string (none/low/medium/high) or null",
        "site_features": ["list of notable features or empty array"],
        "environmental_issues": "string or null"
    }},
    "legal_information": {{
        "title_owner": "string or null",
        "deed_number": "string or null",
        "deed_date": "string (YYYY-MM-DD format) or null",
        "notary": "string or null",
        "encumbrances": "string or null",
        "restrictions": "string or null",
        "easements": "string or null",
        "mortgage_details": "string or null",
        "legal_issues": "string or null"
    }},
    "locality_analysis": {{
        "neighborhood_character": "string or null",
        "development_stage": "string or null",
        "property_types": ["list of property types in area or empty array"],
        "schools": ["list of nearby schools or empty array"],
        "hospitals": ["list of nearby hospitals or empty array"],
        "banks": ["list of nearby banks or empty array"],
        "markets": ["list of nearby markets or empty array"],
        "religious_places": ["list of places of worship or empty array"],
        "recreational_facilities": ["list of facilities or empty array"],
        "commercial_activities": "string or null",
        "security_situation": "string or null"
    }},
    "planning_zoning": {{
        "zoning": "string or null",
        "permitted_uses": ["list of permitted uses or empty array"],
        "building_height_limit": "string or null",
        "setback_requirements": {{
            "front": "number (meters) or null",
            "rear": "number (meters) or null",
            "side": "number (meters) or null"
        }},
        "floor_area_ratio": "number or null",
        "coverage_ratio": "number or null",
        "special_conditions": "string or null"
    }},
    "utilities_assessment": {{
        "electricity": {{
            "available": "string (available/nearby/not_available) or null",
            "connection_type": "string (single_phase/three_phase) or null", 
            "connection_status": "string (connected/disconnected/ready) or null",
            "provider": "string (CEB/LECO/other) or null",
            "account_number": "string or null"
        }},
        "water": {{
            "main_source": "string (mains/well/borehole/spring/none) or null",
            "quality": "string (excellent/good/fair/poor) or null",
            "reliability": "string (continuous/intermittent/seasonal) or null",
            "provider": "string (NWSDB/local_authority/private) or null"
        }},
        "telecommunications": {{
            "fixed_line": "boolean or null",
            "mobile_coverage": "string (excellent/good/fair/poor) or null", 
            "broadband": "boolean or null",
            "fiber_optic": "boolean or null",
            "providers": "string or null"
        }},
        "sewerage": {{
            "type": "string (mains_sewer/septic_tank/soakage_pit/none) or null",
            "condition": "string (excellent/good/fair/poor) or null"
        }},
        "drainage": {{
            "surface_drainage": "string (excellent/good/fair/poor) or null",
            "storm_water_management": "string or null"
        }},
        "other_utilities": {{
            "gas_connection": "boolean or null",
            "garbage_collection": "boolean or null",
            "street_lighting": "boolean or null"
        }}
    }},
    "transport_access": {{
        "road_access": {{
            "main_road_name": "string or null",
            "road_type": "string (paved/gravel/earth) or null",
            "road_width": "number (meters) or null",
            "road_condition": "string (excellent/good/fair/poor) or null",
            "frontage_to_road": "number (meters) or null"
        }},
        "public_transport": {{
            "bus_service": "string (frequent/occasional/none) or null",
            "nearest_bus_stop": "string or null",
            "distance_to_bus_stop": "number (meters) or null",
            "railway_access": "string or null",
            "nearest_railway_station": "string or null",
            "distance_to_railway": "number (km) or null"
        }},
        "distances": {{
            "distance_to_town_center": "number (km) or null",
            "distance_to_colombo": "number (km) or null",
            "distance_to_airport": "number (km) or null",
            "distance_to_main_highway": "number (km) or null"
        }},
        "vehicle_access": "string (excellent/good/fair/poor/none) or null",
        "pedestrian_access": "string (excellent/good/fair/poor) or null"
    }},
    "environmental_factors": {{
        "nbro_clearance": {{
            "required": "boolean or null",
            "status": "string (obtained/pending/not_required) or null",
            "reference_number": "string or null"
        }},
        "natural_hazards": {{
            "flood_risk": "string (none/low/medium/high) or null",
            "landslide_risk": "string (none/low/medium/high) or null",
            "earthquake_risk": "string (none/low/medium/high) or null",
            "cyclone_risk": "string (none/low/medium/high) or null"
        }},
        "climate_factors": {{
            "rainfall_pattern": "string or null",
            "temperature_range": "string or null",
            "humidity_level": "string or null",
            "wind_exposure": "string or null"
        }},
        "environmental_issues": {{
            "air_quality": "string (excellent/good/fair/poor) or null",
            "noise_pollution": "string (none/low/moderate/high) or null",
            "water_pollution": "string (none/low/moderate/high) or null",
            "industrial_pollution": "string or null"
        }}
    }},
    "market_analysis": {{
        "comparable_sales": [
            {{
                "address": "string or null",
                "sale_date": "string (YYYY-MM-DD format) or null",
                "sale_price": "number or null",
                "land_extent": "number (perches) or null",
                "property_type": "string or null",
                "distance_from_subject": "number (km) or null"
            }}
        ],
        "market_trends": {{
            "price_trend": "string (increasing/stable/decreasing) or null",
            "demand_level": "string (high/moderate/low) or null",
            "supply_level": "string (limited/adequate/excess) or null",
            "market_activity": "string (active/moderate/slow) or null"
        }},
        "value_indicators": {{
            "land_value_per_perch": "number or null",
            "construction_cost_per_sqft": "number or null",
            "rental_yield": "number (percentage) or null"
        }}
    }},
    "buildings_improvements": [
        {{
            "building_type": "string (house/apartment/commercial/industrial) or null",
            "primary_use": "string or null",
            "floor_area": "number (sq ft) or null",
            "construction_year": "number or null",
            "construction_type": "string (masonry/timber/steel/concrete) or null",
            "roof_type": "string (tile/sheet/concrete/other) or null",
            "wall_type": "string (brick/block/timber/other) or null",
            "floor_type": "string (cement/tile/timber/other) or null",
            "condition": "string (excellent/good/fair/poor) or null",
            "stories": "number or null",
            "rooms": {{
                "bedrooms": "number or null",
                "bathrooms": "number or null",
                "living_rooms": "number or null",
                "kitchen": "number or null",
                "other_rooms": "number or null"
            }},
            "special_features": ["list of features or empty array"],
            "renovation_required": "string or null",
            "estimated_replacement_cost": "number or null"
        }}
    ],
    "appendices_references": {{
        "supporting_documents": ["list of document types mentioned or empty array"],
        "photographs": ["list of photo descriptions or empty array"],
        "maps_plans": ["list of maps/plans referenced or empty array"],
        "certificates": ["list of certificates mentioned or empty array"],
        "approvals": ["list of approvals referenced or empty array"],
        "inspection_notes": "string or null",
        "additional_information": "string or null",
        "data_sources": ["list of data sources or empty array"],
        "limitations": "string or null",
        "assumptions": "string or null"
    }}
}}

CRITICAL EXTRACTION GUIDELINES:
1. Extract EVERY piece of relevant information found in the document
2. Convert all measurements to consistent units (perches for land, sq ft for buildings, meters for distances)
3. Parse dates in YYYY-MM-DD format
4. Look for building descriptions, construction details, amenities mentioned
5. Identify utilities mentioned (account numbers, connections, providers)
6. Extract neighborhood info, nearby facilities, landmarks
7. Identify legal restrictions, encumbrances, special conditions
8. For coordinates, extract GPS coordinates, survey coordinates, or location references
9. Be comprehensive but accurate - only include information clearly stated in the document
10. For Certificate of Sale documents, focus on auction details, legal proceedings, and property descriptions
11. For Survey Plans, emphasize measurements, boundaries, and surveyor details
12. For Deeds, focus on ownership transfer, legal descriptions, and conditions
13. Cross-reference information where multiple document types provide the same data

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


def enhance_coordinates_with_admin_divisions(extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enhance extracted coordinates with Sri Lankan administrative divisions
    
    Args:
        extracted_data: Data extracted from documents
        
    Returns:
        Enhanced data with administrative divisions
    """
    try:
        # Look for coordinates in the comprehensive data structure
        coords = None
        
        if 'comprehensive_data' in extracted_data:
            comp_data = extracted_data['comprehensive_data']
            if comp_data.get('location_details'):
                loc = comp_data['location_details']
                if loc.get('latitude') and loc.get('longitude'):
                    coords = (loc['latitude'], loc['longitude'])
        
        if coords:
            lat, lng = coords
            # Validate coordinates are reasonable for Sri Lanka
            if 5.9 <= lat <= 9.9 and 79.6 <= lng <= 82.0:
                enhanced_location = enhance_location_with_admin_divisions(lat, lng)
                
                # Merge the enhanced admin data into the extracted data
                enhanced_loc = enhanced_location.get('enhanced_location', {})
                sri_admin = enhanced_location.get('sri_lanka_admin', {})
                
                # Add Sri Lankan administrative divisions
                extracted_data['comprehensive_data']['location_details'].update({
                    'district': enhanced_loc.get('district') or sri_admin.get('district'),
                    'ds_division': enhanced_loc.get('ds_division') or sri_admin.get('ds_division'),
                    'gn_division': enhanced_loc.get('gn_division') or sri_admin.get('gn_division'),
                    'province': enhanced_loc.get('province') or sri_admin.get('province')
                })
                
                logging.info(f"Enhanced coordinates ({lat}, {lng}) with admin divisions: "
                           f"{enhanced_loc.get('district')}, {enhanced_loc.get('ds_division')}")
        
        return extracted_data
        
    except Exception as e:
        logging.warning(f"Failed to enhance coordinates with admin divisions: {str(e)}")
        return extracted_data


def process_document_with_ai(ocr_text: str, document_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Main function to process a document with AI extraction including translation
    Falls back to rule-based extraction if AI services fail
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
        },
        "ai_available": bool(client),
        "quota_exceeded": False,
        "fallback_used": None
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
    
    # Check if AI services are available
    ai_extraction_failed = False
    quota_exceeded = False
    
    # Extract comprehensive data for all wizard steps (NEW ENHANCED VERSION)
    try:
        if client:  # Only try AI if client is available
            result["comprehensive_data"] = extract_comprehensive_property_data(processed_text)
            
            # Check for quota exceeded errors
            if result["comprehensive_data"].get("error") and "insufficient" in result["comprehensive_data"]["error"].lower():
                quota_exceeded = True
                ai_extraction_failed = True
                result["quota_exceeded"] = True
                logger.warning("OpenAI quota exceeded, falling back to rule-based extraction")
            else:
                # Enhance with Sri Lankan administrative divisions if coordinates are found
                result = enhance_coordinates_with_admin_divisions(result)
        else:
            ai_extraction_failed = True
            
    except Exception as e:
        error_msg = str(e).lower()
        if "insufficient" in error_msg or "quota" in error_msg or "exceeded" in error_msg:
            quota_exceeded = True
            result["quota_exceeded"] = True
            logger.warning("OpenAI quota exceeded, falling back to rule-based extraction")
        
        logger.warning(f"AI comprehensive extraction failed: {str(e)}")
        ai_extraction_failed = True
        result["comprehensive_data"] = {"error": f"Comprehensive extraction failed: {str(e)}"}
    
    # Extract specific data based on document type using processed (translated) text
    try:
        if client and not ai_extraction_failed:  # Try AI first if available
            if document_type == DocumentType.SURVEY_PLAN:
                result["extracted_data"] = extract_survey_plan_data(processed_text)
            elif document_type == DocumentType.DEED:
                result["extracted_data"] = extract_deed_data(processed_text)
            elif document_type == DocumentType.CERTIFICATE_OF_SALE:
                result["extracted_data"] = extract_certificate_of_sale_data(processed_text)
            else:
                # For other document types, try general extraction
                result["extracted_data"] = {"type": "other", "note": "Document type not specifically supported"}
        else:
            ai_extraction_failed = True
            
    except Exception as e:
        error_msg = str(e).lower()
        if "insufficient" in error_msg or "quota" in error_msg:
            quota_exceeded = True
            result["quota_exceeded"] = True
        
        logger.warning(f"AI specific extraction failed: {str(e)}")
        ai_extraction_failed = True
        result["extracted_data"] = {"error": f"Data extraction failed: {str(e)}"}
    
    # Always extract general property data using processed text
    try:
        if client and not ai_extraction_failed:
            result["general_data"] = extract_general_property_data(processed_text)
        else:
            ai_extraction_failed = True
    except Exception as e:
        error_msg = str(e).lower()
        if "insufficient" in error_msg or "quota" in error_msg:
            quota_exceeded = True
            result["quota_exceeded"] = True
            
        logger.warning(f"AI general extraction failed: {str(e)}")
        ai_extraction_failed = True
        result["general_data"] = {"error": f"General data extraction failed: {str(e)}"}
    
    # Extract detailed utilities data using processed text
    try:
        if client and not ai_extraction_failed:
            result["utilities_data"] = extract_utilities_data(processed_text)
        else:
            ai_extraction_failed = True
    except Exception as e:
        error_msg = str(e).lower()
        if "insufficient" in error_msg or "quota" in error_msg:
            quota_exceeded = True
            result["quota_exceeded"] = True
            
        logger.warning(f"AI utilities extraction failed: {str(e)}")
        ai_extraction_failed = True
        result["utilities_data"] = {"error": f"Utilities extraction failed: {str(e)}"}
    
    # FALLBACK: Use rule-based extraction if AI fails
    if ai_extraction_failed or not client:
        fallback_reason = "OpenAI quota exceeded" if quota_exceeded else "AI services unavailable"
        logger.info(f"Using rule-based extraction as fallback: {fallback_reason}")
        
        try:
            from app.services.rule_based_extraction import extract_with_rules
            
            rule_result = extract_with_rules(processed_text, document_type)
            
            # Merge rule-based results with existing results, preserving structure
            result["comprehensive_data"] = rule_result
            result["extracted_data"] = rule_result
            result["general_data"] = rule_result
            result["fallback_used"] = "rule_based"
            result["fallback_reason"] = fallback_reason
            
            logger.info("Rule-based extraction completed successfully")
            
        except Exception as e:
            logger.error(f"Rule-based extraction also failed: {str(e)}")
            result["fallback_error"] = str(e)
    
    return result