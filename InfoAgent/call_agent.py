# client_agent.py
from uagents import Agent, Context, Protocol
import asyncio
import json
import sys


import logging
logging.basicConfig(level=logging.DEBUG)

from models import TravelRequest, TravelPlan
    
# Create a client agent - no blockchain funding needed
client_agent = Agent(
    name="travel_client",
    seed="travel_client_secret",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
    mailbox={"server": "https://agentverse.ai"}
)

# Create a protocol for the client
client_protocol = Protocol()

# Flag to track if we've received a response
received_response = False

@client_protocol.on_message(model=TravelPlan)
async def handle_travel_plan(ctx: Context, sender: str, msg: TravelPlan):
    """Handle the received travel plan"""
    global received_response
    received_response = True
    
    ctx.logger.info("Received travel plan:")
    ctx.logger.info(f"Free times: {msg.free_times}")
    ctx.logger.info(f"Attractions: {msg.attractions}")
    ctx.logger.info(f"Events: {msg.events}")
    ctx.logger.info(f"Lunch: {msg.lunch}")
    ctx.logger.info(f"Dinner: {msg.dinner}")
    
    # Save the results to a file
    with open('travel_plan_results.json', 'w') as f:
        json.dump({
            "free_times": msg.free_times,
            "attractions": msg.attractions,
            "events": msg.events,
            "lunch": msg.lunch,
            "dinner": msg.dinner
        }, f, indent=4)
    
    # Exit after receiving the response
    ctx.logger.info("Shutting down client after receiving response")
    # Use sys.exit() instead of ctx.stop()
    sys.exit(0)

client_agent.include(client_protocol)

# Get the travel planner address from the logs of your travel planner agent
# Replace with the actual address shown in your logs
travel_planner_address = "agent1qvghn56ppww3cq5fv96m23jgvklev333evj42we6v0s7exszmf4hga3lh0a"

# Send a request when the client starts
@client_agent.on_event("startup")
async def on_startup(ctx: Context):
    # Create a travel request exactly matching your model
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
    
    ctx.logger.info(f"Sending travel request to {travel_planner_address}")
    await ctx.send(travel_planner_address, request)
    
    # Set a timeout to exit if no response is received
    await asyncio.sleep(30)
    if not received_response:
        ctx.logger.error("No response received within timeout period")
        # Use sys.exit() instead of ctx.stop()
        sys.exit(1)

if __name__ == "__main__":
    print(f"Client agent address: {client_agent.address}")
    # Run the client agent
    client_agent.run()
