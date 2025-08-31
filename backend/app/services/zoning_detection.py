"""
Automated zoning and planning regulation detection service for Sri Lankan properties
"""
import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from app.core.config import settings
from app.services.google_maps import reverse_geocode, is_google_maps_available

logger = logging.getLogger(__name__)

# Sri Lankan Administrative Authorities and their zoning patterns
PLANNING_AUTHORITIES = {
    # Colombo District
    "colombo": {
        "authority_type": "municipal_council",
        "authority_name": "Colombo Municipal Council",
        "uda_zone": True,
        "development_plan": "Colombo Metropolitan Regional Structure Plan 2030"
    },
    "sri jayawardenepura kotte": {
        "authority_type": "municipal_council", 
        "authority_name": "Sri Jayawardenepura Kotte Municipal Council",
        "uda_zone": True,
        "development_plan": "Western Megapolis Master Plan"
    },
    "dehiwala": {
        "authority_type": "municipal_council",
        "authority_name": "Dehiwala-Mount Lavinia Municipal Council",
        "uda_zone": True,
        "development_plan": "Western Region Megapolis Master Plan"
    },
    "moratuwa": {
        "authority_type": "municipal_council",
        "authority_name": "Moratuwa Municipal Council", 
        "uda_zone": True,
        "development_plan": "Colombo Urban Development Plan"
    },
    
    # Gampaha District
    "gampaha": {
        "authority_type": "municipal_council",
        "authority_name": "Gampaha Municipal Council",
        "uda_zone": True,
        "development_plan": "Western Megapolis Master Plan"
    },
    "negombo": {
        "authority_type": "municipal_council",
        "authority_name": "Negombo Municipal Council",
        "uda_zone": True, 
        "development_plan": "Western Region Master Plan"
    },
    
    # Kandy District
    "kandy": {
        "authority_type": "municipal_council",
        "authority_name": "Kandy Municipal Council",
        "uda_zone": False,
        "development_plan": "Kandy City Development Plan"
    },
    
    # Galle District  
    "galle": {
        "authority_type": "municipal_council",
        "authority_name": "Galle Municipal Council",
        "uda_zone": False,
        "development_plan": "Southern Province Development Plan"
    },
    
    # Default for other areas
    "default": {
        "authority_type": "pradeshiya_sabha",
        "authority_name": "Local Pradeshiya Sabha",
        "uda_zone": False,
        "development_plan": "Local Development Plan"
    }
}

# UDA Development Plan Regulations (Urban Development Authority)
UDA_REGULATIONS = {
    "residential_low": {
        "zoning_classification": "residential_low",
        "max_height": 9.0,
        "max_floors": 2,
        "floor_area_ratio": 0.5,
        "building_coverage": 35.0,
        "front_setback": 3.0,
        "side_setbacks": 1.5,
        "rear_setback": 3.0,
        "parking_requirements": "1 space per dwelling unit",
        "landscaping_percentage": 25.0
    },
    "residential_medium": {
        "zoning_classification": "residential_medium", 
        "max_height": 15.0,
        "max_floors": 4,
        "floor_area_ratio": 1.0,
        "building_coverage": 50.0,
        "front_setback": 3.0,
        "side_setbacks": 2.0, 
        "rear_setback": 3.0,
        "parking_requirements": "1 space per dwelling unit",
        "landscaping_percentage": 20.0
    },
    "residential_high": {
        "zoning_classification": "residential_high",
        "max_height": 45.0,
        "max_floors": 12,
        "floor_area_ratio": 2.0,
        "building_coverage": 60.0,
        "front_setback": 5.0,
        "side_setbacks": 3.0,
        "rear_setback": 5.0,
        "parking_requirements": "1.5 spaces per dwelling unit",
        "landscaping_percentage": 15.0
    },
    "commercial": {
        "zoning_classification": "commercial",
        "max_height": 30.0,
        "max_floors": 8,
        "floor_area_ratio": 3.0,
        "building_coverage": 70.0,
        "front_setback": 3.0,
        "side_setbacks": 2.0,
        "rear_setback": 3.0,
        "parking_requirements": "1 space per 25 sqm floor area",
        "landscaping_percentage": 10.0
    },
    "mixed_use": {
        "zoning_classification": "mixed_use",
        "max_height": 24.0,
        "max_floors": 6,
        "floor_area_ratio": 2.5,
        "building_coverage": 65.0,
        "front_setback": 3.0,
        "side_setbacks": 2.5,
        "rear_setback": 3.0,
        "parking_requirements": "1 space per dwelling + 1 per 30 sqm commercial",
        "landscaping_percentage": 15.0
    }
}

# Municipal Council Regulations (generally more relaxed than UDA)
MUNICIPAL_REGULATIONS = {
    "residential_low": {
        "zoning_classification": "residential_low",
        "max_height": 12.0,
        "max_floors": 3,
        "floor_area_ratio": 0.75,
        "building_coverage": 40.0,
        "front_setback": 2.5,
        "side_setbacks": 1.0,
        "rear_setback": 2.5,
        "parking_requirements": "1 space per dwelling unit",
        "landscaping_percentage": 20.0
    },
    "residential_medium": {
        "zoning_classification": "residential_medium",
        "max_height": 18.0,
        "max_floors": 5, 
        "floor_area_ratio": 1.25,
        "building_coverage": 55.0,
        "front_setback": 3.0,
        "side_setbacks": 1.5,
        "rear_setback": 3.0,
        "parking_requirements": "1 space per dwelling unit", 
        "landscaping_percentage": 15.0
    },
    "commercial": {
        "zoning_classification": "commercial",
        "max_height": 35.0,
        "max_floors": 10,
        "floor_area_ratio": 3.5,
        "building_coverage": 75.0,
        "front_setback": 2.5,
        "side_setbacks": 1.5,
        "rear_setback": 2.5,
        "parking_requirements": "1 space per 20 sqm floor area",
        "landscaping_percentage": 10.0
    }
}


def detect_planning_authority(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Detect the planning authority based on property coordinates
    Uses reverse geocoding to determine local authority jurisdiction
    """
    if not is_google_maps_available():
        return {
            "error": "Google Maps API not available for authority detection",
            "fallback_authority": PLANNING_AUTHORITIES["default"]
        }
    
    try:
        # Get address components from coordinates
        address_data = reverse_geocode(latitude, longitude)
        
        if "error" in address_data:
            return {
                "error": f"Geocoding failed: {address_data['error']}",
                "fallback_authority": PLANNING_AUTHORITIES["default"]
            }
        
        # Extract administrative components
        components = address_data.get("components", {})
        city = components.get("city", "").lower()
        district = components.get("district", "").lower()
        
        # Determine planning authority based on location
        authority_key = None
        
        # Check for direct city match first
        if city in PLANNING_AUTHORITIES:
            authority_key = city
        # Check for district-based authority
        elif district and f"{district} district" in [k for k in PLANNING_AUTHORITIES.keys()]:
            authority_key = district
        # Check partial matches for major cities
        elif any(major_city in city for major_city in ["colombo", "kandy", "galle", "gampaha", "negombo"]):
            for major_city in ["colombo", "kandy", "galle", "gampaha", "negombo"]:
                if major_city in city:
                    authority_key = major_city
                    break
        
        # Use detected authority or fall back to default
        authority_info = PLANNING_AUTHORITIES.get(authority_key, PLANNING_AUTHORITIES["default"])
        
        return {
            "detected_location": {
                "city": city,
                "district": district,
                "authority_key": authority_key
            },
            "authority": authority_info,
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "geocoding_source": "google_maps"
        }
        
    except Exception as e:
        logger.error(f"Authority detection failed: {str(e)}")
        return {
            "error": f"Authority detection failed: {str(e)}",
            "fallback_authority": PLANNING_AUTHORITIES["default"]
        }


def get_zoning_regulations(authority_info: Dict[str, Any], zoning_type: str = "residential_medium") -> Dict[str, Any]:
    """
    Get zoning regulations based on planning authority and zoning type
    """
    try:
        # Determine if UDA regulations apply
        is_uda_zone = authority_info.get("uda_zone", False)
        
        # Select appropriate regulation set
        if is_uda_zone and zoning_type in UDA_REGULATIONS:
            regulations = UDA_REGULATIONS[zoning_type]
            regulation_source = "UDA Development Plan and Building Regulations 2020"
        elif zoning_type in MUNICIPAL_REGULATIONS:
            regulations = MUNICIPAL_REGULATIONS[zoning_type]
            regulation_source = f"{authority_info.get('authority_name', 'Municipal')} Building Regulations"
        else:
            # Fallback to residential medium regulations
            if is_uda_zone:
                regulations = UDA_REGULATIONS["residential_medium"]
                regulation_source = "UDA Development Plan and Building Regulations 2020 (Default)"
            else:
                regulations = MUNICIPAL_REGULATIONS["residential_medium"] 
                regulation_source = "Municipal Building Regulations (Default)"
        
        return {
            "regulations": regulations,
            "regulation_source": regulation_source,
            "authority": authority_info.get("authority_name"),
            "uda_zone": is_uda_zone,
            "development_plan": authority_info.get("development_plan"),
            "zoning_type": zoning_type
        }
        
    except Exception as e:
        logger.error(f"Regulation retrieval failed: {str(e)}")
        return {"error": f"Failed to retrieve regulations: {str(e)}"}


def analyze_property_zoning(latitude: float, longitude: float, property_type: str = "residential") -> Dict[str, Any]:
    """
    Complete property zoning analysis combining authority detection and regulations
    """
    try:
        # Step 1: Detect planning authority
        authority_result = detect_planning_authority(latitude, longitude)
        
        if "error" in authority_result and "fallback_authority" not in authority_result:
            return authority_result
        
        # Use detected or fallback authority
        authority_info = authority_result.get("authority", authority_result.get("fallback_authority"))
        
        # Step 2: Infer zoning type from property type
        zoning_type_mapping = {
            "residential": "residential_medium",
            "commercial": "commercial", 
            "mixed_use": "mixed_use",
            "apartment": "residential_high",
            "house": "residential_low",
            "shop": "commercial",
            "office": "commercial"
        }
        
        zoning_type = zoning_type_mapping.get(property_type.lower(), "residential_medium")
        
        # Step 3: Get applicable regulations
        regulations_result = get_zoning_regulations(authority_info, zoning_type)
        
        if "error" in regulations_result:
            return regulations_result
        
        # Step 4: Combine results
        return {
            "location_analysis": authority_result.get("detected_location", {}),
            "planning_authority": authority_info.get("authority_name"),
            "authority_type": authority_info.get("authority_type"),
            "uda_zone": authority_info.get("uda_zone", False),
            "development_plan": authority_info.get("development_plan"),
            "zoning_analysis": {
                "inferred_zoning": zoning_type,
                "regulations": regulations_result["regulations"],
                "regulation_source": regulations_result["regulation_source"]
            },
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "analysis_timestamp": __import__('time').time()
        }
        
    except Exception as e:
        logger.error(f"Property zoning analysis failed: {str(e)}")
        return {"error": f"Zoning analysis failed: {str(e)}"}


def get_development_recommendations(zoning_analysis: Dict[str, Any]) -> List[str]:
    """
    Generate development recommendations based on zoning analysis
    """
    try:
        recommendations = []
        regulations = zoning_analysis.get("zoning_analysis", {}).get("regulations", {})
        
        if not regulations:
            return ["Complete zoning analysis required for recommendations"]
        
        # Height and floor recommendations
        max_height = regulations.get("max_height")
        max_floors = regulations.get("max_floors")
        if max_height and max_floors:
            recommendations.append(f"Maximum building height: {max_height}m ({max_floors} floors)")
        
        # FAR recommendations
        far = regulations.get("floor_area_ratio")
        if far:
            recommendations.append(f"Floor Area Ratio (FAR): {far} - allows {int(far * 100)}% of lot area as floor space")
        
        # Coverage recommendations
        coverage = regulations.get("building_coverage")
        if coverage:
            recommendations.append(f"Maximum building coverage: {coverage}% of lot area")
        
        # Setback requirements
        front_setback = regulations.get("front_setback")
        side_setbacks = regulations.get("side_setbacks")
        rear_setback = regulations.get("rear_setback")
        
        setback_info = []
        if front_setback: setback_info.append(f"front: {front_setback}m")
        if side_setbacks: setback_info.append(f"sides: {side_setbacks}m")
        if rear_setback: setback_info.append(f"rear: {rear_setback}m")
        
        if setback_info:
            recommendations.append(f"Required setbacks - {', '.join(setback_info)}")
        
        # Parking requirements
        parking = regulations.get("parking_requirements")
        if parking:
            recommendations.append(f"Parking requirement: {parking}")
        
        # Landscaping requirements
        landscaping = regulations.get("landscaping_percentage")
        if landscaping:
            recommendations.append(f"Landscaping requirement: {landscaping}% of lot area")
        
        # Authority-specific notes
        if zoning_analysis.get("uda_zone"):
            recommendations.append("Property in UDA zone - stricter development controls apply")
            recommendations.append("UDA approval required for development plans")
        else:
            recommendations.append("Local authority approval required for building plans")
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Failed to generate recommendations: {str(e)}")
        return [f"Error generating recommendations: {str(e)}"]