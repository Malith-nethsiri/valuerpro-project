"""
Expert-level data validation and sanitization utilities
Ensures data integrity and accuracy across the entire system
"""

import re
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class ValidationLevel(Enum):
    STRICT = "strict"
    MODERATE = "moderate" 
    LENIENT = "lenient"

class DataValidator:
    """Comprehensive data validation and sanitization"""
    
    # Sri Lankan specific patterns
    PATTERNS = {
        'lot_number': r'^[A-Z]*\s*\d+[A-Z]*$',
        'plan_number': r'^[A-Z]*\s*\d+[-/]*[A-Z]*\d*$',
        'postal_code': r'^\d{5}$',
        'coordinates': {
            'latitude': (5.916, 9.834),   # Sri Lanka bounds
            'longitude': (79.642, 81.881)
        },
        'phone': r'^(\+94|0)(7\d{8}|[1-9]\d{8})$',
        'extent_local': r'^\d+[ARP]-\d+[ARP]-\d+\.?\d*[P]?$'
    }
    
    # Sri Lankan administrative divisions
    VALID_DISTRICTS = [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Moneragala', 'Ratnapura', 'Kegalle'
    ]
    
    VALID_PROVINCES = [
        'Western', 'Central', 'Southern', 'Northern', 'Eastern',
        'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
    ]

    @staticmethod
    def validate_comprehensive_data(data: Dict[str, Any], level: ValidationLevel = ValidationLevel.MODERATE) -> Tuple[Dict[str, Any], List[str]]:
        """
        Validate and sanitize comprehensive AI extracted data
        Returns: (cleaned_data, validation_errors)
        """
        cleaned_data = {}
        errors = []
        
        try:
            # Validate each section
            if 'identification' in data:
                cleaned_data['identification'], id_errors = DataValidator._validate_identification(
                    data['identification'], level
                )
                errors.extend([f"Identification: {err}" for err in id_errors])
            
            if 'location' in data:
                cleaned_data['location'], loc_errors = DataValidator._validate_location(
                    data['location'], level
                )
                errors.extend([f"Location: {err}" for err in loc_errors])
            
            if 'site' in data:
                cleaned_data['site'], site_errors = DataValidator._validate_site(
                    data['site'], level
                )
                errors.extend([f"Site: {err}" for err in site_errors])
            
            if 'buildings' in data:
                cleaned_data['buildings'], bldg_errors = DataValidator._validate_buildings(
                    data['buildings'], level
                )
                errors.extend([f"Buildings: {err}" for err in bldg_errors])
            
            if 'utilities' in data:
                cleaned_data['utilities'], util_errors = DataValidator._validate_utilities(
                    data['utilities'], level
                )
                errors.extend([f"Utilities: {err}" for err in util_errors])
            
            # Log validation summary
            logger.info(f"Data validation completed: {len(errors)} issues found")
            if errors:
                logger.warning(f"Validation errors: {errors}")
                
        except Exception as e:
            logger.error(f"Validation process failed: {str(e)}")
            errors.append(f"Validation system error: {str(e)}")
        
        return cleaned_data, errors
    
    @staticmethod
    def _validate_identification(data: Dict[str, Any], level: ValidationLevel) -> Tuple[Dict[str, Any], List[str]]:
        """Validate identification data"""
        cleaned = {}
        errors = []
        
        # Lot number validation
        if 'lot_number' in data and data['lot_number']:
            lot_num = str(data['lot_number']).strip().upper()
            if re.match(DataValidator.PATTERNS['lot_number'], lot_num):
                cleaned['lot_number'] = lot_num
            elif level == ValidationLevel.STRICT:
                errors.append(f"Invalid lot number format: {lot_num}")
            else:
                cleaned['lot_number'] = lot_num  # Accept with warning
                logger.warning(f"Unusual lot number format: {lot_num}")
        
        # Plan number validation
        if 'plan_number' in data and data['plan_number']:
            plan_num = str(data['plan_number']).strip()
            if re.match(DataValidator.PATTERNS['plan_number'], plan_num):
                cleaned['plan_number'] = plan_num
            elif level == ValidationLevel.STRICT:
                errors.append(f"Invalid plan number format: {plan_num}")
            else:
                cleaned['plan_number'] = plan_num
        
        # Date validation
        if 'plan_date' in data and data['plan_date']:
            try:
                if isinstance(data['plan_date'], str):
                    # Try common date formats
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                        try:
                            date_obj = datetime.strptime(data['plan_date'], fmt)
                            if 1900 <= date_obj.year <= datetime.now().year:
                                cleaned['plan_date'] = date_obj.strftime('%Y-%m-%d')
                                break
                        except ValueError:
                            continue
                    else:
                        if level == ValidationLevel.STRICT:
                            errors.append(f"Invalid date format: {data['plan_date']}")
            except Exception as e:
                errors.append(f"Date validation error: {str(e)}")
        
        # Copy other validated fields
        for field in ['surveyor_name', 'licensed_surveyor_number', 'land_name', 
                     'title_owner', 'deed_no', 'notary', 'interest']:
            if field in data and data[field]:
                cleaned[field] = str(data[field]).strip()
        
        # Validate numeric extents
        for field in ['extent_perches', 'extent_sqm']:
            if field in data and data[field]:
                try:
                    value = float(data[field])
                    if 0 < value < 1000000:  # Reasonable bounds
                        cleaned[field] = value
                    elif level == ValidationLevel.STRICT:
                        errors.append(f"Extent value out of range: {value}")
                except (ValueError, TypeError):
                    if level == ValidationLevel.STRICT:
                        errors.append(f"Invalid extent value: {data[field]}")
        
        return cleaned, errors
    
    @staticmethod
    def _validate_location(data: Dict[str, Any], level: ValidationLevel) -> Tuple[Dict[str, Any], List[str]]:
        """Validate location data"""
        cleaned = {}
        errors = []
        
        # Address validation
        if 'address' in data and isinstance(data['address'], dict):
            cleaned['address'] = {}
            for field in ['house_number', 'street', 'city', 'postal_code']:
                if field in data['address'] and data['address'][field]:
                    if field == 'postal_code':
                        postal = str(data['address'][field]).strip()
                        if re.match(DataValidator.PATTERNS['postal_code'], postal):
                            cleaned['address'][field] = postal
                        elif level != ValidationLevel.STRICT:
                            cleaned['address'][field] = postal  # Accept with warning
                    else:
                        cleaned['address'][field] = str(data['address'][field]).strip()
        
        # Administrative divisions validation
        if 'district' in data and data['district']:
            district = str(data['district']).strip()
            if district in DataValidator.VALID_DISTRICTS:
                cleaned['district'] = district
            elif level == ValidationLevel.STRICT:
                errors.append(f"Invalid district: {district}")
            else:
                # Try to match partially
                matches = [d for d in DataValidator.VALID_DISTRICTS if district.lower() in d.lower()]
                if matches:
                    cleaned['district'] = matches[0]
                    logger.info(f"District auto-corrected: {district} -> {matches[0]}")
                else:
                    cleaned['district'] = district
        
        if 'province' in data and data['province']:
            province = str(data['province']).strip()
            if province in DataValidator.VALID_PROVINCES:
                cleaned['province'] = province
            elif level != ValidationLevel.STRICT:
                # Try partial matching
                matches = [p for p in DataValidator.VALID_PROVINCES if province.lower() in p.lower()]
                if matches:
                    cleaned['province'] = matches[0]
                else:
                    cleaned['province'] = province
        
        # Coordinates validation
        if 'latitude' in data and 'longitude' in data:
            try:
                lat = float(data['latitude'])
                lng = float(data['longitude'])
                lat_bounds = DataValidator.PATTERNS['coordinates']['latitude']
                lng_bounds = DataValidator.PATTERNS['coordinates']['longitude']
                
                if lat_bounds[0] <= lat <= lat_bounds[1] and lng_bounds[0] <= lng <= lng_bounds[1]:
                    cleaned['latitude'] = lat
                    cleaned['longitude'] = lng
                elif level == ValidationLevel.STRICT:
                    errors.append(f"Coordinates outside Sri Lanka: {lat}, {lng}")
                else:
                    cleaned['latitude'] = lat
                    cleaned['longitude'] = lng
                    logger.warning(f"Coordinates outside typical Sri Lanka bounds: {lat}, {lng}")
            except (ValueError, TypeError):
                if level == ValidationLevel.STRICT:
                    errors.append(f"Invalid coordinates: {data.get('latitude')}, {data.get('longitude')}")
        
        # Copy other location fields
        for field in ['gn_division', 'ds_division', 'road_access', 'directions', 
                     'nearest_landmark', 'public_transport', 'nearest_railway_station']:
            if field in data and data[field]:
                cleaned[field] = str(data[field]).strip()
        
        # Numeric distance fields
        for field in ['road_width', 'distance_to_town', 'distance_to_colombo']:
            if field in data and data[field]:
                try:
                    value = float(data[field])
                    if 0 <= value <= 1000:  # Reasonable distance bounds
                        cleaned[field] = value
                except (ValueError, TypeError):
                    if level == ValidationLevel.STRICT:
                        errors.append(f"Invalid {field}: {data[field]}")
        
        return cleaned, errors
    
    @staticmethod
    def _validate_site(data: Dict[str, Any], level: ValidationLevel) -> Tuple[Dict[str, Any], List[str]]:
        """Validate site data"""
        cleaned = {}
        errors = []
        
        # Numeric validations
        numeric_fields = {
            'frontage': (0, 1000),
            'depth': (0, 1000),
            'gradient': (0, 100),
            'elevation_difference': (-50, 50)
        }
        
        for field, (min_val, max_val) in numeric_fields.items():
            if field in data and data[field]:
                try:
                    value = float(data[field])
                    if min_val <= value <= max_val:
                        cleaned[field] = value
                    elif level != ValidationLevel.STRICT:
                        cleaned[field] = value  # Accept with warning
                        logger.warning(f"{field} value unusual: {value}")
                except (ValueError, TypeError):
                    if level == ValidationLevel.STRICT:
                        errors.append(f"Invalid {field}: {data[field]}")
        
        # Enum-like validations
        valid_values = {
            'shape': ['Regular rectangular', 'Irregular rectangular', 'Square', 'Triangular', 'L-shaped', 'Circular', 'Irregular'],
            'topography': ['Level', 'Gently sloping', 'Moderately sloping', 'Steeply sloping', 'Undulating', 'Terraced'],
            'soil_type': ['Clay', 'Sandy clay', 'Clay loam', 'Loam', 'Sandy loam', 'Sand', 'Rock/Rocky', 'Fill/Made ground', 'Marshy/Swampy'],
            'drainage': ['Excellent', 'Good', 'Fair', 'Poor', 'Very poor'],
            'flood_risk': ['None', 'Low', 'Moderate', 'High', 'Severe']
        }
        
        for field, valid_list in valid_values.items():
            if field in data and data[field]:
                value = str(data[field]).strip()
                if value in valid_list:
                    cleaned[field] = value
                elif level != ValidationLevel.STRICT:
                    # Try fuzzy matching
                    matches = [v for v in valid_list if value.lower() in v.lower() or v.lower() in value.lower()]
                    if matches:
                        cleaned[field] = matches[0]
                        logger.info(f"{field} auto-corrected: {value} -> {matches[0]}")
                    else:
                        cleaned[field] = value
        
        # Copy text fields
        for field in ['aspect', 'level_relative_to_road', 'bearing_capacity', 'soil_notes',
                     'other_features', 'noise_level', 'air_quality', 'environmental_issues',
                     'pedestrian_access', 'vehicle_access', 'access_notes']:
            if field in data and data[field]:
                cleaned[field] = str(data[field]).strip()
        
        # Site features array
        if 'site_features' in data and isinstance(data['site_features'], list):
            cleaned['site_features'] = [str(f).strip() for f in data['site_features'] if f]
        
        return cleaned, errors
    
    @staticmethod
    def _validate_buildings(data: List[Dict[str, Any]], level: ValidationLevel) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Validate buildings data"""
        if not isinstance(data, list):
            return [], ["Buildings data must be a list"]
        
        cleaned = []
        errors = []
        
        for i, building in enumerate(data):
            if not isinstance(building, dict):
                continue
                
            cleaned_building = {}
            building_errors = []
            
            # Numeric validations
            if 'floor_area' in building and building['floor_area']:
                try:
                    area = float(building['floor_area'])
                    if 0 < area < 100000:  # Reasonable bounds
                        cleaned_building['floor_area'] = area
                    else:
                        building_errors.append(f"Floor area out of range: {area}")
                except (ValueError, TypeError):
                    building_errors.append(f"Invalid floor area: {building['floor_area']}")
            
            if 'construction_year' in building and building['construction_year']:
                try:
                    year = int(building['construction_year'])
                    if 1800 <= year <= datetime.now().year:
                        cleaned_building['construction_year'] = year
                    else:
                        building_errors.append(f"Construction year out of range: {year}")
                except (ValueError, TypeError):
                    building_errors.append(f"Invalid construction year: {building['construction_year']}")
            
            if 'stories' in building and building['stories']:
                try:
                    stories = int(building['stories'])
                    if 1 <= stories <= 50:
                        cleaned_building['stories'] = stories
                    else:
                        building_errors.append(f"Stories out of range: {stories}")
                except (ValueError, TypeError):
                    building_errors.append(f"Invalid stories: {building['stories']}")
            
            # Text fields
            for field in ['type', 'use', 'construction_type', 'roof_type', 'wall_type',
                         'floor_type', 'condition', 'description']:
                if field in building and building[field]:
                    cleaned_building[field] = str(building[field]).strip()
            
            if cleaned_building:  # Only add if has valid data
                cleaned.append(cleaned_building)
            
            if building_errors:
                errors.extend([f"Building {i+1}: {err}" for err in building_errors])
        
        return cleaned, errors
    
    @staticmethod
    def _validate_utilities(data: Dict[str, Any], level: ValidationLevel) -> Tuple[Dict[str, Any], List[str]]:
        """Validate utilities data"""
        cleaned = {}
        errors = []
        
        utility_sections = ['electricity', 'water', 'telecom', 'sewerage', 'drainage']
        
        for section in utility_sections:
            if section in data and isinstance(data[section], dict):
                cleaned[section] = {}
                section_data = data[section]
                
                # Copy all string fields after cleaning
                for key, value in section_data.items():
                    if value:
                        if isinstance(value, bool):
                            cleaned[section][key] = value
                        else:
                            cleaned[section][key] = str(value).strip()
        
        return cleaned, errors

    @staticmethod 
    def sanitize_text(text: str) -> str:
        """Sanitize text input to prevent injection attacks"""
        if not text:
            return ""
        
        # Remove potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', ';', '(', ')', '|', '`', '\\']
        clean_text = str(text)
        
        for char in dangerous_chars:
            clean_text = clean_text.replace(char, '')
        
        return clean_text.strip()

    @staticmethod
    def validate_currency_amount(amount: Any, max_value: float = 1e12) -> Optional[float]:
        """Validate currency amounts"""
        try:
            value = float(str(amount).replace(',', '').replace('Rs.', '').replace('LKR', '').strip())
            if 0 <= value <= max_value:
                return value
        except (ValueError, TypeError):
            pass
        return None