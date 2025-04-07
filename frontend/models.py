from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

class ItineraryPoint(BaseModel):
    """A single point in an itinerary"""
    type: str = Field(..., description="Type of itinerary point (start, attraction, food, etc.)")
    time: str = Field(..., description="Start time in ISO format")
    end_time: Optional[str] = Field(None, description="End time in ISO format")
    location: str = Field(..., description="Name of the location")
    coordinates: Dict[str, float] = Field(..., description="Lat/lng coordinates")
    description: str = Field(..., description="Description of the activity or location")
    rating: Optional[float] = Field(None, description="Rating of the place (if available)")
    
class TravelPreferences(BaseModel):
    """User travel preferences"""
    travel_style: str
    food_preference: str
    budget: str
    transport_mode: str
    time_preference: str
    activity_intensity: str
    interests: List[str]
    custom_preferences: Optional[str] = None
    
class TravelRequest(BaseModel):
    """Travel request input from user"""
    prompt: str
    preferences: TravelPreferences
    date_from: str
    date_to: str
    location: str
    
class TravelRequestResponse(BaseModel):
    """Response when submitting a travel request"""
    request_id: str
    status: str = "pending"
    
class TravelRequestStatus(BaseModel):
    """Status of a travel request"""
    request_id: str
    status: str
    progress: float
    message: Optional[str] = None
    error: Optional[str] = None
    
class Itinerary(BaseModel):
    """Complete travel itinerary"""
    location: str
    date_from: str
    date_to: str
    points: List[ItineraryPoint]