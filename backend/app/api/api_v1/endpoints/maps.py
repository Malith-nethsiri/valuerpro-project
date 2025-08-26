"""
Google Maps integration endpoints
"""
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.deps import get_current_active_user
from app.services.google_maps import (
    generate_static_map_url,
    get_directions,
    generate_route_description,
    reverse_geocode,
    find_nearby_places,
    is_google_maps_available
)

router = APIRouter()


class LocationRequest(BaseModel):
    latitude: float
    longitude: float


class StaticMapRequest(LocationRequest):
    zoom: Optional[int] = 15
    width: Optional[int] = 600
    height: Optional[int] = 400
    map_type: Optional[str] = "roadmap"  # roadmap, satellite, hybrid, terrain


class DirectionsRequest(BaseModel):
    origin: str  # Address or "lat,lng"
    destination: str  # Address or "lat,lng"
    mode: Optional[str] = "driving"  # driving, walking, transit, bicycling


class RouteDescriptionRequest(LocationRequest):
    nearest_city: Optional[str] = None


@router.get("/status")
def get_maps_status():
    """Check if Google Maps API is available"""
    return {
        "available": is_google_maps_available(),
        "message": "Google Maps API is configured" if is_google_maps_available() else "Google Maps API key not configured"
    }


@router.post("/static-map", response_model=Dict[str, str])
def generate_property_map(
    request: StaticMapRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Generate static map URL for property location"""
    
    if not is_google_maps_available():
        raise HTTPException(
            status_code=400,
            detail="Google Maps API not configured"
        )
    
    try:
        map_url = generate_static_map_url(
            latitude=request.latitude,
            longitude=request.longitude,
            zoom=request.zoom,
            width=request.width,
            height=request.height,
            map_type=request.map_type
        )
        
        return {
            "map_url": map_url,
            "latitude": str(request.latitude),
            "longitude": str(request.longitude),
            "zoom": str(request.zoom),
            "size": f"{request.width}x{request.height}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate map: {str(e)}"
        )


@router.post("/directions", response_model=Dict[str, Any])
def get_property_directions(
    request: DirectionsRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Get directions to property location"""
    
    if not is_google_maps_available():
        raise HTTPException(
            status_code=400,
            detail="Google Maps API not configured"
        )
    
    try:
        directions_data = get_directions(
            origin=request.origin,
            destination=request.destination,
            mode=request.mode
        )
        
        if "error" in directions_data:
            raise HTTPException(
                status_code=400,
                detail=directions_data["error"]
            )
        
        return directions_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get directions: {str(e)}"
        )


@router.post("/route-description", response_model=Dict[str, Any])
def generate_property_route_description(
    request: RouteDescriptionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Generate narrative route description for property access"""
    
    if not is_google_maps_available():
        # Return a basic description without API
        return {
            "description": f"Property located at coordinates {request.latitude}, {request.longitude}. Route description requires Google Maps API configuration.",
            "distance": None,
            "duration": None,
            "api_available": False
        }
    
    try:
        route_data = generate_route_description(
            property_lat=request.latitude,
            property_lng=request.longitude,
            nearest_city=request.nearest_city
        )
        
        route_data["api_available"] = True
        return route_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate route description: {str(e)}"
        )


@router.post("/reverse-geocode", response_model=Dict[str, Any])
def get_location_address(
    request: LocationRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Get address information from coordinates"""
    
    if not is_google_maps_available():
        raise HTTPException(
            status_code=400,
            detail="Google Maps API not configured"
        )
    
    try:
        address_data = reverse_geocode(
            latitude=request.latitude,
            longitude=request.longitude
        )
        
        if "error" in address_data:
            raise HTTPException(
                status_code=400,
                detail=address_data["error"]
            )
        
        return address_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Reverse geocoding failed: {str(e)}"
        )


@router.get("/nearby-places")
def get_nearby_landmarks(
    lat: float = Query(..., description="Property latitude"),
    lng: float = Query(..., description="Property longitude"),
    place_type: str = Query("point_of_interest", description="Type of places to find"),
    radius: int = Query(2000, description="Search radius in meters"),
    current_user: User = Depends(get_current_active_user)
):
    """Find nearby places of interest (landmarks, schools, etc.)"""
    
    try:
        places_data = find_nearby_places(
            latitude=lat,
            longitude=lng,
            place_type=place_type,
            radius=radius
        )
        
        return places_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to find nearby places: {str(e)}"
        )


@router.post("/property-analysis", response_model=Dict[str, Any])
def analyze_property_location(
    request: LocationRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Comprehensive property location analysis"""
    
    analysis_result = {
        "coordinates": {
            "latitude": request.latitude,
            "longitude": request.longitude
        },
        "maps_available": is_google_maps_available()
    }
    
    if is_google_maps_available():
        try:
            # Get address information
            address_data = reverse_geocode(request.latitude, request.longitude)
            if "error" not in address_data:
                analysis_result["address"] = address_data
            
            # Generate route description
            route_data = generate_route_description(
                property_lat=request.latitude,
                property_lng=request.longitude
            )
            if "error" not in route_data:
                analysis_result["access_route"] = route_data
            
            # Generate static map URL
            map_url = generate_static_map_url(
                latitude=request.latitude,
                longitude=request.longitude,
                zoom=15,
                width=600,
                height=400
            )
            analysis_result["static_map_url"] = map_url
            
        except Exception as e:
            analysis_result["error"] = f"Location analysis failed: {str(e)}"
    else:
        analysis_result["message"] = "Limited analysis - Google Maps API not configured"
    
    return analysis_result