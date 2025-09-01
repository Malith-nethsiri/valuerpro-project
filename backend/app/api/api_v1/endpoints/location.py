"""
Enhanced location endpoints with Sri Lankan administrative divisions support
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.db import get_db
from app.services.google_maps import reverse_geocode, is_google_maps_available
from app.services.srilanka_admin_divisions import (
    SriLankaAdminDivisions, 
    enhance_location_with_admin_divisions
)

router = APIRouter()


class LocationRequest(BaseModel):
    latitude: float
    longitude: float


class LocationResponse(BaseModel):
    coordinates: Dict[str, float]
    enhanced_location: Dict[str, Any]
    sri_lanka_admin: Dict[str, Any]
    google_maps_data: Dict[str, Any]
    status: str
    confidence: str


@router.post("/reverse-geocode", response_model=Dict[str, Any])
async def enhanced_reverse_geocode(
    request: LocationRequest,
    db: Session = Depends(get_db)
):
    """
    Enhanced reverse geocoding with Sri Lankan administrative divisions
    
    Provides comprehensive location information including:
    - Google Maps reverse geocoding (if available)
    - Sri Lankan administrative divisions (Province, District, DS, GN)
    - Enhanced location data combining both sources
    
    Args:
        request: LocationRequest with latitude and longitude
        
    Returns:
        Enhanced location information
    """
    try:
        latitude = request.latitude
        longitude = request.longitude
        
        # Validate coordinates are within Sri Lanka bounds
        if not (5.9 <= latitude <= 9.9 and 79.6 <= longitude <= 82.0):
            raise HTTPException(
                status_code=400, 
                detail="Coordinates appear to be outside Sri Lanka bounds"
            )
        
        # Get Google Maps data if available
        google_maps_data = {}
        if is_google_maps_available():
            google_result = reverse_geocode(latitude, longitude)
            if "error" not in google_result:
                google_maps_data = google_result.get('google_maps_data', {})
        
        # Always get Sri Lankan administrative divisions
        enhanced_data = enhance_location_with_admin_divisions(
            latitude, longitude, google_maps_data
        )
        
        return {
            "status": "success",
            "data": enhanced_data,
            "message": "Location resolved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Location resolution failed: {str(e)}"
        )


@router.get("/admin-divisions/districts")
async def get_all_districts():
    """
    Get all available districts in Sri Lanka
    
    Returns:
        List of all districts with their DS divisions
    """
    try:
        districts_info = {}
        
        for district, data in SriLankaAdminDivisions.DISTRICT_BOUNDARIES.items():
            districts_info[district] = {
                'province': SriLankaAdminDivisions._get_province_for_district(district),
                'ds_divisions': data['ds_divisions'],
                'coordinate_bounds': {
                    'lat_range': data['lat_range'],
                    'lng_range': data['lng_range']
                }
            }
        
        return {
            "status": "success",
            "data": {
                "districts": districts_info,
                "total_districts": len(districts_info)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve district information: {str(e)}"
        )


@router.get("/admin-divisions/ds-divisions/{district}")
async def get_ds_divisions_for_district(district: str):
    """
    Get DS (Divisional Secretariat) divisions for a specific district
    
    Args:
        district: District name
        
    Returns:
        List of DS divisions for the district
    """
    try:
        ds_divisions = SriLankaAdminDivisions.get_ds_divisions_for_district(district)
        
        if not ds_divisions:
            raise HTTPException(
                status_code=404,
                detail=f"District '{district}' not found or no DS divisions available"
            )
        
        return {
            "status": "success",
            "data": {
                "district": district,
                "province": SriLankaAdminDivisions._get_province_for_district(district),
                "ds_divisions": ds_divisions,
                "total_divisions": len(ds_divisions)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve DS divisions: {str(e)}"
        )


@router.get("/admin-divisions/gn-divisions/{ds_division}")
async def get_sample_gn_divisions(ds_division: str):
    """
    Get sample GN (Grama Niladhari) divisions for a DS division
    
    Args:
        ds_division: DS division name
        
    Returns:
        List of sample GN divisions
    """
    try:
        gn_divisions = SriLankaAdminDivisions.get_sample_gn_divisions(ds_division)
        
        return {
            "status": "success",
            "data": {
                "ds_division": ds_division,
                "gn_divisions": gn_divisions,
                "total_divisions": len(gn_divisions),
                "note": "This is a sample list. In production, this would include all GN divisions."
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve GN divisions: {str(e)}"
        )


@router.post("/admin-divisions/estimate")
async def estimate_admin_divisions(request: LocationRequest):
    """
    Estimate administrative divisions based on coordinates
    
    Args:
        request: LocationRequest with latitude and longitude
        
    Returns:
        Estimated administrative divisions
    """
    try:
        latitude = request.latitude
        longitude = request.longitude
        
        # Validate coordinates are within Sri Lanka bounds
        if not (5.9 <= latitude <= 9.9 and 79.6 <= longitude <= 82.0):
            raise HTTPException(
                status_code=400, 
                detail="Coordinates appear to be outside Sri Lanka bounds"
            )
        
        admin_info = SriLankaAdminDivisions.get_comprehensive_admin_info(
            latitude, longitude
        )
        
        return {
            "status": "success",
            "data": admin_info,
            "message": "Administrative divisions estimated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Administrative division estimation failed: {str(e)}"
        )


@router.get("/admin-divisions/search")
async def search_locations(
    query: str,
    limit: Optional[int] = 10
):
    """
    Search for locations within Sri Lankan administrative divisions
    
    Args:
        query: Search query (district, DS division, or GN division name)
        limit: Maximum number of results to return
        
    Returns:
        Matching locations
    """
    try:
        results = []
        query_lower = query.lower()
        
        # Search districts
        for district in SriLankaAdminDivisions.DISTRICT_BOUNDARIES.keys():
            if query_lower in district.lower():
                results.append({
                    'type': 'district',
                    'name': district,
                    'province': SriLankaAdminDivisions._get_province_for_district(district),
                    'full_name': f"{district} District"
                })
        
        # Search DS divisions
        for district, data in SriLankaAdminDivisions.DISTRICT_BOUNDARIES.items():
            for ds_div in data['ds_divisions']:
                if query_lower in ds_div.lower():
                    results.append({
                        'type': 'ds_division',
                        'name': ds_div,
                        'district': district,
                        'province': SriLankaAdminDivisions._get_province_for_district(district),
                        'full_name': f"{ds_div} DS Division, {district}"
                    })
        
        # Search GN divisions
        for ds_div, gn_list in SriLankaAdminDivisions.SAMPLE_GN_DIVISIONS.items():
            for gn_div in gn_list:
                if query_lower in gn_div.lower():
                    # Find district for this DS division
                    district = None
                    for dist, dist_data in SriLankaAdminDivisions.DISTRICT_BOUNDARIES.items():
                        if ds_div in dist_data['ds_divisions']:
                            district = dist
                            break
                    
                    results.append({
                        'type': 'gn_division',
                        'name': gn_div,
                        'ds_division': ds_div,
                        'district': district,
                        'province': SriLankaAdminDivisions._get_province_for_district(district),
                        'full_name': f"{gn_div} GN Division, {ds_div}"
                    })
        
        # Limit results
        results = results[:limit]
        
        return {
            "status": "success",
            "data": {
                "query": query,
                "results": results,
                "total_found": len(results),
                "limited_to": limit
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Location search failed: {str(e)}"
        )