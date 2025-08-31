"""
Regulation database and compliance system service
Manages regulatory documents, compliance requirements, and location-based regulation associations
"""
import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.config import settings
from app.models import User  # Will need to create RegulationDocument model
from app.services.google_maps import reverse_geocode, is_google_maps_available
from app.services.zoning_detection import detect_planning_authority

logger = logging.getLogger(__name__)

# Predefined regulation categories for Sri Lankan property development
REGULATION_CATEGORIES = {
    "uda": {
        "name": "Urban Development Authority (UDA)",
        "description": "UDA Development Plans and Building Regulations",
        "authority_type": "uda",
        "applicable_areas": ["colombo", "gampaha", "dehiwala", "moratuwa", "negombo"],
        "document_types": [
            "Development Plan",
            "Building Regulations", 
            "Zoning Map",
            "Master Plan",
            "Special Area Plan"
        ]
    },
    "municipal": {
        "name": "Municipal Council Regulations",
        "description": "Local Municipal Council building and planning regulations",
        "authority_type": "municipal_council",
        "applicable_areas": ["kandy", "galle", "matara", "anuradhapura", "kurunegala"],
        "document_types": [
            "Building Regulations",
            "Local Development Plan",
            "Zoning Ordinance",
            "Planning Guidelines"
        ]
    },
    "urban_council": {
        "name": "Urban Council Regulations", 
        "description": "Urban Council planning and building control regulations",
        "authority_type": "urban_council",
        "applicable_areas": ["panadura", "kalutara", "chilaw", "puttalam"],
        "document_types": [
            "Building Regulations",
            "Development Guidelines",
            "Zoning Rules"
        ]
    },
    "pradeshiya_sabha": {
        "name": "Pradeshiya Sabha Regulations",
        "description": "Local Pradeshiya Sabha building and development regulations",
        "authority_type": "pradeshiya_sabha", 
        "applicable_areas": ["rural_areas", "small_towns"],
        "document_types": [
            "Building Guidelines",
            "Development Rules",
            "Local Ordinances"
        ]
    },
    "cea": {
        "name": "Central Environmental Authority (CEA)",
        "description": "Environmental regulations and clearance requirements",
        "authority_type": "environmental",
        "applicable_areas": ["all_areas"],
        "document_types": [
            "Environmental Impact Assessment Guidelines",
            "Pollution Control Regulations",
            "Protected Area Regulations",
            "Coastal Zone Regulations"
        ]
    },
    "nbro": {
        "name": "National Building Research Organisation (NBRO)",
        "description": "Landslide risk and geotechnical regulations",
        "authority_type": "geological",
        "applicable_areas": ["landslide_prone_areas"],
        "document_types": [
            "Landslide Risk Guidelines",
            "Geotechnical Investigation Standards",
            "Slope Protection Guidelines",
            "Building Guidelines for Risk Areas"
        ]
    },
    "rda": {
        "name": "Road Development Authority (RDA)",
        "description": "Road reservations and access regulations",
        "authority_type": "infrastructure",
        "applicable_areas": ["all_areas"],
        "document_types": [
            "Road Reservation Guidelines",
            "Access Control Regulations",
            "Highway Buffer Zone Rules"
        ]
    }
}

# Compliance checklist templates based on authority type
COMPLIANCE_CHECKLISTS = {
    "uda": {
        "mandatory_documents": [
            "Approved Development Plan",
            "Building Plan Approval",
            "UDA Clearance Certificate",
            "Fire Safety Certificate",
            "Structural Engineer Certificate"
        ],
        "recommended_documents": [
            "Traffic Impact Assessment",
            "Parking Plan",
            "Landscape Plan",
            "Utility Connection Plans"
        ],
        "approval_stages": [
            "Preliminary Plan Approval",
            "Detailed Plan Approval", 
            "Building Plan Approval",
            "Completion Certificate"
        ]
    },
    "municipal_council": {
        "mandatory_documents": [
            "Building Plan Approval",
            "Municipal Council Permit",
            "Structural Engineer Certificate",
            "Fire Safety Compliance"
        ],
        "recommended_documents": [
            "Site Survey Plan",
            "Utility Connection Plans",
            "Parking Arrangement Plan"
        ],
        "approval_stages": [
            "Plan Submission",
            "Plan Approval",
            "Construction Permit",
            "Completion Certificate"
        ]
    },
    "environmental": {
        "mandatory_documents": [
            "Environmental Impact Assessment (EIA)",
            "Initial Environmental Examination (IEE)",
            "Environmental Protection License",
            "Pollution Control Permit"
        ],
        "conditional_documents": [
            "Coastal Zone Clearance (if within 300m of coast)",
            "Forest Clearance (if forest land involved)",
            "Wetland Clearance (if wetland area affected)"
        ],
        "approval_stages": [
            "Environmental Screening",
            "EIA/IEE Preparation",
            "Public Consultation",
            "Environmental Approval"
        ]
    }
}


def get_applicable_regulations(latitude: float, longitude: float, property_type: str = "residential") -> Dict[str, Any]:
    """
    Get all applicable regulations for a property location
    """
    try:
        # Step 1: Determine planning authority
        authority_result = detect_planning_authority(latitude, longitude)
        
        if "error" in authority_result and "fallback_authority" not in authority_result:
            return {"error": authority_result["error"]}
        
        # Use detected or fallback authority
        authority_info = authority_result.get("authority", authority_result.get("fallback_authority", {}))
        authority_type = authority_info.get("authority_type", "pradeshiya_sabha")
        
        # Step 2: Get location context
        location_context = get_location_context(latitude, longitude)
        
        # Step 3: Determine applicable regulation categories
        applicable_categories = determine_applicable_categories(
            authority_type, location_context, property_type
        )
        
        # Step 4: Build compliance requirements
        compliance_requirements = build_compliance_requirements(
            applicable_categories, authority_info, property_type
        )
        
        return {
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "location_context": location_context,
            "planning_authority": authority_info,
            "applicable_regulations": applicable_categories,
            "compliance_requirements": compliance_requirements,
            "regulation_summary": generate_regulation_summary(applicable_categories),
            "analysis_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Regulation analysis failed: {str(e)}")
        return {"error": f"Failed to analyze applicable regulations: {str(e)}"}


def get_location_context(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Get enhanced location context for regulation analysis
    """
    context = {
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "coastal_proximity": assess_coastal_proximity(latitude, longitude),
        "urban_classification": assess_urban_classification(latitude, longitude),
        "environmental_sensitivity": assess_environmental_sensitivity(latitude, longitude)
    }
    
    # Add reverse geocoding if available
    if is_google_maps_available():
        try:
            geocode_result = reverse_geocode(latitude, longitude)
            if "error" not in geocode_result:
                context["address_components"] = geocode_result.get("components", {})
                context["formatted_address"] = geocode_result.get("formatted_address", "")
        except Exception as e:
            logger.warning(f"Geocoding failed in regulation context: {str(e)}")
    
    return context


def determine_applicable_categories(
    authority_type: str, 
    location_context: Dict[str, Any], 
    property_type: str
) -> List[Dict[str, Any]]:
    """
    Determine which regulation categories apply to the property
    """
    applicable = []
    
    # Always applicable categories
    applicable.extend([
        {
            "category": authority_type,
            "priority": "mandatory",
            "reason": "Primary planning authority jurisdiction",
            **REGULATION_CATEGORIES.get(authority_type, REGULATION_CATEGORIES["pradeshiya_sabha"])
        }
    ])
    
    # Conditional categories based on location
    
    # Environmental regulations
    if (location_context.get("coastal_proximity") == "within_300m" or
        location_context.get("environmental_sensitivity") in ["high", "protected"]):
        applicable.append({
            "category": "cea",
            "priority": "mandatory",
            "reason": "Environmental sensitivity or coastal location",
            **REGULATION_CATEGORIES["cea"]
        })
    
    # NBRO regulations (if landslide prone area)
    city = location_context.get("address_components", {}).get("city", "").lower()
    district = location_context.get("address_components", {}).get("district", "").lower()
    
    high_risk_areas = ["kandy", "ratnapura", "nuwara eliya", "matale", "kegalle", "badulla"]
    if any(area in city or area in district for area in high_risk_areas):
        applicable.append({
            "category": "nbro", 
            "priority": "mandatory",
            "reason": "Landslide prone area requiring geotechnical assessment",
            **REGULATION_CATEGORIES["nbro"]
        })
    
    # RDA regulations (always applicable for access)
    applicable.append({
        "category": "rda",
        "priority": "recommended", 
        "reason": "Road access and reservation requirements",
        **REGULATION_CATEGORIES["rda"]
    })
    
    return applicable


def build_compliance_requirements(
    applicable_categories: List[Dict[str, Any]], 
    authority_info: Dict[str, Any],
    property_type: str
) -> Dict[str, Any]:
    """
    Build comprehensive compliance requirements
    """
    requirements = {
        "mandatory_documents": [],
        "recommended_documents": [],
        "conditional_documents": [],
        "approval_stages": [],
        "estimated_timeline": "6-12 months",
        "estimated_cost": "Contact relevant authorities for fee schedule"
    }
    
    # Aggregate requirements from all applicable categories
    for category in applicable_categories:
        category_key = category["category"]
        if category_key in COMPLIANCE_CHECKLISTS:
            checklist = COMPLIANCE_CHECKLISTS[category_key]
            
            # Add mandatory documents
            requirements["mandatory_documents"].extend(
                checklist.get("mandatory_documents", [])
            )
            
            # Add recommended documents
            requirements["recommended_documents"].extend(
                checklist.get("recommended_documents", [])
            )
            
            # Add conditional documents
            requirements["conditional_documents"].extend(
                checklist.get("conditional_documents", [])
            )
            
            # Add approval stages
            requirements["approval_stages"].extend(
                checklist.get("approval_stages", [])
            )
    
    # Remove duplicates
    requirements["mandatory_documents"] = list(set(requirements["mandatory_documents"]))
    requirements["recommended_documents"] = list(set(requirements["recommended_documents"]))
    requirements["conditional_documents"] = list(set(requirements["conditional_documents"]))
    requirements["approval_stages"] = list(set(requirements["approval_stages"]))
    
    return requirements


def generate_regulation_summary(applicable_categories: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a concise summary of applicable regulations
    """
    mandatory_categories = [cat for cat in applicable_categories if cat.get("priority") == "mandatory"]
    recommended_categories = [cat for cat in applicable_categories if cat.get("priority") == "recommended"]
    
    return {
        "total_categories": len(applicable_categories),
        "mandatory_authorities": len(mandatory_categories),
        "recommended_consultations": len(recommended_categories),
        "primary_authority": mandatory_categories[0]["name"] if mandatory_categories else "Unknown",
        "key_requirements": [
            "Building Plan Approval from primary authority",
            "Structural engineer certification",
            "Fire safety compliance",
            "Utility connection approvals"
        ],
        "complexity_level": assess_complexity_level(applicable_categories)
    }


def assess_complexity_level(applicable_categories: List[Dict[str, Any]]) -> str:
    """
    Assess the complexity level of regulatory compliance
    """
    mandatory_count = len([cat for cat in applicable_categories if cat.get("priority") == "mandatory"])
    
    if mandatory_count >= 4:
        return "high"
    elif mandatory_count >= 2:
        return "moderate"
    else:
        return "low"


def assess_coastal_proximity(latitude: float, longitude: float) -> str:
    """
    Assess proximity to coast for CEA regulations
    """
    # Sri Lanka coastal boundaries (approximate)
    # This is a simplified check - in production, would use precise coastal GIS data
    
    # Western coast
    if longitude < 79.9 and 5.9 <= latitude <= 7.3:
        return "within_300m"
    
    # Southern coast  
    if 79.8 <= longitude <= 81.8 and latitude < 6.2:
        return "within_300m"
        
    # Eastern coast
    if longitude > 81.0 and 6.0 <= latitude <= 9.0:
        return "within_300m"
        
    # Northern coast
    if 79.8 <= longitude <= 81.0 and latitude > 8.5:
        return "within_300m"
    
    return "inland"


def assess_urban_classification(latitude: float, longitude: float) -> str:
    """
    Assess urban classification level
    """
    # Major urban areas (Colombo, Gampaha, Kandy centers)
    urban_centers = [
        {"lat": 6.9271, "lng": 79.8612, "name": "colombo"},  # Colombo
        {"lat": 7.2906, "lng": 80.6337, "name": "kandy"},    # Kandy
        {"lat": 7.0873, "lng": 80.2784, "name": "gampaha"},  # Gampaha
    ]
    
    for center in urban_centers:
        # Rough distance calculation (0.1 degree ≈ 11km)
        distance = ((latitude - center["lat"])**2 + (longitude - center["lng"])**2)**0.5
        if distance < 0.1:  # Within ~11km
            return "urban_center"
        elif distance < 0.3:  # Within ~33km
            return "urban_peripheral"
    
    return "rural"


def assess_environmental_sensitivity(latitude: float, longitude: float) -> str:
    """
    Assess environmental sensitivity for CEA requirements
    """
    # Central hills (environmentally sensitive)
    if 6.0 <= latitude <= 7.5 and 80.0 <= longitude <= 81.5:
        return "high"
    
    # Coastal areas
    coastal_proximity = assess_coastal_proximity(latitude, longitude)
    if coastal_proximity == "within_300m":
        return "high"
    
    return "moderate"


def get_regulation_documents_by_location(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Get available regulation documents for a specific location
    This would integrate with a database of uploaded regulation documents
    """
    # This is a placeholder for document database integration
    # In production, this would query actual uploaded documents
    
    return {
        "available_documents": [
            {
                "title": "UDA Development Plan 2030 - Colombo Metropolitan Area",
                "authority": "Urban Development Authority",
                "document_type": "Development Plan",
                "file_type": "PDF",
                "upload_date": "2024-01-15",
                "applicable_areas": ["colombo", "dehiwala", "moratuwa"],
                "download_url": "/api/regulations/documents/uda-colombo-2030.pdf"
            },
            {
                "title": "Building Regulations 2020 - Municipal Councils",
                "authority": "Ministry of Urban Development",
                "document_type": "Building Regulations", 
                "file_type": "PDF",
                "upload_date": "2024-02-01",
                "applicable_areas": ["all_municipal_areas"],
                "download_url": "/api/regulations/documents/municipal-building-regs-2020.pdf"
            }
        ],
        "missing_documents": [
            "Local zoning map for specific area",
            "Recent amendments to building regulations",
            "Environmental impact assessment guidelines"
        ],
        "recommended_sources": [
            {
                "source": "UDA Website",
                "url": "http://www.uda.gov.lk",
                "documents": ["Development Plans", "Building Regulations"]
            },
            {
                "source": "CEA Website", 
                "url": "http://www.cea.lk",
                "documents": ["Environmental Regulations", "EIA Guidelines"]
            },
            {
                "source": "Local Authority Office",
                "contact": "Contact local planning office",
                "documents": ["Local zoning maps", "Recent amendments"]
            }
        ]
    }


def generate_compliance_report(regulation_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a comprehensive compliance report
    """
    applicable_regs = regulation_analysis.get("applicable_regulations", [])
    compliance_reqs = regulation_analysis.get("compliance_requirements", {})
    
    return {
        "executive_summary": {
            "total_authorities": len(applicable_regs),
            "complexity_level": regulation_analysis.get("regulation_summary", {}).get("complexity_level", "unknown"),
            "estimated_timeline": compliance_reqs.get("estimated_timeline", "Contact authorities"),
            "key_challenge": identify_key_challenge(applicable_regs)
        },
        "authority_breakdown": [
            {
                "authority": reg["name"],
                "priority": reg.get("priority", "unknown"),
                "reason": reg.get("reason", ""),
                "key_documents": get_authority_documents(reg["category"])
            }
            for reg in applicable_regs
        ],
        "action_plan": generate_action_plan(compliance_reqs),
        "risk_factors": identify_risk_factors(applicable_regs),
        "recommendations": generate_compliance_recommendations(regulation_analysis)
    }


def identify_key_challenge(applicable_regulations: List[Dict[str, Any]]) -> str:
    """
    Identify the primary compliance challenge
    """
    if len(applicable_regulations) >= 4:
        return "Multi-authority coordination required"
    elif any(reg["category"] == "cea" for reg in applicable_regulations):
        return "Environmental clearance complexity"
    elif any(reg["category"] == "nbro" for reg in applicable_regulations):
        return "Geotechnical investigation requirements"
    elif any(reg["category"] == "uda" for reg in applicable_regulations):
        return "UDA approval process complexity"
    else:
        return "Standard approval process"


def get_authority_documents(category: str) -> List[str]:
    """
    Get key document requirements for an authority category
    """
    return COMPLIANCE_CHECKLISTS.get(category, {}).get("mandatory_documents", [])[:3]


def generate_action_plan(compliance_requirements: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Generate step-by-step action plan for compliance
    """
    return [
        {
            "step": "1",
            "action": "Conduct site survey and prepare preliminary plans",
            "timeline": "1-2 weeks",
            "responsibility": "Qualified surveyor and architect"
        },
        {
            "step": "2", 
            "action": "Prepare and submit applications to primary planning authority",
            "timeline": "2-4 weeks",
            "responsibility": "Architect or planning consultant"
        },
        {
            "step": "3",
            "action": "Obtain required clearances (Environmental, NBRO, etc.)",
            "timeline": "2-6 months",
            "responsibility": "Environmental consultant, geotechnical engineer"
        },
        {
            "step": "4",
            "action": "Finalize building plans and obtain building approval",
            "timeline": "1-3 months", 
            "responsibility": "Architect and structural engineer"
        },
        {
            "step": "5",
            "action": "Obtain construction permits and commence work",
            "timeline": "1-2 weeks",
            "responsibility": "Contractor and project manager"
        }
    ]


def identify_risk_factors(applicable_regulations: List[Dict[str, Any]]) -> List[str]:
    """
    Identify potential risk factors in compliance process
    """
    risks = []
    
    if len(applicable_regulations) >= 3:
        risks.append("Multiple authority coordination may cause delays")
    
    if any(reg["category"] == "cea" for reg in applicable_regulations):
        risks.append("Environmental impact assessment may require public consultation")
    
    if any(reg["category"] == "nbro" for reg in applicable_regulations):
        risks.append("Geotechnical investigation may reveal site limitations")
        
    if any(reg["category"] == "uda" for reg in applicable_regulations):
        risks.append("UDA approval process can be lengthy and detailed")
    
    return risks


def generate_compliance_recommendations(regulation_analysis: Dict[str, Any]) -> List[str]:
    """
    Generate specific compliance recommendations
    """
    recommendations = [
        "Engage qualified professionals (architect, engineer, consultant) early in the process",
        "Conduct preliminary consultations with all relevant authorities before plan submission",
        "Prepare comprehensive documentation to avoid multiple revision cycles",
        "Allow adequate time for approval processes, especially for complex projects"
    ]
    
    applicable_regs = regulation_analysis.get("applicable_regulations", [])
    
    # Add specific recommendations based on applicable regulations
    if any(reg["category"] == "cea" for reg in applicable_regs):
        recommendations.append("Conduct environmental screening early to determine EIA requirements")
    
    if any(reg["category"] == "nbro" for reg in applicable_regs):
        recommendations.append("Commission geotechnical investigation as first priority")
        
    if any(reg["category"] == "uda" for reg in applicable_regs):
        recommendations.append("Review UDA master plan and guidelines thoroughly before design")
    
    return recommendations