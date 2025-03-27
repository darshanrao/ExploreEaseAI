def debug_attractions_search(latitude, longitude, radius=5000):
    """Simple debug function to test attraction search"""
    import os
    import requests
    import json
    from dotenv import load_dotenv
    # Load environment variables from .env file
    load_dotenv()

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    
    # Test different place types
    place_types = ["tourist_attraction", "museum", "landmark", "point_of_interest"]
    
    for place_type in place_types:
        params = {
            "location": f"{latitude},{longitude}",
            "radius": radius,
            "type": place_type,
            "key": api_key
        }
        
        response = requests.get(url, params=params)
        result = response.json()
        
        print(f"\nType: {place_type}")
        print(f"Status: {result.get('status')}")
        print(f"Results count: {len(result.get('results', []))}")
        
        if result.get('results'):
            for i, place in enumerate(result.get('results')[:5]):
                print(f"{i+1}. {place.get('name')} - Rating: {place.get('rating')}")
        
        if result.get('status') != "OK":
            print(f"Error message: {result.get('error_message', 'No error message')}")
    
    # Try with a specific keyword
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "keyword": "hollywood",
        "key": api_key
    }
    
    response = requests.get(url, params=params)
    result = response.json()
    
    print("\nKeyword: hollywood")
    print(f"Status: {result.get('status')}")
    print(f"Results count: {len(result.get('results', []))}")
    
    if result.get('results'):
        for i, place in enumerate(result.get('results')[:5]):
            print(f"{i+1}. {place.get('name')} - Rating: {place.get('rating')}")

# Test with LA coordinates
la_lat = 34.0522
la_lng = -118.2437
debug_attractions_search(la_lat, la_lng)