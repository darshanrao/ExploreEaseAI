import os
import json
import logging
from typing import Dict, List, Any, Optional, Union
import asyncio
from dotenv import load_dotenv
import httpx
from datetime import datetime, timedelta
from anthropic import Anthropic

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

class TravelAgent:
    """Client interface to the InfoAgent and MapAgent for generating travel itineraries"""
    
    def __init__(self):
        """Initialize the travel agent with API keys and endpoints"""
        self.agent_key = os.getenv("AGENTVERSE_KEY")
        self.claude_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.google_places_api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        
        # Initialize Anthropic client
        self.anthropic = None
        if self.claude_api_key:
            self.anthropic = Anthropic(api_key=self.claude_api_key)
        else:
            logger.warning("ANTHROPIC_API_KEY not found in environment variables")
            
        if not self.agent_key:
            logger.warning("AGENTVERSE_KEY not found in environment variables")
            
        if not self.google_places_api_key:
            logger.warning("GOOGLE_PLACES_API_KEY not found in environment variables")
    
    async def generate_itinerary(self, 
                                location: str, 
                                date_from: str, 
                                date_to: str, 
                                preferences: Dict[str, Any], 
                                prompt: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Generate a travel itinerary using the InfoAgent and MapAgent
        
        Args:
            location: Destination location
            date_from: Start date in ISO format
            date_to: End date in ISO format
            preferences: User preferences including interests, budget, etc.
            prompt: Optional natural language prompt with additional instructions
            
        Returns:
            List of itinerary points with location, times, and details
        """
        logger.info(f"Generating itinerary for {location} from {date_from} to {date_to}")
        
        try:
            # Prepare the itinerary request based on user preferences
            travel_days = self._calculate_travel_days(date_from, date_to)
            
            # If Anthropic is available, use it to generate the itinerary
            if self.anthropic:
                logger.info("Using Anthropic to generate itinerary")
                
                try:
                    itinerary = await self._generate_anthropic_itinerary(
                        location=location,
                        date_from=date_from,
                        date_to=date_to,
                        travel_days=travel_days,
                        preferences=preferences,
                        prompt=prompt
                    )
                    
                    logger.info(f"Successfully generated Anthropic itinerary with {len(itinerary)} points")
                    return itinerary
                except Exception as e:
                    logger.error(f"Error in Anthropic itinerary generation: {str(e)}")
                    # Fall back to sample itinerary if Anthropic fails
                    logger.info("Falling back to sample itinerary generation")
            
            # Generate a sample itinerary if Anthropic is not available or fails
            itinerary = self._generate_sample_itinerary(
                location=location,
                date_from=date_from,
                date_to=date_to,
                travel_days=travel_days,
                preferences=preferences
            )
            
            return itinerary
            
        except Exception as e:
            logger.error(f"Error generating itinerary: {str(e)}")
            raise
    
    async def _generate_anthropic_itinerary(self, 
                                           location: str,
                                           date_from: str,
                                           date_to: str,
                                           travel_days: int,
                                           preferences: Dict[str, Any],
                                           prompt: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Generate an itinerary using the Anthropic Claude model
        
        Args:
            location: Destination location
            date_from: Start date in ISO format
            date_to: End date in ISO format
            travel_days: Number of days in the trip
            preferences: User preferences for the trip
            prompt: Optional user prompt with additional instructions
            
        Returns:
            List of itinerary points with locations, times, and coordinates
        """
        if not self.anthropic:
            raise ValueError("Anthropic client is not initialized")
            
        # Extract preference details
        interests = preferences.get("interests", [])
        budget = preferences.get("budget", "2")
        travel_style = preferences.get("travel_style", "cultural")
        food_preference = preferences.get("food_preference", "local cuisine")
        transport_mode = preferences.get("transport_mode", "public transport")
        time_preference = preferences.get("time_preference", "morning")
        activity_intensity = preferences.get("activity_intensity", "moderate")
        custom_preferences = preferences.get("custom_preferences", "")
        
        # Format dates for better readability
        start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        formatted_start = start_date.strftime("%B %d, %Y")
        formatted_end = end_date.strftime("%B %d, %Y")
        
        # Construct the prompt for Anthropic
        system_prompt = f"""
        You are an expert travel planner with extensive knowledge of destinations worldwide. 
        Your task is to create a detailed, personalized itinerary for a trip to {location} from {formatted_start} to {formatted_end} (a {travel_days}-day trip).
        
        The itinerary must be well-structured, include realistic places in {location}, and respect the traveler's preferences.
        
        TRAVELER PREFERENCES:
        - Travel style: {travel_style}
        - Food preferences: {food_preference}
        - Budget level (0-4, where 0 is budget and 4 is luxury): {budget}
        - Transportation: {transport_mode}
        - Preferred time of day: {time_preference}
        - Activity intensity: {activity_intensity}
        - Interests: {', '.join(interests)}
        {f"- Additional preferences: {custom_preferences}" if custom_preferences else ""}
        
        {prompt if prompt else ''}

        THE RESPONSE MUST BE IN THE FOLLOWING JSON FORMAT (and only JSON, no explanation):
        [
          {{
            "type": "attraction", // can be attraction, food, start, end, transport, or rest
            "time": "2025-04-05T09:00:00", // start time in ISO format
            "end_time": "2025-04-05T12:00:00", // end time in ISO format
            "location": "Museum Name", // name of the place
            "coordinates": {{ "lat": 50.0875, "lng": 14.4213 }}, // approximate coordinates
            "description": "Visit this famous museum with...", // short description
            "rating": 4.5 // optional rating if known
          }},
          // more itinerary points...
        ]
        
        RULES:
        1. Make a realistic plan with 4-5 activities per day.
        2. Include exact times for each activity in ISO format (YYYY-MM-DDThh:mm:ss).
        3. Include approximate GPS coordinates for each location.
        4. Start each day around 09:00 and end by 21:00, with rest periods.
        5. Include specific local restaurants for meals according to the food preferences.
        6. Allocate realistic time for each activity (usually 1-3 hours) and travel between locations.
        7. Only return valid, properly formatted JSON with the structure exactly as shown above.
        8. Make sure the activities reflect the traveler's interests and budget level.
        9. Include actual, real-world attractions and restaurants that exist in {location}.
        10. Make sure all coordinates are realistic and actually in {location}.
        """
        
        user_prompt = f"Create a detailed travel itinerary for a {travel_days}-day trip to {location} from {formatted_start} to {formatted_end}."
        
        # Call Anthropic API
        logger.info(f"Sending request to Anthropic for {location} itinerary")
        
        # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        response = await asyncio.to_thread(
            self.anthropic.messages.create,
            model="claude-3-7-sonnet-20250219",
            system=system_prompt,
            max_tokens=4000,
            temperature=0.7,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        
        # Extract and parse JSON response
        if not response or not response.content or len(response.content) == 0:
            raise ValueError("Empty response from Anthropic")
            
        response_text = response.content[0].text
        
        # Try to find and extract JSON from the response
        try:
            # First try direct JSON parsing
            itinerary_points = json.loads(response_text)
        except json.JSONDecodeError:
            # If direct parsing fails, try to find JSON between markers
            import re
            json_match = re.search(r'\[\s*{.*}\s*\]', response_text, re.DOTALL)
            if json_match:
                try:
                    itinerary_points = json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    raise ValueError("Could not parse JSON from Anthropic response")
            else:
                raise ValueError("Could not find JSON in Anthropic response")
                
        # Validate the response structure
        if not isinstance(itinerary_points, list):
            raise ValueError(f"Expected list response, got {type(itinerary_points)}")
            
        for point in itinerary_points:
            if not isinstance(point, dict):
                continue
                
            # Ensure required fields exist
            if 'type' not in point:
                point['type'] = 'attraction'
            if 'coordinates' not in point:
                # Default coordinates for location
                point['coordinates'] = {'lat': 50.0, 'lng': 14.4}
            if 'rating' not in point:
                point['rating'] = 4.0
                
        return itinerary_points
    
    def _calculate_travel_days(self, date_from: str, date_to: str) -> int:
        """Calculate the number of days between two dates"""
        start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        delta = end_date - start_date
        return max(1, delta.days + 1)  # Ensure at least 1 day
    
    def _generate_sample_itinerary(self, 
                                  location: str, 
                                  date_from: str, 
                                  date_to: str, 
                                  travel_days: int,
                                  preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate a sample itinerary based on location and user preferences.
        In a real implementation, this would call external AI agents.
        """
        interests = preferences.get("interests", [])
        budget = preferences.get("budget", "2")
        travel_style = preferences.get("travel_style", "cultural")
        
        # In a production system, this would be replaced with actual agent calls
        # that generate personalized itineraries based on real data
        
        itinerary = []
        
        # Just a placeholder implementation
        # In the real system, this would be replaced with data from InfoAgent and MapAgent
        start_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        
        for day in range(travel_days):
            current_date = start_date + timedelta(days=day)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Morning activity
            morning_time = f"{date_str}T09:00:00"
            morning_end_time = f"{date_str}T12:00:00"
            
            # Lunch
            lunch_time = f"{date_str}T12:30:00"
            lunch_end_time = f"{date_str}T14:00:00"
            
            # Afternoon activity
            afternoon_time = f"{date_str}T14:30:00"
            afternoon_end_time = f"{date_str}T17:00:00"
            
            # Evening activity
            evening_time = f"{date_str}T18:00:00"
            evening_end_time = f"{date_str}T20:00:00"
            
            # Add morning activity
            itinerary.append({
                "type": "attraction",
                "time": morning_time,
                "end_time": morning_end_time,
                "location": f"Popular Morning Spot in {location}",
                "coordinates": {
                    "lat": 50.0875,
                    "lng": 14.4213
                },
                "description": "Visit a popular attraction in the morning",
                "rating": 4.5
            })
            
            # Add lunch
            itinerary.append({
                "type": "food",
                "time": lunch_time,
                "end_time": lunch_end_time,
                "location": f"Local Restaurant in {location}",
                "coordinates": {
                    "lat": 50.0865,
                    "lng": 14.4205
                },
                "description": "Enjoy local cuisine for lunch",
                "rating": 4.3
            })
            
            # Add afternoon activity
            itinerary.append({
                "type": "attraction",
                "time": afternoon_time,
                "end_time": afternoon_end_time,
                "location": f"Afternoon Activity in {location}",
                "coordinates": {
                    "lat": 50.0855,
                    "lng": 14.4195
                },
                "description": "Explore the local culture in the afternoon",
                "rating": 4.7
            })
            
            # Add evening activity
            itinerary.append({
                "type": "attraction",
                "time": evening_time,
                "end_time": evening_end_time,
                "location": f"Evening Entertainment in {location}",
                "coordinates": {
                    "lat": 50.0845,
                    "lng": 14.4185
                },
                "description": "End the day with evening entertainment",
                "rating": 4.2
            })
        
        return itinerary