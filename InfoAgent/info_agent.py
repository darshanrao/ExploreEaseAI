from uagents import Agent, Context, Protocol, Model
from datetime import datetime, timedelta
from llm_utils import get_claude_response
from calendar_api import GoogleCalendarManager
import json
from models import TravelRequest, TravelPlan
from dataclasses import dataclass
from typing import List, Tuple
# Placeholder function to call LLM (to be implemented)
import logging
logging.basicConfig(level=logging.DEBUG)

def call_llm(input_data):
    """
    Placeholder for LLM call.
    Process input_data and return structured JSON output.
    """
    
    prompt = """
    You are planning a trip to {location} from {date_from} to {date_to}.
    
    You are given with following information.
    
    You have the following preferences:
    - Travel style: {travel_style}
    - Food preference: {food_preference}
    - Budget: {budget}
    - Transport mode: {transport_mode}
    - Time preference: {time_preference}
    - Activity intensity: {activity_intensity}
    - Interests: {interests}
    - Custom preferences: {custom_preferences}
    
    User Prompt: 
    {user_prompt}
    
    Formulate a Google Nearby Search API query to find top places to visit, ensuring the city name is not included since latitude and longitude will be provided.

    You MUST answer in the following JSON format for keywords to search and also set the budget for each category:
    
    {{
      "attractions": [["attraction1 query", "attraction2 query"], min_budget, max_budget],
      "events": [["event1 query", "event2 query"], min_budget, max_budget],
      "lunch": ["specific type restaurant query", min_budget, max_budget],
      "dinner": ["specific type restaurant query", min_budget, max_budget]
    }}
    
    where min_budget and max_budget are the minimum and maximum budget for the category.
    
    IMPORTANT: Ensure your response is a valid JSON object with the exact structure shown above.
    Do not include any explanations or text outside the JSON object.
    """.format(
        location=input_data.get('location', 'Unknown'),
        date_from=input_data.get('date_from', 'Unknown'),
        date_to=input_data.get('date_to', 'Unknown'),
        travel_style=input_data.get('preferences', {}).get('travel_style', 'Unknown'),
        food_preference=input_data.get('preferences', {}).get('food_preference', 'Unknown'),
        budget=input_data.get('preferences', {}).get('budget', 'Unknown'),
        transport_mode=input_data.get('preferences', {}).get('transport_mode', 'Unknown'),
        time_preference=input_data.get('preferences', {}).get('time_preference', 'Unknown'),
        activity_intensity=input_data.get('preferences', {}).get('activity_intensity', 'Unknown'),
        interests=", ".join(input_data.get('preferences', {}).get('interests', [])),
        custom_preferences=input_data.get('preferences', {}).get('custom_preferences', ''),
        user_prompt=input_data.get('prompt', '')
    )
    try:
        return get_claude_response(prompt)
    except Exception as e: 
        return {"error": str(e)}
                        

def extract_response(response_content):
    """
    Extracts a dictionary from the response content by finding the JSON structure.
    """
    # Find the first occurrence of '{' and the last occurrence of '}'
    start_idx = response_content.find('{')
    end_idx = response_content.rfind('}')  # Use rfind to get the last occurrence

    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:  # Ensure both braces are found and in correct order
        valid_string = response_content[start_idx:end_idx+1]
        try:
            # Parse the JSON string
            parsed_response = json.loads(valid_string.strip())
            return parsed_response
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Attempted to parse: {valid_string}")
            return None  # Return None if JSON decoding fails
    else:
        print(f"Could not find valid JSON structure. Start: {start_idx}, End: {end_idx}")
        print(f"Response content: {response_content}")
        return None

# Travel Planning Protocol
travel_protocol = Protocol()


@travel_protocol.on_message(model=TravelRequest)
async def handle_travel_request(ctx: Context, sender: str, msg: TravelRequest): 
    
    calendar = GoogleCalendarManager()
    
    try:
        # Call the LLM with the full request to process
        response = call_llm({
            "prompt": msg.prompt,
            "preferences": msg.preferences,
            "date_from": msg.date_from,
            "date_to": msg.date_to,
            "location": msg.location
        })
        response_dict = extract_response(response)
        if response_dict is None:
            ctx.logger.error("Error extracting response from LLM")
            return
        # Send back the LLM-generated plan
        travel_plan = TravelPlan(
            free_times=calendar.find_free_time(msg.date_from, msg.date_to),
            attractions=response_dict.get('attractions', ([], 0, 0)),
            events=response_dict.get('events', ([], 0, 0)),
            lunch=response_dict.get('lunch', ("", 0, 0)),
            dinner=response_dict.get('dinner', ("", 0, 0)),
        )
        await ctx.send(sender, travel_plan)
    except Exception as e:
        ctx.logger.error(f"Error processing travel plan: {e}")

# Set up the agent
agent = Agent(
    name="travel_planner", 
    seed="travel_secret",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],  # Add this
    mailbox={"server": "https://agentverse.ai"}  # Add this
)
agent.include(travel_protocol)

if __name__ == "__main__":
    agent.run()
