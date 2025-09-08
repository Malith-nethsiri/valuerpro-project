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
        
        logger.info("Fixing mathematical expressions in JSON content")
        
        # Enhanced patterns to catch various mathematical expressions (more comprehensive)
        patterns = [
            # Multiplication with decimal numbers - more specific patterns
            (r'(\d+\.\d+)\s*\*\s*(\d+\.\d+)', lambda m: self._calculate_multiplication(m)),  # decimal * decimal
            (r'(\d+)\s*\*\s*(\d+\.\d+)', lambda m: self._calculate_multiplication(m)),        # int * decimal  
            (r'(\d+\.\d+)\s*\*\s*(\d+)', lambda m: self._calculate_multiplication(m)),        # decimal * int
            (r'(\d+)\s*\*\s*(\d+)', lambda m: self._calculate_multiplication(m)),             # int * int
            # Division patterns
            (r'(\d+\.\d+)\s*/\s*(\d+\.\d+)', lambda m: self._calculate_division(m)),          # decimal / decimal
            (r'(\d+)\s*/\s*(\d+\.\d+)', lambda m: self._calculate_division(m)),               # int / decimal
            (r'(\d+\.\d+)\s*/\s*(\d+)', lambda m: self._calculate_division(m)),               # decimal / int
            (r'(\d+)\s*/\s*(\d+)', lambda m: self._calculate_division(m)),                    # int / int
            # Addition patterns
            (r'(\d+\.\d+)\s*\+\s*(\d+\.\d+)', lambda m: self._calculate_addition(m)),        # decimal + decimal
            (r'(\d+)\s*\+\s*(\d+\.\d+)', lambda m: self._calculate_addition(m)),             # int + decimal
            (r'(\d+\.\d+)\s*\+\s*(\d+)', lambda m: self._calculate_addition(m)),             # decimal + int
            (r'(\d+)\s*\+\s*(\d+)', lambda m: self._calculate_addition(m)),                  # int + int
            # Subtraction patterns  
            (r'(\d+\.\d+)\s*-\s*(\d+\.\d+)', lambda m: self._calculate_subtraction(m)),      # decimal - decimal
            (r'(\d+)\s*-\s*(\d+\.\d+)', lambda m: self._calculate_subtraction(m)),           # int - decimal
            (r'(\d+\.\d+)\s*-\s*(\d+)', lambda m: self._calculate_subtraction(m)),           # decimal - int
            (r'(\d+)\s*-\s*(\d+)', lambda m: self._calculate_subtraction(m)),                # int - int
        ]
        
        fixed_content = content
        expressions_fixed = 0
        
        # Apply each pattern
        for pattern, calculator in patterns:
            matches = re.findall(pattern, fixed_content)
            if matches:
                logger.info(f"Found {len(matches)} mathematical expressions with pattern: {pattern}")
                expressions_fixed += len(matches)
            
            fixed_content = re.sub(pattern, calculator, fixed_content)
        
        if expressions_fixed > 0:
            logger.info(f"Fixed {expressions_fixed} mathematical expressions in JSON")
        
        return fixed_content
    
    def _calculate_multiplication(self, match):
        """Calculate multiplication expression safely"""
        try:
            num1 = float(match.group(1))
            num2 = float(match.group(2))
            result = num1 * num2
            formatted_result = self._format_number(result)
            logger.info(f"Calculated: {num1} * {num2} = {formatted_result}")
            return formatted_result
        except Exception as e:
            logger.warning(f"Failed to calculate multiplication: {match.group(0)} - {e}")
            return match.group(0)  # Return original if calculation fails
    
    def _calculate_division(self, match):
        """Calculate division expression safely"""
        try:
            num1 = float(match.group(1))
            num2 = float(match.group(2))
            if num2 != 0:
                result = num1 / num2
                formatted_result = self._format_number(result)
                logger.info(f"Calculated: {num1} / {num2} = {formatted_result}")
                return formatted_result
            else:
                logger.warning(f"Division by zero avoided: {match.group(0)}")
                return "null"
        except Exception as e:
            logger.warning(f"Failed to calculate division: {match.group(0)} - {e}")
            return match.group(0)
    
    def _calculate_addition(self, match):
        """Calculate addition expression safely"""
        try:
            num1 = float(match.group(1))
            num2 = float(match.group(2))
            result = num1 + num2
            formatted_result = self._format_number(result)
            logger.info(f"Calculated: {num1} + {num2} = {formatted_result}")
            return formatted_result
        except Exception as e:
            logger.warning(f"Failed to calculate addition: {match.group(0)} - {e}")
            return match.group(0)
    
    def _calculate_subtraction(self, match):
        """Calculate subtraction expression safely"""
        try:
            num1 = float(match.group(1))
            num2 = float(match.group(2))
            result = num1 - num2
            formatted_result = self._format_number(result)
            logger.info(f"Calculated: {num1} - {num2} = {formatted_result}")
            return formatted_result
        except Exception as e:
            logger.warning(f"Failed to calculate subtraction: {match.group(0)} - {e}")
            return match.group(0)
    
    def _format_number(self, result: float) -> str:
        """Format number to avoid excessive decimal places"""
        if result.is_integer():
            return str(int(result))
        else:
            # Round to 4 decimal places and strip trailing zeros
            formatted = f"{result:.4f}".rstrip('0').rstrip('.')
            return formatted if formatted else "0"
    
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

CRITICAL JSON REQUIREMENTS: 
- Return ONLY valid JSON - no code blocks, no markdown, no explanations, no mathematical expressions
- Calculate ALL mathematical values before putting them in JSON (e.g. if extent is 0.0645 acres, convert to sqm as 261.02, NOT "0.0645 * 4046.86")
- NEVER include mathematical operators (* / + -) in JSON values
- Use only numbers, strings, null, booleans, arrays, objects - NO expressions or calculations in JSON
- All numeric values must be actual calculated numbers, not expressions
- If you need to convert units, do the calculation first and put only the final number
- Example: "extent_sqm": 261.02 (NOT "extent_sqm": "0.0645 * 4046.86")
- ALWAYS calculate: acres to sqm (multiply by 4046.86), perches to sqm (multiply by 25.293), perches to acres (divide by 160)

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
17. CRITICAL: Always return ONLY valid JSON without mathematical expressions

SYSTEM MESSAGE: Calculate all mathematical values before putting them in JSON. Never include expressions like "0.0645 * 4046.86" - instead calculate and return "261.02". This is essential for system compatibility.

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