from uagents import Agent, Context, Protocol, Model
from uagents.setup import fund_agent_if_low
from datetime import datetime, timedelta
import json
import os
import logging
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv

# Import your utility functions from the separate file
from map_func import (
    collect_itinerary_data,
    create_distance_matrix,
    extract_location_data,
    generate_optimized_itinerary,
    post_process_itinerary
)

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

# Map Agent class
class MapAgent:
    def __init__(self, name="map_agent"):
        self.name = name
        
        # Create the agent
        self.agent = Agent(
            name="map_agent",
            seed="map_agent_seed",
            port=8002,
            endpoint=[
                "http://127.0.0.1:8002/submit",
                "http://0.0.0.0:8002/submit"
            ],
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
            # Process the request data using the external functions
            itinerary = await self.generate_itinerary(msg)
            
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
    
    async def generate_itinerary(self, data: TravelPlan) -> List[Dict[str, Any]]:
        """Generate an itinerary based on user preferences and free time slots"""
        logger.info(f"Generating itinerary with preferences: {data.attractions}, {data.events}, {data.lunch}, {data.dinner}")
        
        try:
            # Step 1: Collect all necessary data using the external function
            itinerary_data = collect_itinerary_data(
                data.free_times, 
                data.attractions, 
                data.events,
                data.lunch, 
                data.dinner
            )
            
            # Step 2: Extract all unique locations
            all_locations = []
            # pdb.set_trace()
            # Add start and end locations from each time slot
            for slot in itinerary_data["free_time_slots"]:
                all_locations.append(extract_location_data({
                    "name": slot["start_location"]["name"],
                    "coordinates": slot["start_location"]["coordinates"],
                    "type": "location"
                }))
                all_locations.append(extract_location_data({
                    "name": slot["end_location"]["name"],
                    "coordinates": slot["end_location"]["coordinates"],
                    "type": "location"
                }))
            
            # Add attractions
             
            for attraction in itinerary_data["attractions"]:
                all_locations.append(extract_location_data(attraction))
             
            # Add restaurants
            for meal_type in ["lunch", "dinner"]:
                for restaurant in itinerary_data["restaurants"][meal_type]:
                    restaurant_data = extract_location_data(restaurant)
                    restaurant_data["type"] = meal_type
                    all_locations.append(restaurant_data)
            
            # Remove duplicates by name
            unique_locations = []
            location_names = set()
            
            for location in all_locations:
                if location["name"] not in location_names:
                    unique_locations.append(location)
                    location_names.add(location["name"])
            
            # Step 3: Create distance matrix using the external function
            distance_matrix = create_distance_matrix(unique_locations)
            
            # Step 4: Use LLM to generate optimized itinerary using the external function
            optimized_itinerary = await generate_optimized_itinerary(itinerary_data, distance_matrix)
            # import pdb; pdb.set_trace()
            # Step 5: Post-process the itinerary if needed using the external function
            final_itinerary = post_process_itinerary(optimized_itinerary, unique_locations)
            # import pdb; pdb.set_trace()
            return final_itinerary
            
        except Exception as e:
            logger.error(f"Error in generate_itinerary: {e}")
            # Return a basic error itinerary
            return [{
                "type": "error",
                "time": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "location": "Error",
                "coordinates": {"lat": 0, "lng": 0},
                "description": f"Failed to generate itinerary: {str(e)}"
            }]
    
    def run(self):
        """Run the agent"""
        logger.info(f"Starting {self.name} agent...")
        print(f"Map Agent address: {self.agent.address}")
        self.agent.run()

if __name__ == "__main__":
    map_agent = MapAgent()
    map_agent.run()