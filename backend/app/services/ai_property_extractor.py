"""
Clean AI Property Data Extractor Service
Simple OpenAI integration for Sri Lankan property document analysis
"""
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIPropertyExtractor:
    """Simple AI service for extracting property data from OCR text"""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not configured - AI features will be disabled")
            self.client = None
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("AI Property Extractor initialized successfully")
    
    def is_available(self) -> bool:
        """Check if AI service is available"""
        return self.client is not None
    
    def extract_property_data(self, ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured property data from OCR text
        Returns data in format expected by frontend
        """
        if not self.is_available():
            logger.warning("AI service not available - returning empty analysis")
            return {"error": "AI service not configured"}
        
        try:
            logger.info(f"Extracting property data from {len(ocr_text)} characters of text")
            
            # Create property-specific prompt for Sri Lankan documents
            prompt = self._create_property_extraction_prompt(ocr_text)
            
            # Call OpenAI
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting property information from Sri Lankan land documents. CRITICAL: Always return ONLY valid JSON without code blocks, mathematical expressions, or calculations. Calculate all values before putting them in JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=settings.OPENAI_MAX_TOKENS or 2000,
                temperature=settings.OPENAI_TEMPERATURE or 0.1
            )
            
            # Parse response
            content = response.choices[0].message.content
            logger.info(f"AI response received: {len(content)} characters")
            
            # Clean and parse JSON response
            try:
                # Remove markdown code blocks if present
                cleaned_content = content.strip()
                if cleaned_content.startswith('```json'):
                    cleaned_content = cleaned_content[7:]  # Remove ```json
                if cleaned_content.startswith('```'):
                    cleaned_content = cleaned_content[3:]  # Remove ``` (without json)
                if cleaned_content.endswith('```'):
                    cleaned_content = cleaned_content[:-3]  # Remove ```
                cleaned_content = cleaned_content.strip()
                
                # Fix common mathematical expressions in JSON that cause parsing errors
                cleaned_content = self._fix_json_mathematical_expressions(cleaned_content)
                
                extracted_data = json.loads(cleaned_content)
                logger.info("Successfully parsed AI response as JSON")
                return extracted_data
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                logger.error(f"Raw response: {content}")
                logger.error(f"Cleaned content: {cleaned_content}")
                
                # Try to fix common JSON issues and retry
                try:
                    fixed_content = self._attempt_json_repair(cleaned_content)
                    if fixed_content != cleaned_content:
                        logger.info("Attempting to repair JSON and retry parsing")
                        extracted_data = json.loads(fixed_content)
                        logger.info("Successfully parsed repaired JSON")
                        return extracted_data
                except Exception as repair_e:
                    logger.error(f"JSON repair attempt also failed: {repair_e}")
                
                return {"error": "Failed to parse AI response", "raw_response": content}
                
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return {"error": f"AI extraction failed: {str(e)}"}
    
    def _fix_json_mathematical_expressions(self, content: str) -> str:
        """Fix common mathematical expressions that appear in JSON responses"""
        import re
        
        # Pattern to find mathematical expressions like "0.0645 * 4046.86"
        math_pattern = r'(\d+\.?\d*)\s*\*\s*(\d+\.?\d*)'
        
        def calculate_expression(match):
            try:
                num1 = float(match.group(1))
                num2 = float(match.group(2))
                result = num1 * num2
                # Format to avoid excessive decimal places
                if result.is_integer():
                    return str(int(result))
                else:
                    return f"{result:.4f}".rstrip('0').rstrip('.')
            except:
                return match.group(0)  # Return original if calculation fails
        
        # Replace mathematical expressions with calculated values
        fixed_content = re.sub(math_pattern, calculate_expression, content)
        
        # Also handle division operations
        div_pattern = r'(\d+\.?\d*)\s*/\s*(\d+\.?\d*)'
        def calculate_division(match):
            try:
                num1 = float(match.group(1))
                num2 = float(match.group(2))
                if num2 != 0:
                    result = num1 / num2
                    if result.is_integer():
                        return str(int(result))
                    else:
                        return f"{result:.4f}".rstrip('0').rstrip('.')
                else:
                    return "null"
            except:
                return match.group(0)
        
        fixed_content = re.sub(div_pattern, calculate_division, fixed_content)
        
        return fixed_content
    
    def _attempt_json_repair(self, content: str) -> str:
        """Attempt to repair common JSON formatting issues"""
        import re
        
        # Remove any trailing commas before closing braces/brackets
        content = re.sub(r',(\s*[}\]])', r'\1', content)
        
        # Fix unquoted property names (basic cases)
        content = re.sub(r'(\w+):', r'"\1":', content)
        
        # Fix single quotes to double quotes
        content = re.sub(r"'([^']*)'", r'"\1"', content)
        
        # Remove any non-printable characters that might cause issues
        content = ''.join(char for char in content if ord(char) >= 32 or char in '\n\r\t')
        
        return content
    
    def _create_property_extraction_prompt(self, ocr_text: str) -> str:
        """Create a comprehensive prompt for cross-step property data extraction"""
        
        return f"""
Analyze this Sri Lankan property document text and extract ALL available information for a property valuation report.
Look for data that could populate ANY section of a comprehensive valuation report.
Return ONLY valid JSON with the exact structure shown below.

CRITICAL: 
- Return ONLY valid JSON - no code blocks, no explanations, no mathematical expressions
- Calculate all mathematical values (e.g. if extent is 0.0645 acres, convert to sqm as 261.02, not "0.0645 * 4046.86")
- Use only numbers, strings, null, booleans, arrays, objects - NO expressions or calculations in JSON
- All numeric values must be actual numbers, not expressions

Document Text:
{ocr_text}

Required JSON Structure - Extract ALL data found (use null if not found):
{{
    "comprehensive_data": {{
        "report_information": {{
            "purpose": "string or null",
            "inspection_date": "string or null",
            "report_date": "string or null",
            "report_type": "string or null",
            "basis_of_value": "string or null"
        }},
        "property_identification": {{
            "lot_number": "string or null",
            "plan_number": "string or null", 
            "surveyor_name": "string or null",
            "land_name": "string or null",
            "extent_perches": "number or null",
            "extent_sqm": "number or null",
            "extent_acres": "number or null",
            "plan_date": "string or null",
            "surveyor_license": "string or null",
            "boundaries": {{
                "north": "string or null",
                "south": "string or null", 
                "east": "string or null",
                "west": "string or null"
            }}
        }},
        "location_details": {{
            "address": "string or null",
            "street": "string or null",
            "city": "string or null",
            "district": "string or null",
            "province": "string or null",
            "postal_code": "string or null",
            "latitude": "number or null",
            "longitude": "number or null",
            "accessibility": "string or null",
            "distance_to_main_road": "string or null"
        }},
        "site_characteristics": {{
            "topography": "string or null",
            "soil_type": "string or null",
            "drainage": "string or null",
            "gradient": "string or null",
            "site_shape": "string or null",
            "frontage": "number or null",
            "depth": "number or null"
        }},
        "buildings_improvements": [
            {{
                "building_type": "string or null",
                "primary_use": "string or null",
                "floor_area": "number or null",
                "construction_year": "number or null",
                "construction_type": "string or null",
                "roof_type": "string or null",
                "wall_type": "string or null",
                "floor_type": "string or null",
                "condition": "string or null",
                "stories": "number or null",
                "rooms": "number or null",
                "special_features": "string or null",
                "renovation_required": "boolean or null",
                "estimated_replacement_cost": "number or null"
            }}
        ],
        "utilities_assessment": {{
            "water_supply": "string or null",
            "electricity": "string or null",
            "drainage_system": "string or null",
            "telecommunications": "string or null",
            "gas_supply": "string or null",
            "waste_management": "string or null"
        }},
        "locality_analysis": {{
            "neighborhood_type": "string or null",
            "amenities": [],
            "market_activity": "string or null",
            "development_trend": "string or null",
            "commercial_facilities": [],
            "educational_facilities": [],
            "healthcare_facilities": []
        }},
        "planning_zoning": {{
            "zoning": "string or null",
            "development_rights": "string or null",
            "building_restrictions": "string or null",
            "future_development": "string or null",
            "permits_required": [],
            "planning_constraints": []
        }},
        "transport_access": {{
            "road_access": "string or null",
            "road_type": "string or null",
            "public_transport": "string or null",
            "distance_to_highways": "string or null",
            "parking_availability": "string or null",
            "traffic_conditions": "string or null"
        }},
        "environmental_factors": {{
            "environmental_hazards": [],
            "climate_factors": "string or null",
            "noise_levels": "string or null",
            "air_quality": "string or null",
            "natural_features": [],
            "environmental_restrictions": []
        }},
        "market_analysis": {{
            "market_trends": "string or null",
            "price_analysis": "string or null",
            "demand_level": "string or null",
            "supply_conditions": "string or null",
            "market_influences": [],
            "comparable_sales": [
                {{
                    "address": "string or null",
                    "sale_price": "number or null",
                    "sale_date": "string or null",
                    "property_size": "number or null",
                    "price_per_unit": "number or null",
                    "adjustments": {{
                        "location": "number or null",
                        "time": "number or null",
                        "size": "number or null", 
                        "condition": "number or null",
                        "other": "number or null",
                        "total": "number or null"
                    }}
                }}
            ]
        }},
        "legal_information": {{
            "deed_references": [],
            "legal_description": "string or null",
            "ownership_type": "string or null",
            "encumbrances": [],
            "easements": [],
            "covenants": [],
            "legal_issues": []
        }}
    }},
    "confidence": "high|medium|low",
    "data_sources": []
}}

Extraction Instructions:
1. EXTRACT EVERYTHING POSSIBLE - Don't limit to just property identification
2. Property Identification: Lot numbers, plan numbers, surveyor details, boundaries, extents
3. Location: Any address components, coordinates, accessibility notes
4. Site: Topography, soil, drainage, site dimensions mentioned
5. Buildings: Any building details, ages, types, conditions, room counts
6. Utilities: Water, electricity, drainage, telecom connections mentioned
7. Locality: Neighborhood descriptions, nearby facilities, amenities
8. Planning: Zoning, building restrictions, development rights
9. Transport: Road access, public transport, highways nearby
10. Environmental: Hazards, climate, noise, natural features
11. Market: Any comparable sales, market conditions, price trends
12. Legal: Deeds, ownership, encumbrances, easements, legal issues
13. Use exact values from text - don't invent information
14. For arrays, include all relevant items found
15. Use null for fields not found in the document
16. Return confidence based on data quality and completeness

JSON Response:
"""

# Global service instance
_ai_extractor = None

def get_ai_extractor() -> AIPropertyExtractor:
    """Get singleton AI extractor instance"""
    global _ai_extractor
    if _ai_extractor is None:
        _ai_extractor = AIPropertyExtractor()
    return _ai_extractor