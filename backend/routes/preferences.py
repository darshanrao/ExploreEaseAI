from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import date

router = APIRouter()

class TravelPreferences(BaseModel):
    destination: str
    start_date: date
    end_date: date
    interests: List[str]
    budget: str
    accommodation_type: Optional[str] = None
    transportation_type: Optional[str] = None

@router.post("/preferences")
async def save_preferences(preferences: TravelPreferences):
    """Store user travel preferences"""
    # This will be integrated with your agents to remember preferences
    return {"success": True, "preferences_id": "sample_preferences_id"}