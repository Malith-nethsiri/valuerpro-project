"""
Google Maps integration service for property location mapping and route generation
"""
import os
import requests
from typing import Dict, List, Optional, Tuple, Any
from app.core.config import settings
from app.services.srilanka_admin_divisions import enhance_location_with_admin_divisions

# Google Maps API base URLs
STATIC_MAPS_BASE_URL = "https://maps.googleapis.com/maps/api/staticmap"
DIRECTIONS_BASE_URL = "https://maps.googleapis.com/maps/api/directions/json"
GEOCODING_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
DISTANCE_MATRIX_BASE_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

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
        
        google_maps_data = {
            "formatted_address": result["formatted_address"],
            "components": components,
            "place_id": result.get("place_id")
        }
        
        # Enhance with Sri Lankan administrative divisions
        enhanced_data = enhance_location_with_admin_divisions(
            latitude, longitude, google_maps_data
        )
        
        return enhanced_data
        
    except Exception as e:
        return {"error": f"Reverse geocoding failed: {str(e)}"}

def calculate_distance_matrix(
    origins: List[str],
    destinations: List[str],
    mode: str = "driving",
    units: str = "metric"
) -> Dict[str, Any]:
    """
    Calculate distances and durations between multiple origins and destinations
    
    Args:
        origins: List of origin addresses or coordinates (e.g., ["Colombo", "6.9271,79.8612"])
        destinations: List of destination addresses or coordinates
        mode: Travel mode (driving, walking, transit, bicycling)
        units: Units for distances (metric or imperial)
    
    Returns:
        Distance matrix results with distances and durations
    """
    if not is_google_maps_available():
        return {"error": "Google Maps API key not configured"}
    
    params = {
        'origins': '|'.join(origins),
        'destinations': '|'.join(destinations),
        'mode': mode,
        'units': units,
        'key': settings.GOOGLE_MAPS_API_KEY
    }
    
    try:
        response = requests.get(DISTANCE_MATRIX_BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data["status"] != "OK":
            return {"error": f"Distance Matrix API error: {data.get('error_message', data['status'])}"}
        
        # Process the results into a more usable format
        results = {
            "status": data["status"],
            "origins": data["origin_addresses"],
            "destinations": data["destination_addresses"],
            "distances": []
        }
        
        for i, row in enumerate(data["rows"]):
            origin_results = {
                "origin": data["origin_addresses"][i],
                "destinations": []
            }
            
            for j, element in enumerate(row["elements"]):
                dest_result = {
                    "destination": data["destination_addresses"][j],
                    "status": element["status"]
                }
                
                if element["status"] == "OK":
                    dest_result.update({
                        "distance": {
                            "text": element["distance"]["text"],
                            "value": element["distance"]["value"]  # meters
                        },
                        "duration": {
                            "text": element["duration"]["text"], 
                            "value": element["duration"]["value"]  # seconds
                        }
                    })
                else:
                    dest_result["error"] = element.get("status", "Unknown error")
                
                origin_results["destinations"].append(dest_result)
            
            results["distances"].append(origin_results)
        
        return results
        
    except Exception as e:
        return {"error": f"Distance Matrix API error: {str(e)}"}

def find_nearby_places(
    latitude: float,
    longitude: float,
    place_type: str = "point_of_interest",
    radius: int = 5000
) -> Dict[str, Any]:
    """
    Find nearby places of interest using Google Places API
    
    Args:
        latitude: Property latitude
        longitude: Property longitude
        place_type: Type of places to search for (school, hospital, bank, etc.)
        radius: Search radius in meters (default 5km as per requirements)
    
    Returns:
        Dict containing places data and metadata
    """
    if not is_google_maps_available():
        return {"error": "Google Maps API key not configured"}
    
    params = {
        'location': f"{latitude},{longitude}",
        'radius': radius,
        'type': place_type,
        'key': settings.GOOGLE_MAPS_API_KEY
    }
    
    try:
        response = requests.get(PLACES_BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data["status"] not in ["OK", "ZERO_RESULTS"]:
            return {"error": f"Places API error: {data.get('error_message', data['status'])}"}
        
        # Process the results into a more usable format
        places = []
        for place in data.get("results", []):
            place_info = {
                "name": place.get("name", "Unknown"),
                "vicinity": place.get("vicinity", ""),
                "types": place.get("types", []),
                "rating": place.get("rating"),
                "user_ratings_total": place.get("user_ratings_total"),
                "price_level": place.get("price_level"),
                "place_id": place.get("place_id"),
                "geometry": {
                    "lat": place["geometry"]["location"]["lat"],
                    "lng": place["geometry"]["location"]["lng"]
                }
            }
            
            # Calculate approximate distance using basic formula
            # For more accuracy, would need Distance Matrix API call
            place_lat = place["geometry"]["location"]["lat"]
            place_lng = place["geometry"]["location"]["lng"]
            
            # Simple distance calculation (approximate)
            import math
            lat_diff = math.radians(place_lat - latitude)
            lng_diff = math.radians(place_lng - longitude)
            a = (math.sin(lat_diff / 2) ** 2 + 
                 math.cos(math.radians(latitude)) * math.cos(math.radians(place_lat)) *
                 math.sin(lng_diff / 2) ** 2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance_km = 6371 * c  # Earth's radius in kilometers
            
            place_info["distance_km"] = round(distance_km, 2)
            places.append(place_info)
        
        # Sort by distance
        places.sort(key=lambda x: x["distance_km"])
        
        return {
            "status": data["status"],
            "places": places,
            "search_params": {
                "location": f"{latitude},{longitude}",
                "radius": radius,
                "type": place_type
            }
        }
        
    except Exception as e:
        return {"error": f"Places API error: {str(e)}"}


def find_nearby_amenities(latitude: float, longitude: float, radius: int = 5000) -> Dict[str, Any]:
    """
    Find nearby amenities of different types for property valuation
    
    Args:
        latitude: Property latitude
        longitude: Property longitude
        radius: Search radius in meters
    
    Returns:
        Dict containing categorized amenities
    """
    if not is_google_maps_available():
        return {"error": "Google Maps API key not configured"}
    
    # Define amenity types relevant for property valuation
    amenity_types = {
        "schools": "school",
        "hospitals": "hospital", 
        "banks": "bank",
        "supermarkets": "supermarket",
        "pharmacies": "pharmacy",
        "restaurants": "restaurant",
        "gas_stations": "gas_station",
        "train_stations": "train_station",
        "bus_stations": "bus_station",
        "places_of_worship": "place_of_worship"
    }
    
    results = {
        "status": "OK",
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "amenities": {}
    }
    
    for category, place_type in amenity_types.items():
        try:
            places_data = find_nearby_places(latitude, longitude, place_type, radius)
            
            if "error" in places_data:
                results["amenities"][category] = {
                    "status": "error",
                    "error": places_data["error"],
                    "places": []
                }
            else:
                # Get top 5 closest places for each category
                top_places = places_data.get("places", [])[:5]
                results["amenities"][category] = {
                    "status": places_data.get("status", "OK"),
                    "count": len(top_places),
                    "places": top_places
                }
        except Exception as e:
            results["amenities"][category] = {
                "status": "error", 
                "error": str(e),
                "places": []
            }
    
    return results