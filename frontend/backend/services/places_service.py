import os
import httpx
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PlacesService:
    """Service for interacting with Google Places API to get real location data"""
    
    def __init__(self):
        # Use the provided API key
        self.api_key = os.getenv("GOOGLE_PLACES_API_KEY", "AIzaSyCoFgQ_ksGBzDe3KGAQpRGCCjiuRhX7R-4")
        self.base_url = "https://maps.googleapis.com/maps/api/place"
        
    async def search_places(self, query: str, type_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        Search for places using the Google Places API Text Search endpoint
        
        Args:
            query: The search query (e.g., "restaurants in Mumbai")
            type_filter: Optional type of place to filter by (e.g., "restaurant", "museum")
            
        Returns:
            API response with search results
        """
        url = f"{self.base_url}/textsearch/json"
        params = {
            "query": query,
            "key": self.api_key
        }
        
        if type_filter:
            params["type"] = type_filter
            
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            return response.json()
    
    async def get_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific place
        
        Args:
            place_id: The Google Places ID
            
        Returns:
            Detailed information about the place
        """
        url = f"{self.base_url}/details/json"
        params = {
            "place_id": place_id,
            "fields": "name,formatted_address,formatted_phone_number,geometry,photo,rating,review,url,website,price_level,opening_hours,editorial_summary",
            "key": self.api_key
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            return response.json()
    
    async def get_place_photo(self, photo_reference: str, max_width: int = 400) -> str:
        """
        Get the URL for a place photo
        
        Args:
            photo_reference: The photo reference from the Places API
            max_width: Maximum width of the photo
            
        Returns:
            URL to the photo
        """
        return f"{self.base_url}/photo?maxwidth={max_width}&photoreference={photo_reference}&key={self.api_key}"
    
    async def get_recommendations_by_interests(self, location: str, interests: List[str]) -> List[Dict[str, Any]]:
        """
        Get recommendations based on location and user interests
        
        Args:
            location: The city/location to search in
            interests: List of user interests (e.g., ["Food", "Nature", "Shopping"])
            
        Returns:
            List of recommendations formatted for the app
        """
        recommendations = []
        interest_type_mapping = {
            "Food": "restaurant",
            "Museums": "museum",
            "History": "tourist_attraction",
            "Art": "art_gallery",
            "Nature": "park",
            "Shopping": "shopping_mall",
            "Nightlife": "night_club",
            "Architecture": "point_of_interest",
            "Sports": "stadium",
        }
        
        # Process each interest
        for interest in interests:
            interest_type = interest_type_mapping.get(interest, None)
            query = f"{interest} in {location}"
            
            results = await self.search_places(query, interest_type)
            
            if "results" in results and results["results"]:
                # Take the top 3 results for each interest
                top_results = results["results"][:3]
                
                for place in top_results:
                    # Create recommendation object
                    recommendation = {
                        "id": len(recommendations) + 1,  # Generate a unique ID
                        "title": place["name"],
                        "description": place.get("vicinity", "") or f"A popular {interest.lower()} destination in {location}",
                        "location": place.get("formatted_address", location),
                        "rating": place.get("rating", None),
                        "category": interest,
                        "price_level": "Free" if "price_level" not in place else "$" * place["price_level"],
                    }
                    
                    # Add image URL if available
                    if "photos" in place and place["photos"]:
                        photo_reference = place["photos"][0]["photo_reference"]
                        recommendation["image_url"] = await self.get_place_photo(photo_reference)
                    
                    recommendations.append(recommendation)
        
        return recommendations