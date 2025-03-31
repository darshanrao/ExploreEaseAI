# client_agent.py
from uagents import Agent, Context, Protocol
import asyncio
import json
import sys
import logging
import os
sys.path.append(os.path.abspath("..")) 
logging.basicConfig(level=logging.DEBUG)

from models import TravelRequest, TravelPlan, ItineraryResponse

from dotenv import load_dotenv
# Load environment variables from .env file
load_dotenv()

# Create a client agent
client_agent = Agent(
    name="travel_client",
    seed="travel_client_secret",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
    mailbox={"server": "https://agentverse.ai"}
)

client_protocol = Protocol()
received_response = False

# Handle intermediate travel plan from Information Agent
@client_protocol.on_message(model=TravelPlan)
async def handle_travel_plan(ctx: Context, sender: str, msg: TravelPlan):
    ctx.logger.info("Received travel plan from Information Agent:")
    ctx.logger.info(f"Free times: {msg.free_times}")
    ctx.logger.info(f"Attractions: {msg.attractions}")
    ctx.logger.info(f"Events: {msg.events}")
    ctx.logger.info(f"Lunch: {msg.lunch}")
    ctx.logger.info(f"Dinner: {msg.dinner}")
    
    # Save intermediate results
    with open('travel_plan_intermediate.json', 'w') as f:
        json.dump({
            "free_times": msg.free_times,
            "attractions": msg.attractions,
            "events": msg.events,
            "lunch": msg.lunch,
            "dinner": msg.dinner
        }, f, indent=4)
    
    # Forward the travel plan to the Map Agent
    map_agent_address = os.environ.get("MAP_AGENT")
    ctx.logger.info(f"Forwarding travel plan to Map Agent: {map_agent_address}")
    
    # Create a new TravelPlan model instance to send to the Map Agent
    # Make sure to use the same model as defined in models.py
    travel_plan = TravelPlan(
        free_times=msg.free_times,
        attractions=msg.attractions,
        events=msg.events,
        lunch=msg.lunch,
        dinner=msg.dinner
    )
    
    # Send the travel plan to the Map Agent
    await ctx.send(map_agent_address, travel_plan)
    ctx.logger.info("Travel plan sent to Map Agent")

# Handle final itinerary from Map Agent
@client_protocol.on_message(model=ItineraryResponse)
async def handle_itinerary(ctx: Context, sender: str, msg: ItineraryResponse):
    global received_response
    received_response = True
    
    ctx.logger.info("Received final itinerary from Map Agent:")
    ctx.logger.info(f"Itinerary contains {len(msg.itinerary)} items")
    
    # Save the final itinerary
    with open('final_itinerary.json', 'w') as f:
        json.dump({"itinerary": msg.itinerary}, f, indent=4)
    
    ctx.logger.info("Shutting down client after receiving final itinerary")
    sys.exit(0)

# Define a model for error messages
from uagents import Model

class ErrorMessage(Model):
    error: str

# Handle error messages from Map Agent
@client_protocol.on_message(model=ErrorMessage)
async def handle_error_message(ctx: Context, sender: str, msg: ErrorMessage):
    ctx.logger.error(f"Error from Map Agent: {msg.error}")
    
    # Save the error message
    with open('map_agent_error.json', 'w') as f:
        json.dump({"error": msg.error}, f, indent=4)
    
    ctx.logger.info("Error message saved to 'map_agent_error.json'")
    sys.exit(1)

client_agent.include(client_protocol)

# Information Agent address
info_agent_address = os.environ.get("INFOAGENT")
@client_agent.on_event("startup")
async def on_startup(ctx: Context):
    request = TravelRequest(
        prompt="I want to explore local cuisine and visit museums",
        preferences={
            "travel_style": "cultural",
            "food_preference": "local cuisine",
            "budget": "$300-$500",
            "transport_mode": "public transport",
            "time_preference": "morning",
            "activity_intensity": "moderate",
            "interests": ["museums", "food", "history"],
            "custom_preferences": "I prefer indoor activities if it rains"
        },
        date_from="2025-03-27 06:00",
        date_to="2025-03-27 22:00",
        location="Paris"
    )
    
    ctx.logger.info(f"Sending travel request to Information Agent: {info_agent_address}")
    await ctx.send(info_agent_address, request)
    
    await asyncio.sleep(120)  # Longer timeout for the complete pipeline (2 minutes)
    if not received_response:
        ctx.logger.error("No final itinerary received within timeout period")
        sys.exit(1)

if __name__ == "__main__":
    print(f"Client agent address: {client_agent.address}")
    client_agent.run()
