import os
import requests
import time
import json
import logging

from datetime import datetime, timedelta
import googlemaps
from geopy.geocoders  import Nominatim
from uagents import Agent, Context, Protocol
from uagents.crypto import Identity

from dotenv import load_dotenv
# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_restaurants(latitude, longitude, radius=1000, meal_type="lunch", min_price=0, max_price=4, keyword=None):
    """
    Find restaurants for lunch or dinner
    
    Parameters:
    - latitude: float - Latitude coordinate
    - longitude: float - Longitude coordinate
    - radius: int - Search radius in meters (default: 1000)
    - meal_type: str - Type of meal ("lunch" or "dinner") (default: "lunch")
    - min_price: int - Minimum price level (0-4, where 0 is free and 4 is expensive) (default: 0)
    - max_price: int - Maximum price level (0-4, where 0 is free and 4 is expensive) (default: 4)
    - keyword: str - Specific keyword to search for (default: None)
    
    Returns:
    - list of restaurant results
    """
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "type": "restaurant",
        "minprice": min_price,
        "maxprice": max_price,
        "key": os.environ.get("GOOGLE_PLACES_API_KEY")
    }
    
    # # Add keyword parameter if provided
     
    if keyword:
        params["keyword"] = keyword
    
    response = requests.get(url, params=params)
    return response.json()['results']

def get_city_attractions(city_lat, city_lng, city_name="the city", radius=25000, attractions_keywords=None, sort_by="reviews"):
    """
    Find tourist attractions at the city level
    
    Parameters:
    - city_lat: float - City center latitude coordinate
    - city_lng: float - City center longitude coordinate
    - city_name: str - Name of the city (for logging)
    - radius: int - Search radius in meters (default: 25000, max 50000)
    - attractions_keywords: list - List of attraction keywords to search for (default: None)
    - sort_by: str - Sort results by "rating", "reviews", or "prominence" (default: "reviews")
    
    Returns:
    - list of attraction results sorted by the specified criteria
    """
    # Ensure radius doesn't exceed API limits
    if radius > 50000:
        print(f"Warning: Radius reduced from {radius}m to 50000m (API maximum)")
        radius = 50000
    
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    
    # Base parameters
    base_params = {
        "location": f"{city_lat},{city_lng}",
        "radius": radius,
        "key": os.environ.get("GOOGLE_PLACES_API_KEY")
    }
    
    results = []
    
    # Optimized list of place types for tourist attractions
    place_types = [
        "tourist_attraction",
        "museum",
        "aquarium",
        "art_gallery",
        "zoo",
        "landmark",
        "park"
    ]
    
    print(f"Searching for attractions in {city_name} (radius: {radius/1000:.1f}km)...")
    
    # If attraction keywords are provided, make separate requests for each keyword
    if attractions_keywords and isinstance(attractions_keywords, list) and len(attractions_keywords) > 0:
        for keyword in attractions_keywords:
            for place_type in place_types:
                keyword_params = base_params.copy()
                keyword_params["type"] = place_type
                keyword_params["keyword"] = keyword
                
                response = requests.get(url, params=keyword_params)
                result_data = response.json()
                
                if result_data.get('status') == "OK" and result_data.get('results'):
                    print(f"Found {len(result_data.get('results'))} results for '{place_type}' with keyword '{keyword}'")
                    results.extend(result_data.get('results'))
    else:
        # If no keywords, try each place type
        for place_type in place_types:
            type_params = base_params.copy()
            type_params["type"] = place_type
            
            response = requests.get(url, params=type_params)
            result_data = response.json()
            
            if result_data.get('status') == "OK" and result_data.get('results'):
                print(f"Found {len(result_data.get('results'))} results for '{place_type}'")
                results.extend(result_data.get('results'))
    
    # Remove duplicates based on place_id
    unique_results = {}
    for item in results:
        if 'place_id' in item:
            unique_results[item['place_id']] = item
    
    results = list(unique_results.values())
    
    # Sort results based on the specified criteria
    if sort_by == "rating":
        # Sort by rating (highest first), handling places with no rating
        results.sort(key=lambda x: (x.get('rating', 0) or 0, x.get('user_ratings_total', 0) or 0), reverse=True)
    elif sort_by == "reviews":
        # Sort by number of reviews (highest first)
        results.sort(key=lambda x: x.get('user_ratings_total', 0) or 0, reverse=True)
    
    print(f"Total unique attractions found in {city_name}: {len(results)}")
    return results

from datetime import datetime, timedelta


googlemaps_api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
# Initialize Google Maps client
gmaps = googlemaps.Client(key=os.environ.get("GOOGLE_PLACES_API_KEY"))

# # Initialize geocoder
# geocoder = Nominatim(user_agent="map_agent")

# def geocode_location(location_name):
#     """Convert a location name to latitude and longitude coordinates"""
#     try:
#         location = geocoder.geocode(location_name)
#         if location:
#             return location.latitude, location.longitude
#         else:
#             logger.error(f"Could not geocode location: {location_name}")
#             return None, None
#     except Exception as e:
#         logger.error(f"Error geocoding location {location_name}: {e}")
#         return None, None


def geocode_location(location_name):
    """Convert a location name to latitude and longitude coordinates"""
    # Check cache first to avoid redundant API calls
    if hasattr(geocode_location, 'cache') and location_name in geocode_location.cache:
        return geocode_location.cache[location_name]
    
    # Initialize cache if it doesn't exist
    if not hasattr(geocode_location, 'cache'):
        geocode_location.cache = {}
    
    # Replace with your actual Google Maps API key
    api_key = googlemaps_api_key
    base_url = "https://maps.googleapis.com/maps/api/geocode/json"
    
    try:
        # Prepare request parameters
        params = {
            'address': location_name,
            'key': api_key
        }
        
        # Make the request
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        
        # Parse the response
        data = response.json()
        
        # Check status
        if data['status'] != 'OK':
            logger.error(f"Could not geocode location: {location_name}, status: {data['status']}")
            if 'error_message' in data:
                logger.error(f"Error message: {data['error_message']}")
            return None, None
        
        # Extract coordinates from the first result
        if data['results']:
            location = data['results'][0]['geometry']['location']
            result = (location['lat'], location['lng'])
            
            # Cache the result
            geocode_location.cache[location_name] = result
            return result
        else:
            logger.error(f"Could not geocode location: {location_name}")
            return None, None
            
    except Exception as e:
        logger.error(f"Error geocoding location {location_name}: {e}")
        return None, None


def calculate_travel_time(origin, destination):
    """Calculate travel time between two locations"""
    try:
        directions = gmaps.directions(origin, destination, mode="driving")
        if directions and len(directions) > 0:
            leg = directions[0]['legs'][0]
            return leg['duration']['value']  # Travel time in seconds
        return 1800  # Default 30 minutes if calculation fails
    except Exception as e:
        logger.error(f"Error calculating travel time: {e}")
        return 1800  # Default 30 minutes


def get_place_photo_url(photo_reference, max_width=400):
    """
    Generate a Google Places photo URL from a photo reference
    
    Args:
        photo_reference (str): The photo reference string from Google Places API
        max_width (int): Maximum width of the image in pixels
        
    Returns:
        str: URL to the Google Places photo
    """
    if not photo_reference:
        return None
        
    api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
    if not api_key:
        logger.error("GOOGLE_PLACES_API_KEY environment variable not set")
        return None
        
    return f"https://maps.googleapis.com/maps/api/place/photo?maxwidth={max_width}&photoreference={photo_reference}&key={api_key}"