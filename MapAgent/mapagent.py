

from uagents import Agent, Context, Protocol, Model
from datetime import datetime, timedelta
# from llm_utils import get_claude_response
# from calendar_api import GoogleCalendarManager
# import json
# from models import TravelRequest, TravelPlan
# from dataclasses import dataclass
# from typing import List, Tuple

from map_utils import *

class MapAgent:
    def __init__(self, name="map_agent"):
        self.name = name
        self.identity = Identity.from_string(os.environ.get("AGENT_SEED", "map_agent_seed"))
        self.agent = Agent(identity=self.identity, name=name)
        self.protocol = Protocol("itinerary_protocol")
        
        # Register message handlers
        self.agent.add_protocol(self.protocol)
        self.protocol.on_message(self.handle_itinerary_request)
    
    async def handle_itinerary_request(self, ctx: Context, sender: str, msg: dict):
        """Handle incoming itinerary request messages"""
        logger.info(f"Received itinerary request from {sender}")
        
        try:
            # Process the request data
            itinerary = self.generate_itinerary(msg)
            
            # Send back the generated itinerary
            await ctx.send(sender, {"itinerary": itinerary})
            logger.info(f"Sent itinerary response to {sender}")
        except Exception as e:
            logger.error(f"Error processing itinerary request: {e}")
            await ctx.send(sender, {"error": str(e)})
    
    def generate_itinerary(self, data):
        """Generate an itinerary based on user preferences and free time slots"""
        free_times = data.get("free_times", [])
        attraction_prefs = data.get("attractions", [])
        event_prefs = data.get("events", [])
        lunch_prefs = data.get("lunch", [])
        dinner_prefs = data.get("dinner", [])
        
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
        
        # Add this line to print the itinerary
        print(f"Generated itinerary: {json.dumps(itinerary, indent=2)}")
        
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
                min_price = lunch_prefs[1] // 20  # Convert dollar amount to Google price level (0-4)
                max_price = min(4, lunch_prefs[2] // 20)  # Cap at 4 (Google's max price level)
                
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
                        "rating": restaurant.get('rating', 'Not rated')
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
                min_price = dinner_prefs[1] // 20  # Convert dollar amount to Google price level (0-4)
                max_price = min(4, dinner_prefs[2] // 20)  # Cap at 4 (Google's max price level)
                
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
                        "rating": restaurant.get('rating', 'Not rated')
                    })
                    
                    # Update current time and location
                    current_time += timedelta(minutes=dinner_duration)
                    current_location = restaurant.get('name')
                    current_lat = restaurant['geometry']['location']['lat']
                    current_lng = restaurant['geometry']['location']['lng']
                    continue
            
            # # Check for events
            # if event_prefs and event_prefs[0]:
            #     event_keywords = event_prefs[0]
            #     min_price = event_prefs[1]
            #     max_price = event_prefs[2]
                
            #     # Convert min_price to Eventbrite format
            #     eventbrite_min_price = "free" if min_price == 0 else "paid"
                
            #     for keyword in event_keywords:
            #         events = search_eventbrite_events(
            #             current_lat, current_lng,
            #             radius=10,  # 10 miles radius
            #             keyword=keyword,
            #             min_price=eventbrite_min_price,
            #             max_price=max_price,
            #             start_date=current_time.isoformat(),
            #             end_date=(current_time + timedelta(hours=6)).isoformat()
            #         )
                    
            #         if events:
            #             # Choose the first available event
            #             event = events[0]
                        
            #             # Parse event start and end times
            #             event_start = datetime.fromisoformat(event.get('start', {}).get('local', current_time.isoformat()))
            #             event_end = datetime.fromisoformat(event.get('end', {}).get('local', (current_time + timedelta(hours=2)).isoformat()))
                        
            #             # Only add event if it fits within our remaining time
            #             if event_end <= end_time - buffer_time:
            #                 # Add travel time to event
            #                 travel_time = 30  # Default 30 minutes
            #                 current_time += timedelta(minutes=travel_time)
                            
            #                 # Add event to itinerary
            #                 slot_itinerary.append({
            #                     "type": "event",
            #                     "time": event_start.strftime("%Y-%m-%d %H:%M"),
            #                     "end_time": event_end.strftime("%Y-%m-%d %H:%M"),
            #                     "location": event.get('venue', {}).get('name', 'Event venue'),
            #                     "coordinates": {
            #                         "lat": event.get('venue', {}).get('latitude', current_lat),
            #                         "lng": event.get('venue', {}).get('longitude', current_lng)
            #                     },
            #                     "description": event.get('name', {}).get('text', 'Event'),
            #                     "price": "Free" if event.get('is_free', False) else f"${max_price} or less"
            #                 })
                            
            #                 # Update current time and location
            #                 current_time = event_end
            #                 current_location = event.get('venue', {}).get('name', 'Event venue')
            #                 current_lat = event.get('venue', {}).get('latitude', current_lat)
            #                 current_lng = event.get('venue', {}).get('longitude', current_lng)
            #                 continue
            
            # If no event, check for attractions
            if attraction_prefs and attraction_prefs[0]:
                attraction_keywords = attraction_prefs[0]
                min_price = attraction_prefs[1]
                max_price = attraction_prefs[2]
                
                attractions = get_city_attractions(
                    current_lat, current_lng,
                    city_name="Los Angeles",
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
                        "rating": attraction.get('rating', 'Not rated')
                    })
                    
                    # Update current time and location
                    current_time += timedelta(minutes=attraction_duration)
                    current_location = attraction.get('name')
                    current_lat = attraction['geometry']['location']['lat']
                    current_lng = attraction['geometry']['location']['lng']
                    continue
            
            # If we couldn't find any suitable activity, add some buffer time and try again
            current_time += timedelta(minutes=30)
        
        # Add ending point
        travel_time_to_end = calculate_travel_time(
            f"{current_lat},{current_lng}", 
            f"{end_lat},{end_lng}"
        )
        travel_time_minutes = travel_time_to_end // 60
        
        # Add travel to end location
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
        self.agent.run()
