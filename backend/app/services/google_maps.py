"""
Google Maps integration service for property location mapping and route generation
"""
import os
import requests
from typing import Dict, List, Optional, Tuple, Any
from app.core.config import settings

# Google Maps API base URLs
STATIC_MAPS_BASE_URL = "https://maps.googleapis.com/maps/api/staticmap"
DIRECTIONS_BASE_URL = "https://maps.googleapis.com/maps/api/directions/json"
GEOCODING_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

def is_google_maps_available() -> bool:
    """Check if Google Maps API key is available"""
    return bool(settings.GOOGLE_MAPS_API_KEY)

def generate_static_map_url(
    latitude: float,
    longitude: float,
    zoom: int = 15,
    width: int = 600,
    height: int = 400,
    map_type: str = "roadmap",
    markers: Optional[List[Dict]] = None
) -> str:
    """
    Generate Google Maps Static API URL for property location
    
    Args:
        latitude: Property latitude
        longitude: Property longitude
        zoom: Map zoom level (1-20)
        width: Image width in pixels
        height: Image height in pixels
        map_type: Map type (roadmap, satellite, hybrid, terrain)
        markers: Optional list of additional markers
    
    Returns:
        Static map image URL
    """
    if not is_google_maps_available():
        return ""
    
    # Base parameters
    params = {
        'center': f"{latitude},{longitude}",
        'zoom': zoom,
        'size': f"{width}x{height}",
        'maptype': map_type,
        'key': settings.GOOGLE_MAPS_API_KEY
    }
    
    # Add property marker
    property_marker = f"color:red|size:mid|{latitude},{longitude}"
    
    # Add additional markers if provided
    all_markers = [property_marker]
    if markers:
        for marker in markers:
            marker_str = f"color:{marker.get('color', 'blue')}|size:{marker.get('size', 'mid')}|{marker['lat']},{marker['lng']}"
            all_markers.append(marker_str)
    
    params['markers'] = '|'.join(all_markers)
    
    # Build URL
    url_params = '&'.join([f"{k}={v}" for k, v in params.items()])
    return f"{STATIC_MAPS_BASE_URL}?{url_params}"

def get_directions(
    origin: str,
    destination: str,
    mode: str = "driving"
) -> Dict[str, Any]:
    """
    Get directions from origin to destination using Google Directions API
    
    Args:
        origin: Starting location (address or "lat,lng")
        destination: Destination location (address or "lat,lng")  
        mode: Travel mode (driving, walking, transit, bicycling)
    
    Returns:
        Directions response data
    """
    if not is_google_maps_available():
        return {"error": "Google Maps API key not configured"}
    
    params = {
        'origin': origin,
        'destination': destination,
        'mode': mode,
        'key': settings.GOOGLE_MAPS_API_KEY
    }
    
    try:
        response = requests.get(DIRECTIONS_BASE_URL, params=params)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": f"Directions API error: {str(e)}"}

def generate_route_description(
    property_lat: float,
    property_lng: float,
    nearest_city: str = None
) -> Dict[str, Any]:
    """
    Generate a narrative route description to the property
    
    Args:
        property_lat: Property latitude
        property_lng: Property longitude
        nearest_city: Optional nearest major city/town
    
    Returns:
        Dict with route description and details
    """
    if not is_google_maps_available():
        return {
            "description": "Route description unavailable - Google Maps API not configured",
            "distance": None,
            "duration": None,
            "error": "API not available"
        }
    
    # If no nearest city provided, use a default based on coordinates
    if not nearest_city:
        if 6.8 < property_lat < 7.0 and 79.8 < property_lng < 80.0:
            nearest_city = "Colombo"
        elif 7.2 < property_lat < 7.4 and 80.5 < property_lng < 80.8:
            nearest_city = "Kandy"
        else:
            nearest_city = "Colombo"  # Default fallback
    
    property_location = f"{property_lat},{property_lng}"
    
    try:
        # Get directions from nearest city to property
        directions_data = get_directions(nearest_city, property_location)
        
        if "error" in directions_data:
            return directions_data
        
        if not directions_data.get("routes"):
            return {"error": "No routes found"}
        
        route = directions_data["routes"][0]
        leg = route["legs"][0]
        
        # Extract key information
        distance = leg["distance"]["text"]
        duration = leg["duration"]["text"]
        steps = leg["steps"]
        
        # Generate narrative description
        description_parts = [
            f"The property is located approximately {distance} from {nearest_city} (about {duration} by car)."
        ]
        
        # Add key directions
        if len(steps) > 0:
            description_parts.append("Access route:")
            
            # Get main roads from the first few steps
            main_roads = []
            for step in steps[:5]:  # First 5 steps to avoid too much detail
                instruction = step.get("html_instructions", "")
                if instruction:
                    # Clean HTML tags
                    import re
                    clean_instruction = re.sub(r'<[^>]+>', '', instruction)
                    if len(clean_instruction) < 100:  # Avoid very long instructions
                        main_roads.append(clean_instruction)
            
            if main_roads:
                description_parts.extend(main_roads[:3])  # Max 3 key instructions
        
        final_description = " ".join(description_parts)
        
        return {
            "description": final_description,
            "distance": distance,
            "duration": duration,
            "start_address": leg["start_address"],
            "end_address": leg["end_address"],
            "main_roads": [step.get("html_instructions", "") for step in steps[:3]]
        }
        
    except Exception as e:
        return {"error": f"Route generation failed: {str(e)}"}

def reverse_geocode(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Get address information from coordinates using reverse geocoding
    
    Args:
        latitude: Property latitude
        longitude: Property longitude
    
    Returns:
        Address information and location details
    """
    if not is_google_maps_available():
        return {"error": "Google Maps API key not configured"}
    
    params = {
        'latlng': f"{latitude},{longitude}",
        'key': settings.GOOGLE_MAPS_API_KEY
    }
    
    try:
        response = requests.get(GEOCODING_BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data["status"] != "OK" or not data.get("results"):
            return {"error": "No address found for coordinates"}
        
        result = data["results"][0]
        
        # Extract address components
        components = {}
        for component in result.get("address_components", []):
            types = component.get("types", [])
            if "administrative_area_level_1" in types:
                components["province"] = component["long_name"]
            elif "administrative_area_level_2" in types:
                components["district"] = component["long_name"]
            elif "locality" in types:
                components["city"] = component["long_name"]
            elif "sublocality" in types:
                components["area"] = component["long_name"]
            elif "country" in types:
                components["country"] = component["long_name"]
        
        return {
            "formatted_address": result["formatted_address"],
            "components": components,
            "place_id": result.get("place_id")
        }
        
    except Exception as e:
        return {"error": f"Reverse geocoding failed: {str(e)}"}

def find_nearby_places(
    latitude: float,
    longitude: float,
    place_type: str = "point_of_interest",
    radius: int = 2000
) -> Dict[str, Any]:
    """
    Find nearby places of interest (landmarks, schools, etc.)
    Note: This requires Places API which may need separate billing
    
    Args:
        latitude: Property latitude
        longitude: Property longitude
        place_type: Type of places to search for
        radius: Search radius in meters
    
    Returns:
        List of nearby places
    """
    # This is a placeholder for Places API integration
    # Places API requires separate billing setup
    return {
        "places": [],
        "note": "Places API integration pending - requires separate Google Cloud billing setup"
    }