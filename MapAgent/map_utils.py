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


# Eiffel Tower coordinates
lat = 48.8584
lng = 2.2945

# # Sample usage based on the provided format
# lunch_params = ["local cuisine restaurant", 1, 4]

# # Using the function with the sample parameters
# lunch_restaurants = get_restaurants(
#     latitude=eiffel_tower_lat,
#     longitude=eiffel_tower_lng,
#     radius=1000,  # 1km radius
#     meal_type="lunch",
#     min_price=lunch_params[1],  # 20
#     max_price=lunch_params[2],  # 50
#     keyword=lunch_params[0]  # "local cuisine restaurant"
# )

# # Example of processing the results
# for restaurant in lunch_restaurants[:5]:  # Display first 5 results
#     print(f"Name: {restaurant['name']}")
#     print(f"Rating: {restaurant.get('rating', 'N/A')}")
#     print(f"Address: {restaurant.get('vicinity', 'N/A')}")
#     print("---")
    
# # Eiffel Tower coordinates
# lat = 35.6764
# lng = 139.6500
# Sample attraction parameters
attraction_params = [
    ["cultural", "general"],
    50,
    150
]

# Using the function with the sample parameters
attractions = get_city_attractions(
    city_lat=35.6764,
    city_lng=139.6500,
    radius=20000,
    attractions_keywords=["cultural event", "food festival"],
    # min_price=3,  # Using 0-4 scale instead of 50
    # max_price=4   # Using 0-4 scale instead of 150
    
)

# Example of processing the results
for attraction in attractions[:5]:  # Display first 5 results
    print(f"Name: {attraction['name']}")
    print(f"Rating: {attraction.get('rating', 'N/A')}")
    print(f"Address: {attraction.get('vicinity', 'N/A')}")
    print("---")
with open("attractions.json", "w") as f:
    json.dump(attractions, f, indent=4)