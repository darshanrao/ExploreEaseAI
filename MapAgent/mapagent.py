# map_agent.py
from uagents import Agent, Context, Protocol, Model
from uagents.setup import fund_agent_if_low
from datetime import datetime, timedelta
import json
import os
import logging
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv
# Load environment variables from .env file
load_dotenv()
import sys
sys.path.append(os.path.abspath("..")) 
from models import TravelPlan, ItineraryResponse
# Import map utilities
from map_utils import *
# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# # Models
# class TravelPlan(Model):
#     free_times: List[Dict[str, str]]
#     attractions: List[Any]
#     events: List[Any]
#     lunch: List[Any]
#     dinner: List[Any]
#     client_address: Optional[str] = None

# class ItineraryResponse(Model):
#     itinerary: List[Dict[str, Any]]

# Map Agent class
class MapAgent:
    def __init__(self, name="map_agent"):
        self.name = name
        
        # Create the agent
        self.agent = Agent(
            name=name,
            seed=os.environ.get("AGENT_SEED", "map_agent_seed"),
            port=8002,
            endpoint=["http://127.0.0.1:8002/submit"],
            mailbox={"server": "https://agentverse.ai"}
        )
        
        # Fund the agent if needed
        fund_agent_if_low(self.agent.wallet.address())
        
        # Create protocol
        self.protocol = Protocol("itinerary_protocol")
        
        # Register message handler using decorator pattern
        @self.protocol.on_message(model=TravelPlan)
        async def handle_travel_plan(ctx: Context, sender: str, msg: TravelPlan):
            await self.handle_travel_plan(ctx, sender, msg)
        
        # Include the protocol in the agent
        self.agent.include(self.protocol)
        
        logger.info(f"Map Agent initialized with address: {self.agent.address}")
    
    async def handle_travel_plan(self, ctx: Context, sender: str, msg: TravelPlan):
        """Handle incoming travel plan messages"""
        logger.info(f"Received travel plan from {sender}")
        
        try:
            # Process the request data
            itinerary = self.generate_itinerary(msg)
            
            # Create the response
            response = ItineraryResponse(itinerary=itinerary)
            
            # Send back the generated itinerary to the sender
            await ctx.send(sender, response)
            logger.info(f"Sent itinerary response to {sender}")
            
            # Check if client_address exists before trying to use it
            if hasattr(msg, 'client_address') and msg.client_address and msg.client_address != sender:
                await ctx.send(msg.client_address, response)
                logger.info(f"Sent itinerary response to client: {msg.client_address}")
                
        except Exception as e:
            logger.error(f"Error processing travel plan: {e}")
            # Send an error response as a proper model
            error_response = ItineraryResponse(itinerary=[{
                "type": "error",
                "description": f"Error: {str(e)}"
            }])
            await ctx.send(sender, error_response)
            
    def generate_itinerary(self, data: TravelPlan) -> List[Dict[str, Any]]:
        """Generate an itinerary based on user preferences and free time slots"""
        free_times = data.free_times
        attraction_prefs = data.attractions
        event_prefs = data.events
        lunch_prefs = data.lunch
        dinner_prefs = data.dinner
        
        logger.info(f"Generating itinerary with preferences: {attraction_prefs}, {event_prefs}, {lunch_prefs}, {dinner_prefs}")
        
        itinerary = []
        
        # Process each free time slot
        for time_slot in free_times:
            start_time = datetime.strptime(time_slot["start"], "%Y-%m-%d %H:%M")
            end_time = datetime.strptime(time_slot["end"], "%Y-%m-%d %H:%M")
            start_location = time_slot["start_location"]
            end_location = time_slot["end_location"]
            
            # Get coordinates for locations
            start_lat, start_lng = geocode_location(start_location)
            end_lat, end_lng = geocode_location(end_location)
            
            # Skip if geocoding failed
            if not all([start_lat, start_lng, end_lat, end_lng]):
                logger.warning(f"Skipping time slot due to geocoding failure: {time_slot}")
                continue
            
            # Create a slot-specific itinerary
            slot_itinerary = self._plan_time_slot(
                start_time, end_time, 
                start_location, end_location,
                start_lat, start_lng, 
                end_lat, end_lng,
                attraction_prefs, event_prefs, 
                lunch_prefs, dinner_prefs
            )
            
            itinerary.extend(slot_itinerary)
        
        # # Save the generated itinerary to a file for debugging
        # with open('generated_itinerary.json', 'w') as f:
        #     json.dump(itinerary, f, indent=2)
            
        return itinerary
    
    def _plan_time_slot(self, start_time, end_time, start_location, end_location,
                        start_lat, start_lng, end_lat, end_lng,
                        attraction_prefs, event_prefs, lunch_prefs, dinner_prefs):
        """Plan activities for a specific time slot"""
        slot_itinerary = []
        current_time = start_time
        current_location = start_location
        current_lat, current_lng = start_lat, start_lng
        
        # Add starting point
        slot_itinerary.append({
            "type": "start",
            "time": current_time.strftime("%Y-%m-%d %H:%M"),
            "location": current_location,
            "coordinates": {"lat": current_lat, "lng": current_lng},
            "description": "Starting point"
        })
        
        # Check if lunch time falls within this slot (11:30 AM - 2:00 PM)
        lunch_start = datetime(current_time.year, current_time.month, current_time.day, 11, 30)
        lunch_end = datetime(current_time.year, current_time.month, current_time.day, 14, 0)
        
        # Check if dinner time falls within this slot (6:00 PM - 9:00 PM)
        dinner_start = datetime(current_time.year, current_time.month, current_time.day, 18, 0)
        dinner_end = datetime(current_time.year, current_time.month, current_time.day, 21, 0)
        
        # Plan activities until we reach the end time, leaving buffer for travel to end location
        buffer_time = timedelta(minutes=30)  # Buffer for travel to end location
        
        while current_time + buffer_time < end_time:
            remaining_time = (end_time - current_time).total_seconds() / 60  # in minutes
            
            # If we have less than 1 hour remaining, just head to the end location
            if remaining_time < 60:
                break
            
            # Check if it's lunch time
            if lunch_start <= current_time <= lunch_end and lunch_prefs:
                # Find a lunch place
                lunch_keyword = lunch_prefs[0]
                min_price = lunch_prefs[1] if lunch_prefs[1] <= 4 else lunch_prefs[1] // 20  # Convert dollar amount to Google price level (0-4)
                max_price = lunch_prefs[2] if lunch_prefs[2] <= 4 else 4
                
                restaurants = get_restaurants(
                    current_lat, current_lng, 
                    radius=1500, 
                    meal_type="lunch", 
                    min_price=min_price, 
                    max_price=max_price, 
                    keyword=lunch_keyword
                )
                
                if restaurants:
                    # Choose the highest-rated restaurant
                    restaurant = max(restaurants, key=lambda x: x.get('rating', 0) if x.get('rating') else 0)
                    
                    # Add lunch to itinerary
                    lunch_duration = 60  # 1 hour for lunch
                    slot_itinerary.append({
                        "type": "lunch",
                        "time": current_time.strftime("%Y-%m-%d %H:%M"),
                        "end_time": (current_time + timedelta(minutes=lunch_duration)).strftime("%Y-%m-%d %H:%M"),
                        "location": restaurant.get('name'),
                        "coordinates": {
                            "lat": restaurant['geometry']['location']['lat'],
                            "lng": restaurant['geometry']['location']['lng']
                        },
                        "description": f"Lunch at {restaurant.get('name')}",
                        "price_level": restaurant.get('price_level', 'Unknown'),
                        "rating": restaurant.get('rating', 'Not rated'),
                        "vicinity": restaurant.get('vicinity', 'Unknown'),
                        "image_reference": restaurant.get('photos', [{}])[0].get('photo_reference', '')
                        
                    })
                    
                    # Update current time and location
                    current_time += timedelta(minutes=lunch_duration)
                    current_location = restaurant.get('name')
                    current_lat = restaurant['geometry']['location']['lat']
                    current_lng = restaurant['geometry']['location']['lng']
                    continue
            
            # Check if it's dinner time
            if dinner_start <= current_time <= dinner_end and dinner_prefs:
                # Find a dinner place
                dinner_keyword = dinner_prefs[0]
                min_price = dinner_prefs[1] if dinner_prefs[1] <= 4 else dinner_prefs[1] // 20  # Convert dollar amount to Google price level (0-4)
                max_price = dinner_prefs[2] if dinner_prefs[2] <= 4 else 4
                
                restaurants = get_restaurants(
                    current_lat, current_lng, 
                    radius=1500, 
                    meal_type="dinner", 
                    min_price=min_price, 
                    max_price=max_price, 
                    keyword=dinner_keyword
                )
                
                if restaurants:
                    # Choose the highest-rated restaurant
                    restaurant = max(restaurants, key=lambda x: x.get('rating', 0) if x.get('rating') else 0)
                    
                    # Add dinner to itinerary
                    dinner_duration = 90  # 1.5 hours for dinner
                    slot_itinerary.append({
                        "type": "dinner",
                        "time": current_time.strftime("%Y-%m-%d %H:%M"),
                        "end_time": (current_time + timedelta(minutes=dinner_duration)).strftime("%Y-%m-%d %H:%M"),
                        "location": restaurant.get('name'),
                        "coordinates": {
                            "lat": restaurant['geometry']['location']['lat'],
                            "lng": restaurant['geometry']['location']['lng']
                        },
                        "description": f"Dinner at {restaurant.get('name')}",
                        "price_level": restaurant.get('price_level', 'Unknown'),
                        "rating": restaurant.get('rating', 'Not rated'),
                        "vicinity": restaurant.get('vicinity', 'Unknown'),
                        "image_reference": restaurant.get('photos', [{}])[0].get('photo_reference', '')
                        
                    })
                    
                    # Update current time and location
                    current_time += timedelta(minutes=dinner_duration)
                    current_location = restaurant.get('name')
                    current_lat = restaurant['geometry']['location']['lat']
                    current_lng = restaurant['geometry']['location']['lng']
                    continue
            
            # If no meal time, check for attractions
            if attraction_prefs and attraction_prefs[0]:
                attraction_keywords = attraction_prefs[0]
                
                attractions = get_city_attractions(
                    current_lat, current_lng,
                    city_name="Current Location",
                    radius=10000,  # 10km radius
                    attractions_keywords=attraction_keywords,
                    sort_by="rating"
                )
                
                if attractions:
                    # Choose the highest-rated attraction
                    attraction = attractions[0]
                    
                    # Add attraction to itinerary
                    attraction_duration = 120  # 2 hours for attraction visit
                    slot_itinerary.append({
                        "type": "attraction",
                        "time": current_time.strftime("%Y-%m-%d %H:%M"),
                        "end_time": (current_time + timedelta(minutes=attraction_duration)).strftime("%Y-%m-%d %H:%M"),
                        "location": attraction.get('name'),
                        "coordinates": {
                            "lat": attraction['geometry']['location']['lat'],
                            "lng": attraction['geometry']['location']['lng']
                        },
                        "description": f"Visit {attraction.get('name')}",
                        "rating": attraction.get('rating', 'Not rated'),
                        "attraction_type": attraction.get('types', ['Unknown'])[0],
                        "vicinity": attraction.get('vicinity', 'Unknown'),
                        # Uncomment the following line to include an image URL if available
                        "image_reference": attraction.get('photos', [{}])[0].get('photo_reference', '')
                        
                    })
                    
                    # Update current time and location
                    current_time += timedelta(minutes=attraction_duration)
                    current_location = attraction.get('name')
                    current_lat = attraction['geometry']['location']['lat']
                    current_lng = attraction['geometry']['location']['lng']
                    continue
            
            # If we couldn't find any suitable activity, add some buffer time and try again
            current_time += timedelta(minutes=30)
        
        # Add travel to end location
        travel_time_to_end = calculate_travel_time(
            f"{current_lat},{current_lng}", 
            f"{end_lat},{end_lng}"
        )
        travel_time_minutes = travel_time_to_end // 60
        
        slot_itinerary.append({
            "type": "travel",
            "time": current_time.strftime("%Y-%m-%d %H:%M"),
            "end_time": (current_time + timedelta(minutes=travel_time_minutes)).strftime("%Y-%m-%d %H:%M"),
            "location": f"Travel to {end_location}",
            "coordinates": {"lat": current_lat, "lng": current_lng},
            "description": f"Travel to final destination ({travel_time_minutes} minutes)"
        })
        
        # Add end point
        current_time += timedelta(minutes=travel_time_minutes)
        slot_itinerary.append({
            "type": "end",
            "time": current_time.strftime("%Y-%m-%d %H:%M"),
            "location": end_location,
            "coordinates": {"lat": end_lat, "lng": end_lng},
            "description": "End of itinerary"
        })
        
        return slot_itinerary
    
    def run(self):
        """Run the agent"""
        logger.info(f"Starting {self.name} agent...")
        print(f"Map Agent address: {self.agent.address}")
        self.agent.run()

if __name__ == "__main__":
    map_agent = MapAgent()
    map_agent.run()