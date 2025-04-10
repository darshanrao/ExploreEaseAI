import json
import logging
import os
from typing import List, Dict, Any
from map_utils import *
import sys
sys.path.append(os.path.abspath("..")) 
from models import TravelPlan, TravelRequest, ItineraryResponse
from llm_utils import get_claude_response
from datetime import datetime, timedelta
from dotenv import load_dotenv
def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points in kilometers."""
    from math import radians, cos, sin, asin, sqrt
    
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    
    return c * r


def estimate_travel_time(origin_coords, dest_coords, avg_speed_kmh=30):
    """Estimate travel time based on straight-line distance and average urban speed."""
    distance = haversine_distance(
        origin_coords["lat"], origin_coords["lng"],
        dest_coords["lat"], dest_coords["lng"]
    )
    
    # Convert distance to time in minutes
    time_hours = distance / avg_speed_kmh
    return int(time_hours * 60)  # Return minutes


# def extract_location_data(place):
#     """Extract standardized location data from a place object."""
#     if "geometry" in place and "location" in place["geometry"]:
#         coords = {
#             "lat": place["geometry"]["location"]["lat"],
#             "lng": place["geometry"]["location"]["lng"]
#         }
#     else:
#         coords = place.get("coordinates", {"lat": 0, "lng": 0})
    
#     return {
#         "name": place.get("name", "Unknown"),
#         "coordinates": coords,
#         "type": place.get("type", "unknown"),
#         "rating": place.get("rating", 0),
#         "price_level": place.get("price_level", 0) if "price_level" in place else None,
#         "place_data": place  # Store the original data for reference
#     }

def extract_location_data(place):
    """Extract standardized location data from a place object."""
    try:
        # Handle Google Places API format
        if "geometry" in place and "location" in place["geometry"]:
            coords = {
                "lat": float(place["geometry"]["location"]["lat"]),
                "lng": float(place["geometry"]["location"]["lng"])
            }
        else:
            # Handle coordinates that might be strings or dictionaries
            coords = place.get("coordinates", {"lat": 0.0, "lng": 0.0})
            if isinstance(coords, str):
                # Parse string coordinates if needed
                coords = json.loads(coords)
            # Ensure coordinates are floats
            coords = {
                "lat": float(coords.get("lat", 0.0)),
                "lng": float(coords.get("lng", 0.0))
            }

        return {
            "name": str(place.get("name", "Unknown")),
            "coordinates": coords,
            "type": str(place.get("type", "unknown")),
            "rating": float(place.get("rating", 0.0)),
            "price_level": place.get("price_level") if "price_level" in place else None,
            "place_data": place  # Store the original data for reference
        }
    except Exception as e:
        logging.error(f"Error processing location data: {e}")
        # Return default values if processing fails
        return {
            "name": "Unknown",
            "coordinates": {"lat": 0.0, "lng": 0.0},
            "type": "unknown",
            "rating": 0.0,
            "price_level": None,
            "place_data": {}
        }
    
def create_distance_matrix(locations):
    """Create a matrix of estimated travel times between all locations."""
    distance_matrix = {}
    
    for i, origin in enumerate(locations):
        origin_name = origin["name"]
        distance_matrix[origin_name] = {}
        
        for j, destination in enumerate(locations):
            if i == j:  # Same location
                distance_matrix[origin_name][destination["name"]] = 0
                continue
                
            # Calculate estimated travel time
            travel_time = estimate_travel_time(
                origin["coordinates"], 
                destination["coordinates"]
            )
            
            distance_matrix[origin_name][destination["name"]] = travel_time
    
    return distance_matrix



# async def generate_optimized_itinerary(itinerary_data, distance_matrix):
#     """Generate an optimized itinerary using the LLM with distance estimates."""
    
#     # Format the data for the LLM
#     prompt = create_itinerary_prompt(itinerary_data, distance_matrix)
    
#     # Call the LLM
#     response = await openai.ChatCompletion.acreate(
#         model="gpt-4",
#         messages=[
#             {"role": "system", "content": "You are an expert travel planner. Your task is to create an optimized travel itinerary based on the provided data."},
#             {"role": "user", "content": prompt}
#         ],
#         temperature=0.7,
#         max_tokens=2000
#     )
    
#     # Parse the LLM response
#     try:
#         itinerary_json = extract_json_from_response(response.choices[0].message.content)
#         return itinerary_json
#     except Exception as e:
#         logger.error(f"Error parsing LLM response: {e}")
#         return []

async def generate_optimized_itinerary(itinerary_data, distance_matrix):
    """Generate an optimized itinerary using Claude with distance estimates."""
    # import pdb; pdb.set_trace()
    # Format the data for Claude
    prompt = create_itinerary_prompt(itinerary_data, distance_matrix)
    # import pdb; pdb.set_trace()
    # Add specific instructions for Claude to format the response as JSON
    system_instructions = """You are an expert travel planner. Your task is to create an optimized travel itinerary based on the provided data.

IMPORTANT: Your response must be a valid JSON array containing the itinerary items. Do not include any explanations, markdown formatting, or text outside of the JSON array."""
    
    # Combine system instructions with the prompt
    full_prompt = f"{system_instructions}\n\n{prompt}"
    
    try:
        # Call Claude using your existing function
        # Since get_claude_response is not async, we use run_in_executor to avoid blocking
        import asyncio
        
        # Run the function in the default executor
        response_text = await asyncio.get_event_loop().run_in_executor(
            None, 
            lambda: get_claude_response(full_prompt, model="claude-3-opus-20240229", max_tokens=4096)
        )
        
        # Parse the response
        itinerary_json = extract_json_from_response(response_text)
        return itinerary_json
        
    except Exception as e:
        logger.error(f"Error getting or parsing Claude response: {e}")
        return []

def create_itinerary_prompt(itinerary_data, distance_matrix):
    """Create a detailed prompt for the LLM with distance information."""
    
    # Convert the data to a more readable format
    free_time_slots = json.dumps(itinerary_data["free_time_slots"], indent=2)
    
    attractions = []
    for a in itinerary_data["attractions"]:
        attraction_data = {
            "name": a["name"],
            "rating": a.get("rating", "Not rated"),
            "types": a.get("types", []),
            "vicinity": a.get("vicinity", "Unknown")
        }
        attractions.append(attraction_data)
    
    attractions_json = json.dumps(attractions, indent=2)
    
    lunch_places = []
    for r in itinerary_data["restaurants"]["lunch"]:
        lunch_data = {
            "name": r["name"],
            "rating": r.get("rating", "Not rated"),
            "price_level": r.get("price_level", "Unknown"),
            "vicinity": r.get("vicinity", "Unknown")
        }
        lunch_places.append(lunch_data)
    
    lunch_json = json.dumps(lunch_places, indent=2)
    
    dinner_places = []
    for r in itinerary_data["restaurants"]["dinner"]:
        dinner_data = {
            "name": r["name"],
            "rating": r.get("rating", "Not rated"),
            "price_level": r.get("price_level", "Unknown"),
            "vicinity": r.get("vicinity", "Unknown")
        }
        dinner_places.append(dinner_data)
    
    dinner_json = json.dumps(dinner_places, indent=2)
    
    # Format the distance matrix for readability
    travel_times_formatted = []
    for origin, destinations in distance_matrix.items():
        for destination, time in destinations.items():
            if origin != destination:  # Skip same location
                travel_times_formatted.append(f"From '{origin}' to '{destination}': {time} minutes")
    
    travel_times_text = "\n".join(travel_times_formatted)
    
    prompt = f"""
        I need you to create an optimized travel itinerary based on the following data:

        ## Free Time Slots
        
        ```json
        {free_time_slots}
        Available Attractions
        
        ```json
        {attractions_json}
        
        Lunch Options
        ```json
        {lunch_json}
        
        Dinner Options
        ```json
        {dinner_json}
        
        Estimated Travel Times (in minutes) These are straight-line distance estimates: {travel_times_text} 
        
        Requirements:
        Create an itinerary that maximizes the number of attractions visited while ensuring meal times are respected.
        Avoid repetitive locations - each attraction should only be visited once.
        Include lunch between 11:30 AM and 2:00 PM if a time slot overlaps with this period.
        Include dinner between 6:00 PM and 9:00 PM if a time slot overlaps with this period.
        Account for travel time between locations using the provided estimates.
        Each attraction visit should take approximately 2 hours.
        Lunch should take approximately 1 hour.
        Dinner should take approximately 1.5 hours.
        Ensure the itinerary starts and ends at the specified locations for each time slot.
        Prioritize higher-rated attractions and restaurants.
        Ensure diversity in the types of attractions.
        
        Please return the itinerary as a JSON array where each item has the following structure:
        ```json
        {{
        "type": "start|attraction|lunch|dinner|travel|end",
        "time": "YYYY-MM-DD HH:MM",
        "end_time": "YYYY-MM-DD HH:MM",
        "location": "Name of the location",
        "coordinates": {{"lat": 0.0, "lng": 0.0}},
        "description": "Description of the activity",
        }}
        """
    return prompt

import json
import re


def extract_json_from_response(response_text):
    """
    Extracts JSON array from the response text.
    Works specifically for arrays starting with '[' and ending with ']'.
    """
    # Find the first occurrence of '[' and the last occurrence of ']'
    start_idx = response_text.find('[')
    end_idx = response_text.rfind(']')  # Use rfind to get the last occurrence
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        # Extract the JSON string
        json_str = response_text[start_idx:end_idx+1]
        
        try:
            # Parse the JSON string
            json_data = json.loads(json_str)
            return json_data
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            print(f"Attempted to parse: {json_str[:100]}...") # Show beginning of the string
            
            # Alternative approach: try to clean the string
            try:
                # Remove any potential markdown formatting or extra characters
                cleaned_json = re.sub(r'```(json)?|```', '', json_str).strip()
                json_data = json.loads(cleaned_json)
                return json_data
            except json.JSONDecodeError:
                print("Failed to parse JSON even after cleaning")
                return None
    else:
        print(f"Could not find valid JSON structure. Start: {start_idx}, End: {end_idx}")
        return None

# async def generate_itinerary(data: TravelPlan) -> List[Dict[str, Any]]:
#     """Generate an itinerary based on user preferences and free time slots"""
#     logger.info(f"Generating itinerary with preferences: {data.attractions}, {data.events}, {data.lunch}, {data.dinner}")
    
#     # Step 1: Collect all necessary data
#     itinerary_data = collect_itinerary_data(
#         data.free_times, 
#         data.attractions, 
#         data.events,
#         data.lunch, 
#         data.dinner
#     )
    
#     # Step 2: Extract all unique locations
#     all_locations = []
#     import pdb; pdb.set_trace()
#     # Add start and end locations from each time slot
#     for slot in itinerary_data["free_time_slots"]:
#         all_locations.append(extract_location_data({
#             "name": slot["start_location"]["name"],
#             "coordinates": slot["start_location"]["coordinates"],
#             "type": "location"
#         }))
#         all_locations.append(extract_location_data({
#             "name": slot["end_location"]["name"],
#             "coordinates": slot["end_location"]["coordinates"],
#             "type": "location"
#         }))
#     pdb.set_trace()
#     # Add attractions
#     for attraction in itinerary_data["attractions"]:
#         all_locations.append(extract_location_data(attraction))
    
#     # Add restaurants
#     for meal_type in ["lunch", "dinner"]:
#         for restaurant in itinerary_data["restaurants"][meal_type]:
#             restaurant_data = extract_location_data(restaurant)
#             restaurant_data["type"] = meal_type
#             all_locations.append(restaurant_data)
    
#     # Remove duplicates by name
#     unique_locations = []
#     location_names = set()
    
#     for location in all_locations:
#         if location["name"] not in location_names:
#             unique_locations.append(location)
#             location_names.add(location["name"])
    
#     # Step 3: Create distance matrix
#     distance_matrix = create_distance_matrix(unique_locations)
    
#     # Step 4: Use LLM to generate optimized itinerary
#     optimized_itinerary = await generate_optimized_itinerary(itinerary_data, distance_matrix)
    
#     # Step 5: Post-process the itinerary if needed
#     final_itinerary = post_process_itinerary(optimized_itinerary, itinerary_data, unique_locations)
    
#     return final_itinerary


# def post_process_itinerary(itinerary, itinerary_data, locations):
#     """Perform any necessary post-processing on the LLM-generated itinerary"""
#     # This function ensures all required fields are present
    
#     location_map = {loc["name"]: loc for loc in locations}
    
#     for item in itinerary:
#         # Ensure all items have the required fields
#         if "type" not in item:
#             item["type"] = "unknown"
        
#         if "coordinates" not in item or not item["coordinates"]:
#             # Try to find coordinates for this location
#             location_name = item.get("location", "")
#             if location_name in location_map:
#                 item["coordinates"] = location_map[location_name]["coordinates"]
    
#     return itinerary

def post_process_itinerary(itinerary, unique_locations):
    """Perform any necessary post-processing on the LLM-generated itinerary"""
    # Create a lookup dictionary for locations by name
    location_map = {loc["name"]: loc for loc in unique_locations}
    
    for item in itinerary:
        # Ensure all items have the required fields
        if "type" not in item:
            item["type"] = "unknown"
        
        location_name = item.get("location", "")
        
        # Ensure coordinates are present
        if "coordinates" not in item or not item["coordinates"] or (
            item["coordinates"].get("lat") == 0 and item["coordinates"].get("lng") == 0
        ):
            if location_name in location_map:
                item["coordinates"] = location_map[location_name]["coordinates"]
        
        # Skip further processing for travel items
        if item["type"] == "travel":
            continue
            
        # For start and end locations, just ensure coordinates are present
        if item["type"] in ["start", "end"]:
            continue
        
        # Process attractions and restaurants (lunch/dinner)
        if location_name in location_map:
            location_data = location_map[location_name]
            place_data = location_data.get("place_data", {})
            
            # Add rating if missing
            if "rating" not in item and "rating" in location_data:
                item["rating"] = location_data["rating"]
            
            # Add price level for restaurants if missing
            if item["type"] in ["lunch", "dinner"] and "price_level" not in item and "price_level" in location_data:
                item["price_level"] = location_data["price_level"]
            
            # Add attraction_type for attractions if missing
            if item["type"] == "attraction" and "attraction_type" not in item and "types" in place_data:
                # Use the first type from the types list
                item["attraction_type"] = place_data["types"][0] if place_data.get("types") else "point_of_interest"
            
            # Add vicinity if missing
            if "vicinity" not in item and "vicinity" in place_data:
                item["vicinity"] = place_data["vicinity"]
            
            # Add image reference if missing
            if "image_reference" not in item and "photos" in place_data and place_data.get("photos"):
                item["image_reference"] = place_data["photos"][0].get("photo_reference", "")
    
    return itinerary


def collect_itinerary_data(free_times, attraction_prefs, event_prefs, lunch_prefs, dinner_prefs):
    """Collect all data needed for itinerary planning."""
    itinerary_data = {
        "free_time_slots": [],
        "attractions": [],
        "restaurants": {
            "lunch": [],
            "dinner": []
        }
    }
    
    # Process each free time slot
    for time_slot in free_times:
        start_time = datetime.strptime(time_slot["start"], "%Y-%m-%d %H:%M")
        end_time = datetime.strptime(time_slot["end"], "%Y-%m-%d %H:%M")
        start_location = time_slot["start_location"]
        end_location = time_slot["end_location"]
        
        # Get coordinates
        start_lat, start_lng = geocode_location(start_location)
        end_lat, end_lng = geocode_location(end_location)
        
                    # Get coordinates and ensure they're floats
        start_lat, start_lng = map(float, geocode_location(start_location))
        end_lat, end_lng = map(float, geocode_location(end_location))
        slot_data = {
            "start": time_slot["start"],
            "end": time_slot["end"],
            "start_location": {
                "name": str(start_location),
                "coordinates": {
                    "lat": float(start_lat),
                    "lng": float(start_lng)
                }
            },
            "end_location": {
                "name": str(end_location),
                "coordinates": {
                    "lat": float(end_lat),
                    "lng": float(end_lng)
                }
            }
        }
        
        itinerary_data["free_time_slots"].append(slot_data)
        
        # Fetch attractions based on preferences
        if attraction_prefs and attraction_prefs[0]:
            attractions = get_city_attractions(
                float(start_lat), float(start_lng),
                city_name="Current Location",
                radius=10000,
                attractions_keywords=attraction_prefs[0],
                sort_by="reviews",
            )
            
            for attraction in attractions[:5]:  # Limit to top 5 attractions
                if attraction not in itinerary_data["attractions"]:
                    if isinstance(attraction, dict):
                        itinerary_data["attractions"].append(attraction)
        
        # Fetch lunch options if applicable
        lunch_start = datetime(start_time.year, start_time.month, start_time.day, 11, 30)
        lunch_end = datetime(start_time.year, start_time.month, start_time.day, 14, 0)
        
        if start_time <= lunch_end and end_time >= lunch_start and lunch_prefs:
            lunch_places = get_restaurants(
                start_lat, start_lng,
                radius=1500,
                meal_type="lunch",
                min_price=lunch_prefs[1] if lunch_prefs[1] <= 4 else lunch_prefs[1] // 20,
                max_price=lunch_prefs[2] if lunch_prefs[2] <= 4 else 4,
                keyword=lunch_prefs[0],
            )
            
            for place in lunch_places[:5]:  # Limit to top 5 lunch places
                if place not in itinerary_data["restaurants"]["lunch"]:
                    itinerary_data["restaurants"]["lunch"].append(place)
        
        # Fetch dinner options if applicable
        dinner_start = datetime(start_time.year, start_time.month, start_time.day, 18, 0)
        dinner_end = datetime(start_time.year, start_time.month, start_time.day, 21, 0)
        
        if start_time <= dinner_end and end_time >= dinner_start and dinner_prefs:
            dinner_places = get_restaurants(
                start_lat, start_lng,
                radius=1500,
                meal_type="dinner",
                min_price=dinner_prefs[1] if dinner_prefs[1] <= 4 else dinner_prefs[1] // 20,
                max_price=dinner_prefs[2] if dinner_prefs[2] <= 4 else 4,
                keyword=dinner_prefs[0],
            )
            
            for place in dinner_places[:5]:  # Limit to top 5 dinner places
                if place not in itinerary_data["restaurants"]["dinner"]:
                    itinerary_data["restaurants"]["dinner"].append(place)
    
    return itinerary_data