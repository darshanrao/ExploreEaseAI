from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import date

from backend.services.run_agents import AgentRunner
from backend.services.places_service import PlacesService

router = APIRouter()
agent_runner = AgentRunner()
places_service = PlacesService()

class Recommendation(BaseModel):
    id: int
    title: str
    description: str
    location: str
    image_url: Optional[str] = None
    rating: Optional[float] = None
    price_level: Optional[str] = None
    category: str

@router.get("/recommendations")
async def get_recommendations():
    """Get travel recommendations based on user preferences"""
    # This will be integrated with your agents to generate recommendations
    return {"recommendations": []}

@router.post("/recommendations/generate")
async def generate_recommendations(location: str = Body(..., embed=True)):
    """Generate recommendations for a specific location"""
    try:
        # Use the AgentRunner to generate recommendations
        recommendations = await agent_runner.generate_recommendations(location)
        
        # Transform the recommendations to match the expected format from Express
        formatted_recommendations = []
        
        for i, rec in enumerate(recommendations):
            # Map from FastAPI format to Express format
            formatted_rec = {
                "id": rec.get("id", i + 1),
                "name": rec.get("title", f"Recommendation {i+1}"),
                "type": rec.get("category", "Attraction").capitalize(),
                "day": (i // 3) + 1,  # Distribute across days: 3 items per day
                "timeOfDay": ["morning", "afternoon", "evening"][i % 3],  # Cycle through time slots
                "rating": str(rec.get("rating", 4.5)),
                "reviewCount": int(rec.get("review_count", 1000)),
                "distance": rec.get("location", location),
                "openingHours": rec.get("hours", "9:00 AM - 5:00 PM"),
                "description": rec.get("description", f"Visit this popular attraction in {location}.")
            }
            
            formatted_recommendations.append(formatted_rec)
        
        # If we have less than 6 recommendations, add some generic ones to make up the numbers
        if len(formatted_recommendations) < 6:
            default_categories = ["Museum", "Restaurant", "Park", "Shopping", "Historical", "Entertainment"]
            default_times = ["morning", "afternoon", "evening", "morning", "afternoon", "evening"]
            
            for i in range(len(formatted_recommendations), 6):
                day = (i // 3) + 1
                time_of_day = default_times[i % 3]
                category = default_categories[i % len(default_categories)]
                
                formatted_recommendations.append({
                    "id": i + 1,
                    "name": f"{location} {category}",
                    "type": category,
                    "day": day,
                    "timeOfDay": time_of_day,
                    "rating": "4.5",
                    "reviewCount": 500 + (i * 100),
                    "distance": "City Center",
                    "openingHours": "9:00 AM - 5:00 PM",
                    "description": f"Explore the {category.lower()} options in {location}. Great for {time_of_day} activities during your trip."
                })
        
        return {"recommendations": formatted_recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

@router.post("/places-by-interests")
async def get_places_by_interests(
    location: str = Body(...),
    interests: List[str] = Body(...)
):
    """
    Get real places for a specific location based on selected interests using Google Places API
    
    Args:
        location: City or place name (e.g., "Mumbai")
        interests: List of interests (e.g., ["Food", "Nature", "Shopping"])
    """
    try:
        print(f"FastAPI received request for {location} with interests: {interests}")
        
        # Use the PlacesService to get real place recommendations
        recommendations = await places_service.get_recommendations_by_interests(location, interests)
        
        print(f"PlacesService returned {len(recommendations)} recommendations")
        
        # Return recommendations in the expected format
        response = {"recommendations": recommendations}
        print(f"Sending response with {len(response['recommendations'])} recommendations")
        
        return response
    except Exception as e:
        print(f"Error in get_places_by_interests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching places: {str(e)}")