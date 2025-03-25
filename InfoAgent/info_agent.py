from uagents import Agent, Context, Protocol, Model
from datetime import datetime, timedelta

# Placeholder function to call LLM (to be implemented)
def call_llm(input_data):
    """
    Placeholder for LLM call.
    Process input_data and return structured JSON output.
    """
    raise NotImplementedError("LLM integration not implemented yet")

# Define input model
class TravelRequest(Model):
    prompt: str
    preferences: dict
    calendar_events: list
    today_date: str
    location: str

# Define output model
class TravelPlan(Model):
    free_times: list
    event_locations: list
    search_keywords: list

# Travel Planning Protocol
travel_protocol = Protocol()

@travel_protocol.on_message(model=TravelRequest)
async def handle_travel_request(ctx: Context, msg: TravelRequest):
    try:
        # Call the LLM with the full request to process
        response = call_llm({
            "prompt": msg.prompt,
            "preferences": msg.preferences,
            "calendar_events": msg.calendar_events,
            "today_date": msg.today_date,
            "location": msg.location
        })
        
        # Send back the LLM-generated plan
        travel_plan = TravelPlan(
            free_times=response.get('free_times', []),
            event_locations=response.get('event_locations', []),
            search_keywords=response.get('search_keywords', [])
        )
        await ctx.send(travel_plan)
    except Exception as e:
        ctx.logger.error(f"Error processing travel plan: {e}")

# Set up the agent
agent = Agent(name="travel_planner", seed="travel_secret")
agent.include(travel_protocol)

if __name__ == "__main__":
    agent.run()
