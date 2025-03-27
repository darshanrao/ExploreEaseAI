# Import the same model definitions
from uagents import Model
from typing import List, Tuple


class TravelRequest(Model):
    prompt: str
    preferences: dict
    date_from: str
    date_to: str
    location: str

# Define output model
class TravelPlan(Model):
    free_times: list
    attractions: object  # Use a more flexible type
    events: object
    lunch: object
    dinner: object