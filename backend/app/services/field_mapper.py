"""
Intelligent field mapping service to auto-populate report wizard fields from AI analysis
"""
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.models import (
    Report, Property, Identification, Location, Access, Site, Buildings, 
    Utilities, Planning, Locality, ValuationLine, ValuationSummary,
    Disclaimer, Certificate, Client
)

logger = logging.getLogger(__name__)


class FieldMappingService:
    """Service to map AI-extracted data to database fields"""
    
    def __init__(self):
        # Field mapping configurations for different document types
        self.field_mappings = {
            "identification": {
                "lot_number": ["lot_number", "lot_no", "lot"],
                "plan_number": ["plan_number", "plan_no", "plan"],
                "plan_date": ["plan_date", "date"],
                "surveyor_name": ["surveyor_name", "surveyor", "licensed_surveyor"],
                "land_name": ["land_name", "property_name"],
                "extent": ["extent", "area", "land_extent"],
                "boundaries": ["boundaries"],
                "title_owner": ["title_owner", "owner", "owner_name"],
                "deed_no": ["deed_no", "deed_number"],
                "deed_date": ["deed_date"],
                "notary": ["notary", "notary_attorney"]
            },
            "location": {
                "address_full": ["property_address", "address", "location"],
                "village": ["village"],
                "gn_division": ["grama_niladhari_division", "gn_division", "gn"],
                "ds_division": ["ds_division", "divisional_secretariat"],
                "district": ["district"],
                "province": ["province"],
                "lat": ["latitude", "lat"],
                "lng": ["longitude", "lng", "long"]
            },
            "site": {
                "shape": ["shape", "land_shape"],
                "topography": ["topography", "terrain"],
                "level_vs_road": ["level_vs_road", "ground_level"],
                "soil": ["soil", "soil_type"],
                "water_table_depth_ft": ["water_table_depth_ft", "water_table"],
                "frontage_ft": ["frontage_ft", "frontage"],
                "features": ["features", "additional_features"],
                "flood_risk": ["flood_risk"]
            },
            "buildings": {
                "type": ["type", "building_type"],
                "storeys": ["storeys", "floors"],
                "structure": ["structure", "construction_type"],
                "roof_type": ["roof_type"],
                "roof_structure": ["roof_structure"],
                "walls": ["walls", "wall_material"],
                "floors": ["floors", "floor_material"],
                "doors": ["doors", "door_material"],
                "windows": ["windows", "window_material"],
                "layout_text": ["layout_text", "layout", "description"],
                "area_sqft": ["area_sqft", "floor_area", "area"],
                "area_sqm": ["area_sqm"],
                "age_years": ["age_years", "construction_year", "age"],
                "condition": ["condition"],
                "occupancy": ["occupancy"]
            },
            "utilities": {
                "electricity": ["electricity"],
                "water": ["water"],
                "telecom": ["telecom", "telephone"],
                "sewerage": ["sewerage"],
                "drainage": ["drainage"],
                "other": ["other"]
            }
        }
    
    def extract_field_value(self, data: Dict[str, Any], field_names: List[str]) -> Any:
        """Extract value from data using multiple possible field names"""
        for field_name in field_names:
            # Try direct key access
            if field_name in data:
                value = data[field_name]
                if value is not None and str(value).strip() not in ['', 'None', 'null', 'N/A']:
                    return value
            
            # Try case-insensitive search
            for key, value in data.items():
                if key.lower() == field_name.lower():
                    if value is not None and str(value).strip() not in ['', 'None', 'null', 'N/A']:
                        return value
        
        return None
    
    def convert_extent_to_perches(self, extent_str: str) -> float:
        """Convert various extent formats to perches"""
        if not extent_str:
            return 0.0
        
        try:
            # Handle numeric values with units
            extent_lower = str(extent_str).lower()
            
            # Extract numeric value
            import re
            numbers = re.findall(r'[\d.]+', extent_str)
            if not numbers:
                return 0.0
            
            value = float(numbers[0])
            
            # Convert based on unit
            if 'acre' in extent_lower:
                return value * 160  # 160 perches per acre
            elif 'rood' in extent_lower:
                return value * 40   # 40 perches per rood
            elif 'perch' in extent_lower or 'p' in extent_lower:
                return value
            elif 'sqm' in extent_lower or 'm2' in extent_lower or 'square m' in extent_lower:
                return value / 253  # Approximately 253 sqm per perch
            elif 'hectare' in extent_lower or 'ha' in extent_lower:
                return value * 395  # Approximately 395 perches per hectare
            else:
                # Assume perches if no unit specified
                return value
        except (ValueError, TypeError):
            return 0.0
    
    def format_boundaries(self, boundaries_data: Any) -> Dict[str, str]:
        """Format boundaries data into standard structure"""
        if isinstance(boundaries_data, dict):
            return {
                "north": str(boundaries_data.get("north", "")),
                "east": str(boundaries_data.get("east", "")),
                "south": str(boundaries_data.get("south", "")),
                "west": str(boundaries_data.get("west", ""))
            }
        elif isinstance(boundaries_data, str):
            # Try to parse from text
            boundaries = {"north": "", "east": "", "south": "", "west": ""}
            text = boundaries_data.lower()
            
            # Simple parsing for common patterns
            if "north:" in text or "north -" in text:
                import re
                match = re.search(r'north[:\-\s]+([^,;]+)', text, re.IGNORECASE)
                if match:
                    boundaries["north"] = match.group(1).strip()
            
            # Similar for other directions
            for direction in ["east", "south", "west"]:
                if f"{direction}:" in text or f"{direction} -" in text:
                    match = re.search(f'{direction}[:\-\s]+([^,;]+)', text, re.IGNORECASE)
                    if match:
                        boundaries[direction] = match.group(1).strip()
            
            return boundaries
        
        return {"north": "", "east": "", "south": "", "west": ""}


def auto_populate_report_from_analysis(
    report_id: str, 
    analysis_results: List[Dict[str, Any]], 
    db: Session
) -> Dict[str, Any]:
    """
    Auto-populate report fields from AI analysis results
    """
    mapper = FieldMappingService()
    population_log = {
        "status": "completed",
        "populated_fields": [],
        "skipped_fields": [],
        "errors": [],
        "summary": {}
    }
    
    try:
        # Get the report
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            population_log["status"] = "failed"
            population_log["errors"].append("Report not found")
            return population_log
        
        # Consolidate all extracted data
        consolidated_data = {}
        for result in analysis_results:
            analysis = result.get("analysis", {})
            extracted_data = analysis.get("extracted_data", {})
            general_data = analysis.get("general_data", {})
            
            # Merge all data
            all_data = {**extracted_data, **general_data}
            for key, value in all_data.items():
                if value and not isinstance(value, dict) or (isinstance(value, dict) and not value.get("error")):
                    consolidated_data[key] = value
        
        # Get or create the first property for this report
        property_record = db.query(Property).filter(Property.report_id == report_id).first()
        if not property_record:
            property_record = Property(
                report_id=report_id,
                property_index=1,
                property_type="land_and_building"
            )
            db.add(property_record)
            db.commit()
            db.refresh(property_record)
        
        # Populate Identification data
        identification = db.query(Identification).filter(
            Identification.property_id == property_record.id
        ).first()
        
        if not identification:
            identification = Identification(property_id=property_record.id)
            db.add(identification)
        
        # Map identification fields
        id_mappings = mapper.field_mappings["identification"]
        for db_field, source_fields in id_mappings.items():
            value = mapper.extract_field_value(consolidated_data, source_fields)
            if value:
                if db_field == "extent":
                    # Handle extent conversion
                    extent_perches = mapper.convert_extent_to_perches(str(value))
                    if extent_perches > 0:
                        identification.extent_perches = extent_perches
                        identification.extent_sqm = extent_perches * 253  # Convert to sqm
                        identification.extent_local = str(value)  # Keep original format
                        population_log["populated_fields"].append(f"identification.extent: {value}")
                elif db_field == "boundaries":
                    boundaries_dict = mapper.format_boundaries(value)
                    identification.boundaries = boundaries_dict
                    population_log["populated_fields"].append("identification.boundaries")
                elif db_field == "plan_date" or db_field == "deed_date":
                    # Handle date conversion
                    try:
                        if isinstance(value, str):
                            # Try to parse date
                            from datetime import datetime
                            date_obj = datetime.strptime(value, '%Y-%m-%d')
                            setattr(identification, db_field, date_obj)
                            population_log["populated_fields"].append(f"identification.{db_field}: {value}")
                    except (ValueError, TypeError):
                        population_log["skipped_fields"].append(f"identification.{db_field}: Invalid date format")
                else:
                    setattr(identification, db_field, str(value))
                    population_log["populated_fields"].append(f"identification.{db_field}: {value}")
        
        # Populate Location data
        location = db.query(Location).filter(Location.property_id == property_record.id).first()
        if not location:
            location = Location(property_id=property_record.id)
            db.add(location)
        
        loc_mappings = mapper.field_mappings["location"]
        for db_field, source_fields in loc_mappings.items():
            value = mapper.extract_field_value(consolidated_data, source_fields)
            if value:
                if db_field in ["lat", "lng"]:
                    # Handle coordinate conversion
                    try:
                        coord_value = float(value)
                        setattr(location, db_field, coord_value)
                        population_log["populated_fields"].append(f"location.{db_field}: {value}")
                    except (ValueError, TypeError):
                        population_log["skipped_fields"].append(f"location.{db_field}: Invalid coordinate")
                else:
                    setattr(location, db_field, str(value))
                    population_log["populated_fields"].append(f"location.{db_field}: {value}")
        
        # Populate Site data
        site = db.query(Site).filter(Site.property_id == property_record.id).first()
        if not site:
            site = Site(property_id=property_record.id)
            db.add(site)
        
        site_mappings = mapper.field_mappings["site"]
        for db_field, source_fields in site_mappings.items():
            value = mapper.extract_field_value(consolidated_data, source_fields)
            if value:
                if db_field == "features":
                    # Handle array fields
                    if isinstance(value, list):
                        site.features = value
                    else:
                        site.features = [str(value)]
                    population_log["populated_fields"].append(f"site.features: {value}")
                elif db_field in ["water_table_depth_ft", "frontage_ft"]:
                    # Handle numeric fields
                    try:
                        numeric_value = float(value)
                        setattr(site, db_field, numeric_value)
                        population_log["populated_fields"].append(f"site.{db_field}: {value}")
                    except (ValueError, TypeError):
                        population_log["skipped_fields"].append(f"site.{db_field}: Invalid numeric value")
                else:
                    setattr(site, db_field, str(value))
                    population_log["populated_fields"].append(f"site.{db_field}: {value}")
        
        # Populate Building data (if building information is present)
        building_data = consolidated_data.get("building_details", {})
        if building_data and isinstance(building_data, dict):
            # Check if building already exists
            building = db.query(Buildings).filter(Buildings.property_id == property_record.id).first()
            if not building:
                building = Buildings(
                    property_id=property_record.id,
                    building_index=1
                )
                db.add(building)
            
            building_mappings = mapper.field_mappings["buildings"]
            for db_field, source_fields in building_mappings.items():
                value = mapper.extract_field_value(building_data, source_fields)
                if value:
                    if db_field in ["area_sqft", "area_sqm"]:
                        # Handle area conversion
                        try:
                            area_value = float(value)
                            if db_field == "area_sqft":
                                building.area_sqft = area_value
                                building.area_sqm = area_value / 10.764  # Convert to sqm
                            else:
                                building.area_sqm = area_value
                                building.area_sqft = area_value * 10.764  # Convert to sqft
                            population_log["populated_fields"].append(f"building.{db_field}: {value}")
                        except (ValueError, TypeError):
                            population_log["skipped_fields"].append(f"building.{db_field}: Invalid area value")
                    elif db_field in ["storeys", "age_years"]:
                        # Handle integer fields
                        try:
                            int_value = int(float(value))
                            setattr(building, db_field, int_value)
                            population_log["populated_fields"].append(f"building.{db_field}: {value}")
                        except (ValueError, TypeError):
                            population_log["skipped_fields"].append(f"building.{db_field}: Invalid integer value")
                    else:
                        setattr(building, db_field, str(value))
                        population_log["populated_fields"].append(f"building.{db_field}: {value}")
        
        # Populate Utilities data
        utilities = db.query(Utilities).filter(Utilities.property_id == property_record.id).first()
        if not utilities:
            utilities = Utilities(property_id=property_record.id)
            db.add(utilities)
        
        utilities_data = consolidated_data.get("utilities", {})
        if utilities_data:
            util_mappings = mapper.field_mappings["utilities"]
            for db_field, source_fields in util_mappings.items():
                value = mapper.extract_field_value(utilities_data, source_fields)
                if value is not None:
                    if db_field in ["electricity", "water", "telecom"]:
                        # Handle boolean fields
                        bool_value = str(value).lower() in ['true', 'yes', '1', 'available', 'connected']
                        setattr(utilities, db_field, bool_value)
                        population_log["populated_fields"].append(f"utilities.{db_field}: {bool_value}")
                    else:
                        setattr(utilities, db_field, str(value))
                        population_log["populated_fields"].append(f"utilities.{db_field}: {value}")
        
        # Commit all changes
        db.commit()
        
        # Generate summary
        population_log["summary"] = {
            "total_fields_populated": len(population_log["populated_fields"]),
            "total_fields_skipped": len(population_log["skipped_fields"]),
            "total_errors": len(population_log["errors"]),
            "property_id": str(property_record.id)
        }
        
        logger.info(f"Auto-populated {len(population_log['populated_fields'])} fields for report {report_id}")
        
    except Exception as e:
        population_log["status"] = "failed"
        population_log["errors"].append(str(e))
        logger.error(f"Auto-population failed for report {report_id}: {str(e)}")
        db.rollback()
    
    return population_log


def get_field_mapping_suggestions(analysis_data: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Get suggestions for field mappings based on analysis data
    """
    mapper = FieldMappingService()
    suggestions = {}
    
    # Analyze extracted data for potential field matches
    for section, field_mappings in mapper.field_mappings.items():
        section_suggestions = []
        
        for db_field, source_fields in field_mappings.items():
            value = mapper.extract_field_value(analysis_data, source_fields)
            if value:
                section_suggestions.append({
                    "db_field": db_field,
                    "suggested_value": value,
                    "confidence": 0.8 if any(sf in analysis_data for sf in source_fields) else 0.6
                })
        
        if section_suggestions:
            suggestions[section] = section_suggestions
    
    return suggestions