from map_utils import *


# Eiffel Tower coordinates
lat = 48.8584
lng = 2.2945

# # Sample usage based on the provided format
# lunch_params = ["local cuisine restaurant", 1, 4]

# # Using the function with the sample parameters
# lunch_restaurants = get_restaurants(
#     latitude=eiffel_tower_lat,
#     longitude=eiffel_tower_lng,
#     radius=1000,  # 1km radius
#     meal_type="lunch",
#     min_price=lunch_params[1],  # 20
#     max_price=lunch_params[2],  # 50
#     keyword=lunch_params[0]  # "local cuisine restaurant"
# )

# # Example of processing the results
# for restaurant in lunch_restaurants[:5]:  # Display first 5 results
#     print(f"Name: {restaurant['name']}")
#     print(f"Rating: {restaurant.get('rating', 'N/A')}")
#     print(f"Address: {restaurant.get('vicinity', 'N/A')}")
#     print("---")
    
# # Eiffel Tower coordinates
# lat = 35.6764
# lng = 139.6500


# # Sample attraction parameters
# attraction_params = [
#     ["cultural", "general"],
#     50,
#     150
# ]

# # Using the function with the sample parameters
# attractions = get_city_attractions(
#     city_lat=35.6764,
#     city_lng=139.6500,
#     radius=20000,
#     attractions_keywords=["cultural event", "food festival"],
#     # min_price=3,  # Using 0-4 scale instead of 50
#     # max_price=4   # Using 0-4 scale instead of 150
    
# )

# # Example of processing the results
# for attraction in attractions[:5]:  # Display first 5 results
#     print(f"Name: {attraction['name']}")
#     print(f"Rating: {attraction.get('rating', 'N/A')}")
#     print(f"Address: {attraction.get('vicinity', 'N/A')}")
#     print(f"Open: {attraction.get('opening_hours', {}).get('open_now', 'N/A')}")
#     print("---")
# with open("attractions.json", "w") as f:
#     json.dump(attractions, f, indent=4)
    
    
    
    
# Search for music events within 5 miles of San Francisco
events = search_eventbrite_events(
    latitude=37.7749,
    longitude=-122.4194,
    radius=5,
    event_type="103",  # Music category ID
    min_price="free",  # Only free events
    keyword="concert",
    sort_by="date"
)

# Display event information
for event in events:
    name = event.get('name', {}).get('text', 'No name')
    start_time = event.get('start', {}).get('local', 'No date')
    venue_id = event.get('venue_id')
    is_free = event.get('is_free', False)
    url = event.get('url', 'No URL')
    
    print(f"Event: {name}")
    print(f"Date: {start_time}")
    print(f"Free: {'Yes' if is_free else 'No'}")
    print(f"URL: {url}")
    print("-" * 50)
