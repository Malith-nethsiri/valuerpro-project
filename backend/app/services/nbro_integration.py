"""
NBRO (National Building Research Organisation) integration service for landslide risk assessment
Provides landslide hazard zone detection and clearance requirements for Sri Lankan properties
"""
import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from app.core.config import settings
from app.services.google_maps import reverse_geocode, is_google_maps_available

logger = logging.getLogger(__name__)

# NBRO High-Risk Landslide Zones in Sri Lanka (Based on NBRO Hazard Maps)
# These are approximate zones based on known landslide-prone areas
NBRO_HIGH_RISK_ZONES = {
    # Central Province - High Risk
    "kandy": {
        "district": "Kandy",
        "province": "Central",
        "risk_level": "high",
        "landslide_prone": True,
        "nbro_clearance_required": True,
        "hazard_types": ["landslide", "slope_failure", "rockfall"],
        "reference": "NBRO Landslide Risk Map - Central Province 2020"
    },
    "matale": {
        "district": "Matale", 
        "province": "Central",
        "risk_level": "high",
        "landslide_prone": True,
        "nbro_clearance_required": True,
        "hazard_types": ["landslide", "slope_failure"],
        "reference": "NBRO Hazard Zonation Map - Matale District"
    },
    "nuwara eliya": {
        "district": "Nuwara Eliya",
        "province": "Central", 
        "risk_level": "very_high",
        "landslide_prone": True,
        "nbro_clearance_required": True,
        "hazard_types": ["landslide", "slope_failure", "debris_flow"],
        "reference": "NBRO High Risk Zone - Hill Country"
    },
    
    # Sabaragamuwa Province - High Risk
    "ratnapura": {
        "district": "Ratnapura",
        "province": "Sabaragamuwa",
        "risk_level": "very_high", 
        "landslide_prone": True,
        "nbro_clearance_required": True,
        "hazard_types": ["landslide", "debris_flow", "slope_failure"],
        "reference": "NBRO Ratnapura District Hazard Map"
    },
    "kegalle": {
        "district": "Kegalle",
        "province": "Sabaragamuwa",
        "risk_level": "high",
        "landslide_prone": True,
        "nbro_clearance_required": True,
        "hazard_types": ["landslide", "slope_failure"],
        "reference": "NBRO Kegalle District Risk Assessment"
    },
    
    # Uva Province - Moderate to High Risk
    "badulla": {
        "district": "Badulla",
        "province": "Uva",
        "risk_level": "high",
        "landslide_prone": True,
        "nbro_clearance_required": True,
        "hazard_types": ["landslide", "rockfall"],
        "reference": "NBRO Uva Province Hazard Map"
    },
    "monaragala": {
        "district": "Monaragala", 
        "province": "Uva",
        "risk_level": "moderate",
        "landslide_prone": True,
        "nbro_clearance_required": True,
        "hazard_types": ["landslide"],
        "reference": "NBRO Southern Hill Country Assessment"
    },
    
    # Western Province - Moderate Risk (Hill Areas)
    "gampaha": {
        "district": "Gampaha",
        "province": "Western",
        "risk_level": "moderate",
        "landslide_prone": False,  # Only hilly areas
        "nbro_clearance_required": False,  # Only for slope areas
        "hazard_types": ["localized_slope_failure"],
        "reference": "NBRO Western Province Risk Map"
    },
    
    # Southern Province - Low to Moderate Risk
    "galle": {
        "district": "Galle",
        "province": "Southern", 
        "risk_level": "low",
        "landslide_prone": False,
        "nbro_clearance_required": False,
        "hazard_types": ["coastal_erosion"],
        "reference": "NBRO Southern Province Coastal Assessment"
    },
    "matara": {
        "district": "Matara",
        "province": "Southern",
        "risk_level": "low", 
        "landslide_prone": False,
        "nbro_clearance_required": False,
        "hazard_types": ["coastal_erosion"],
        "reference": "NBRO Coastal Zone Assessment"
    },
    
    # North Western Province - Low Risk
    "kurunegala": {
        "district": "Kurunegala",
        "province": "North Western",
        "risk_level": "moderate",
        "landslide_prone": True,  # Some hilly areas
        "nbro_clearance_required": False,  # Only for specific slopes
        "hazard_types": ["localized_landslide"],
        "reference": "NBRO North Western Province Map"
    },
    
    # Default for unlisted areas - assume low risk
    "default": {
        "district": "Unknown",
        "province": "Unknown",
        "risk_level": "low",
        "landslide_prone": False,
        "nbro_clearance_required": False,
        "hazard_types": [],
        "reference": "NBRO General Risk Assessment Required"
    }
}

# Elevation-based risk assessment thresholds
ELEVATION_RISK_THRESHOLDS = {
    "very_high_risk": 1000,  # Above 1000m - very high landslide risk
    "high_risk": 500,        # 500-1000m - high risk in monsoon areas  
    "moderate_risk": 200,    # 200-500m - moderate risk on slopes
    "low_risk": 0           # Below 200m - generally low risk
}

# Slope angle risk categories (if slope data available)
SLOPE_RISK_CATEGORIES = {
    "critical": 30,      # > 30 degrees - critical landslide risk
    "high": 20,          # 20-30 degrees - high risk
    "moderate": 10,      # 10-20 degrees - moderate risk  
    "low": 5,           # 5-10 degrees - low risk
    "minimal": 0        # < 5 degrees - minimal risk
}


def assess_landslide_risk(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Assess landslide risk based on property coordinates using NBRO hazard zone data
    """
    try:
        # Step 1: Get location information via reverse geocoding
        location_result = get_location_context(latitude, longitude)
        
        if "error" in location_result:
            return {
                "error": location_result["error"],
                "fallback_assessment": get_default_risk_assessment()
            }
        
        # Step 2: Determine risk zone based on administrative area
        risk_assessment = determine_risk_zone(location_result)
        
        # Step 3: Add coordinate-based risk factors
        coordinate_factors = assess_coordinate_risk_factors(latitude, longitude)
        
        # Step 4: Combine assessments
        final_assessment = combine_risk_assessments(
            risk_assessment, coordinate_factors, location_result
        )
        
        return final_assessment
        
    except Exception as e:
        logger.error(f"NBRO risk assessment failed: {str(e)}")
        return {
            "error": f"Risk assessment failed: {str(e)}",
            "fallback_assessment": get_default_risk_assessment()
        }


def get_location_context(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Get location context for NBRO risk assessment
    """
    if not is_google_maps_available():
        return {
            "error": "Location services unavailable for NBRO assessment",
            "coordinates": {"latitude": latitude, "longitude": longitude}
        }
    
    try:
        # Use existing reverse geocoding service
        address_data = reverse_geocode(latitude, longitude)
        
        if "error" in address_data:
            return {"error": address_data["error"]}
        
        components = address_data.get("components", {})
        
        return {
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "city": components.get("city", "").lower(),
            "district": components.get("district", "").lower(), 
            "province": components.get("province", "").lower(),
            "formatted_address": address_data.get("formatted_address", ""),
            "geocoding_source": "google_maps"
        }
        
    except Exception as e:
        return {"error": f"Location lookup failed: {str(e)}"}


def determine_risk_zone(location_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Determine NBRO risk zone based on location administrative data
    """
    city = location_data.get("city", "")
    district = location_data.get("district", "")
    
    # Check for direct city match first
    risk_zone = None
    zone_key = None
    
    if city and city in NBRO_HIGH_RISK_ZONES:
        risk_zone = NBRO_HIGH_RISK_ZONES[city]
        zone_key = city
    elif district and district in NBRO_HIGH_RISK_ZONES:
        risk_zone = NBRO_HIGH_RISK_ZONES[district] 
        zone_key = district
    else:
        # Check for partial matches with known high-risk areas
        high_risk_areas = ["kandy", "ratnapura", "nuwara eliya", "matale", "kegalle", "badulla"]
        for area in high_risk_areas:
            if area in city or area in district:
                risk_zone = NBRO_HIGH_RISK_ZONES[area]
                zone_key = area
                break
    
    # Use default if no match found
    if not risk_zone:
        risk_zone = NBRO_HIGH_RISK_ZONES["default"]
        zone_key = "default"
    
    return {
        "zone_key": zone_key,
        "district": risk_zone["district"],
        "province": risk_zone["province"], 
        "risk_level": risk_zone["risk_level"],
        "landslide_prone": risk_zone["landslide_prone"],
        "nbro_clearance_required": risk_zone["nbro_clearance_required"],
        "hazard_types": risk_zone["hazard_types"],
        "reference_map": risk_zone["reference"]
    }


def assess_coordinate_risk_factors(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Assess additional risk factors based on coordinates
    """
    risk_factors = {
        "elevation_risk": "unknown",  # Would need elevation API
        "slope_risk": "unknown",      # Would need topographic data
        "proximity_to_hills": assess_hill_proximity(latitude, longitude),
        "monsoon_exposure": assess_monsoon_risk(latitude, longitude)
    }
    
    return risk_factors


def assess_hill_proximity(latitude: float, longitude: float) -> str:
    """
    Assess proximity to known hilly/mountainous areas in Sri Lanka
    """
    # Central hills: rough coordinate bounds
    central_hills_bounds = {
        "north": 7.5, "south": 6.0,
        "east": 81.5, "west": 80.0
    }
    
    # Check if coordinates fall within central hills region
    if (central_hills_bounds["south"] <= latitude <= central_hills_bounds["north"] and
        central_hills_bounds["west"] <= longitude <= central_hills_bounds["east"]):
        return "high"  # Within central hills
    
    # Check proximity to hill country
    hill_distance = min(
        abs(latitude - 7.0),  # Distance from Kandy area
        abs(latitude - 6.5)   # Distance from Ratnapura area
    )
    
    if hill_distance < 0.3:  # Within ~30km
        return "moderate"
    elif hill_distance < 0.7:  # Within ~70km 
        return "low"
    else:
        return "minimal"


def assess_monsoon_risk(latitude: float, longitude: float) -> str:
    """
    Assess monsoon-related landslide risk based on location
    """
    # Southwest monsoon affects western and southern slopes more
    # Northeast monsoon affects eastern slopes
    
    # Western and southern areas - higher SW monsoon impact
    if longitude < 80.5 and latitude < 7.5:
        return "high_sw_monsoon"
    
    # Eastern areas - higher NE monsoon impact  
    elif longitude > 80.5:
        return "high_ne_monsoon"
        
    # Central areas - affected by both
    else:
        return "dual_monsoon_exposure"


def combine_risk_assessments(
    zone_assessment: Dict[str, Any], 
    coordinate_factors: Dict[str, Any],
    location_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Combine different risk assessment factors into final evaluation
    """
    base_risk = zone_assessment["risk_level"]
    
    # Enhance risk level based on coordinate factors
    enhanced_risk = base_risk
    if coordinate_factors["proximity_to_hills"] == "high":
        if base_risk == "low":
            enhanced_risk = "moderate"
        elif base_risk == "moderate": 
            enhanced_risk = "high"
    
    return {
        "coordinates": location_data["coordinates"],
        "location": {
            "city": location_data.get("city", ""),
            "district": zone_assessment["district"],
            "province": zone_assessment["province"],
            "formatted_address": location_data.get("formatted_address", "")
        },
        "nbro_assessment": {
            "risk_level": enhanced_risk,
            "zone_classification": zone_assessment["zone_key"],
            "landslide_prone_area": zone_assessment["landslide_prone"],
            "nbro_clearance_required": zone_assessment["nbro_clearance_required"],
            "hazard_types": zone_assessment["hazard_types"],
            "reference_map": zone_assessment["reference_map"]
        },
        "risk_factors": {
            "administrative_zone_risk": base_risk,
            "hill_proximity": coordinate_factors["proximity_to_hills"],
            "monsoon_exposure": coordinate_factors["monsoon_exposure"],
            "enhanced_risk_level": enhanced_risk
        },
        "recommendations": generate_nbro_recommendations(zone_assessment, coordinate_factors),
        "compliance_requirements": get_compliance_requirements(zone_assessment),
        "assessment_timestamp": __import__('time').time()
    }


def generate_nbro_recommendations(
    zone_assessment: Dict[str, Any], 
    coordinate_factors: Dict[str, Any]
) -> List[str]:
    """
    Generate NBRO-specific recommendations based on risk assessment
    """
    recommendations = []
    
    risk_level = zone_assessment["risk_level"]
    clearance_required = zone_assessment["nbro_clearance_required"]
    
    # Clearance requirements
    if clearance_required:
        recommendations.append("NBRO clearance certificate required before construction")
        recommendations.append("Site-specific geotechnical investigation mandatory")
        recommendations.append("Slope stability analysis required for development")
    
    # Risk-based recommendations
    if risk_level in ["high", "very_high"]:
        recommendations.append("Avoid construction on steep slopes (>20 degrees)")
        recommendations.append("Implement proper drainage and slope protection measures")
        recommendations.append("Consider retaining walls and slope stabilization")
        recommendations.append("Regular monitoring during monsoon seasons recommended")
        
    elif risk_level == "moderate":
        recommendations.append("Basic slope stability assessment recommended")
        recommendations.append("Ensure proper surface drainage around structures")
        recommendations.append("Monitor for ground movement during heavy rains")
        
    else:  # Low risk
        recommendations.append("Standard building practices sufficient")
        recommendations.append("Basic drainage precautions recommended")
    
    # Area-specific recommendations
    if coordinate_factors["proximity_to_hills"] == "high":
        recommendations.append("Extra caution during monsoon seasons (May-Sep, Nov-Jan)")
        recommendations.append("Maintain safe distance from cut slopes and embankments")
    
    # Add NBRO portal reference
    recommendations.append("Verify latest hazard maps at NBRO website: nbro.gov.lk")
    recommendations.append("Consult NBRO district office for site-specific guidance")
    
    return recommendations


def get_compliance_requirements(zone_assessment: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get specific compliance requirements based on NBRO assessment
    """
    clearance_required = zone_assessment["nbro_clearance_required"]
    risk_level = zone_assessment["risk_level"]
    
    requirements = {
        "nbro_clearance_certificate": clearance_required,
        "geotechnical_investigation": clearance_required,
        "slope_stability_report": risk_level in ["high", "very_high"],
        "drainage_plan": risk_level != "low",
        "monitoring_plan": risk_level in ["high", "very_high"],
        "professional_engineer_approval": clearance_required
    }
    
    return {
        "mandatory_requirements": [k for k, v in requirements.items() if v],
        "recommended_studies": get_recommended_studies(zone_assessment),
        "approval_process": get_approval_process_info(clearance_required),
        "estimated_timeline": get_approval_timeline(clearance_required)
    }


def get_recommended_studies(zone_assessment: Dict[str, Any]) -> List[str]:
    """
    Get recommended studies based on risk level
    """
    risk_level = zone_assessment["risk_level"]
    
    if risk_level == "very_high":
        return [
            "Detailed geological survey",
            "Slope stability analysis",
            "Groundwater assessment", 
            "Seismic hazard evaluation",
            "Rainfall impact study"
        ]
    elif risk_level == "high":
        return [
            "Geotechnical investigation",
            "Basic slope analysis",
            "Drainage assessment",
            "Seasonal monitoring plan"
        ]
    elif risk_level == "moderate":
        return [
            "Site inspection by qualified engineer",
            "Basic geological assessment",
            "Drainage adequacy check"
        ]
    else:
        return ["Standard site assessment sufficient"]


def get_approval_process_info(clearance_required: bool) -> Dict[str, str]:
    """
    Get information about NBRO approval process
    """
    if clearance_required:
        return {
            "process": "NBRO Clearance Certificate Application",
            "authority": "National Building Research Organisation (NBRO)",
            "application_method": "Online portal or district office",
            "required_documents": "Site plan, geotechnical report, engineer certification",
            "contact": "NBRO Head Office: +94-11-2665991, nbro@nbro.gov.lk"
        }
    else:
        return {
            "process": "Standard building approval sufficient",
            "authority": "Local Planning Authority",
            "note": "NBRO consultation recommended for complex projects"
        }


def get_approval_timeline(clearance_required: bool) -> str:
    """
    Estimate approval timeline based on requirements
    """
    if clearance_required:
        return "3-6 months (including geotechnical studies and NBRO review)"
    else:
        return "Standard planning approval timeline"


def get_default_risk_assessment() -> Dict[str, Any]:
    """
    Provide default risk assessment when location-based assessment fails
    """
    return {
        "nbro_assessment": {
            "risk_level": "unknown",
            "zone_classification": "unknown",
            "landslide_prone_area": None,
            "nbro_clearance_required": None,
            "hazard_types": [],
            "reference_map": "Manual NBRO consultation required"
        },
        "recommendations": [
            "Contact NBRO district office for site-specific risk assessment",
            "Refer to NBRO hazard maps at nbro.gov.lk",
            "Consult qualified geotechnical engineer for property assessment",
            "Verify landslide risk classification before development"
        ],
        "compliance_requirements": {
            "mandatory_requirements": ["Manual NBRO consultation"],
            "approval_process": {
                "process": "Contact NBRO for guidance",
                "contact": "NBRO Head Office: +94-11-2665991"
            }
        }
    }