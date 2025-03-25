from uagents import Agent, Context, Model
from datetime import datetime, timedelta

# Input Model
class TravelRequest(Model):
    prompt: str
    preferences: dict
    calendar: list
    date: str
    location: str

# Output Model
class TravelResponse(Model):
    free_time_slots: list
    search_locations: list
    search_keywords: list

def calculate_free_time(calendar, date):
    free_slots = []
    events = sorted(calendar, key=lambda x: x['start_time'])
    day_start = datetime.fromisoformat(f"{date}T00:00:00")
    day_end = datetime.fromisoformat(f"{date}T23:59:59")

    # Start of day free time
    if events and day_start < datetime.fromisoformat(events[0]['start_time']):
        free_slots.append({"start_time": day_start.isoformat(), "end_time": events[0]['start_time']})

    # Between events
    for i in range(len(events) - 1):
        end_time = datetime.fromisoformat(events[i]['end_time'])
        next_start = datetime.fromisoformat(events[i + 1]['start_time'])
        if end_time < next_start:
            free_slots.append({"start_time": end_time.isoformat(), "end_time": next_start.isoformat()})

    # End of day free time
    if events and datetime.fromisoformat(events[-1]['end_time']) < day_end:
        free_slots.append({"start_time": events[-1]['end_time'], "end_time": day_end.isoformat()})

    return free_slots

def extract_locations(calendar, base_location):
    locations = {base_location}
    for event in calendar:
        if 'location' in event:
            locations.add(event['location'])
    return list(locations)

def generate_keywords(preferences, locations):
    keywords = []
    for category, items in preferences.items():
        for item in items:
            for location in locations:
                keywords.append(f"{item} near {location}")
    return keywords

travel_agent = Agent(name="travel_planner", seed="travel123")

@travel_agent.on_message(model=TravelRequest)
async def handle_travel_request(ctx: Context, request: TravelRequest):
    ctx.logger.info("Processing travel request...")

    free_slots = calculate_free_time(request.calendar, request.date)
    search_locations = extract_locations(request.calendar, request.location)
    search_keywords = generate_keywords(request.preferences, search_locations)

    response = TravelResponse(
        free_time_slots=free_slots,
        search_locations=search_locations,
        search_keywords=search_keywords
    )

    await ctx.send(request.sender, response)

if __name__ == "__main__":
    travel_agent.run()