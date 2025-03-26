def get_restaurants(latitude, longitude, radius=1000, meal_type="lunch"):
    """Find restaurants for lunch or dinner"""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "type": "restaurant",
        "key": os.environ.get("GOOGLE_PLACES_API_KEY")
    }
    response = requests.get(url, params=params)
    return response.json()['results']



def get_nearby_attractions(latitude, longitude, radius=1500):
    """Find attractions near the user"""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{latitude},{longitude}",
        "radius": radius,
        "type": "tourist_attraction",
        "key": os.environ.get("GOOGLE_PLACES_API_KEY")
    }
    response = requests.get(url, params=params)
    return response.json()['results']


def get_events(city, date):
    """Find events happening today"""
    url = "https://app.ticketmaster.com/discovery/v2/events.json"
    params = {
        "city": city,
        "startDateTime": f"{date}T00:00:00Z",
        "endDateTime": f"{date}T23:59:59Z",
        "apikey": os.environ.get("TICKETMASTER_API_KEY")
    }
    response = requests.get(url, params=params)
    return response.json()['_embedded']['events'] if '_embedded' in response.json() else []