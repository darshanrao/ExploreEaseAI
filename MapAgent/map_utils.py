import os
import requests
import time
import json
import logging

from dotenv import load_dotenv
# Load environment variables from .env file
load_dotenv()


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
    # import pdb; pdb.set_trace()
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

def search_eventbrite_events(latitude, longitude, radius=10, event_type=None, 
                             min_price=None, max_price=None, start_date=None, 
                             end_date=None, keyword=None, sort_by="date"):
    """
    Search for events on Eventbrite based on location and preferences
    
    Parameters:
    - latitude: float - Latitude coordinate
    - longitude: float - Longitude coordinate
    - radius: int - Search radius in miles (default: 10)
    - event_type: str - Category ID for the type of event (e.g., "103" for music)
    - min_price: str - Price filter ("free" or "paid")
    - max_price: float - Not directly supported by API, filtered in code
    - start_date: str - Start date in ISO format (default: today)
    - end_date: str - End date in ISO format (default: 3 months from today)
    - keyword: str - Search term to filter events by name or description
    - sort_by: str - How to sort results ("date", "best", "distance")
    
    Returns:
    - list of event results
    """
    # Set up API endpoint
    url = "https://www.eventbriteapi.com/v3/events/search/"
    
    # Set up default dates if not provided
    if not start_date:
        start_date = datetime.now().isoformat()
    if not end_date:
        end_date = (datetime.now() + timedelta(days=90)).isoformat()
    
    # Set up parameters
    params = {
        "location.latitude": latitude,
        "location.longitude": longitude,
        "location.within": f"{radius}mi",
        "start_date.range_start": start_date,
        "start_date.range_end": end_date,
        "sort_by": sort_by
    }
    
    # Add optional parameters if provided
    if event_type:
        params["categories"] = event_type
    
    if keyword:
        params["q"] = keyword
    
    # Add price filter
    if min_price is not None:
        params["price"] = min_price  # "free" or "paid"
    
    # Set up headers with authentication
    headers = {
        "Authorization": f"Bearer {os.environ.get('EVENTBRITE_API_KEY')}"
    }
    
    try:
        # Make the API request
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        # Get the events from the response
        data = response.json()
        events = data.get('events', [])
        
        # Filter by max_price if specified (since API doesn't support this directly)
        if max_price is not None:
            filtered_events = []
            for event in events:
                # Check if event is free
                if event.get('is_free', False):
                    filtered_events.append(event)
                else:
                    # Try to get ticket information
                    ticket_info = event.get('ticket_availability', {})
                    min_ticket_price = ticket_info.get('minimum_ticket_price', {}).get('value', 0)
                    
                    # Add event if price is within range
                    if min_ticket_price <= max_price:
                        filtered_events.append(event)
            return filtered_events
        
        return events
    
    except requests.exceptions.RequestException as e:
        print(f"Error searching Eventbrite events: {e}")
        return []




    