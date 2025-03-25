import json

class TravelPreferences:
    def __init__(self):
        # Allowed options for each preference
        self.allowed_travel_styles = ["adventure", "relaxation", "cultural_exploration", "business", "family_friendly"]
        self.allowed_food_preferences = ["vegetarian", "vegan", "non_vegetarian", "halal", "kosher", "gluten_free", "no_preference"]
        self.allowed_accommodation_types = ["luxury_hotel", "budget_hotel", "hostel", "airbnb", "camping", "no_preference"]
        self.allowed_transport_modes = ["public_transport", "car_rental", "walking", "bike", "ride_sharing"]
        self.allowed_time_preferences = ["early_bird", "night_owl", "balanced"]
        self.allowed_activity_intensity = ["relaxed", "moderate", "intense"]
        self.allowed_interests = ["museums", "nature", "shopping", "nightlife", "sports", "tech_innovation"]

        # Initialize preferences
        self.preferences = {
            "travel_style": None,
            "food_preference": None,
            "accommodation": None,
            "transport_mode": None,
            "time_preference": None,
            "activity_intensity": None,
            "interests": [],
            "custom_preferences": ""
        }

    def fetch_preferences(
        self,
        travel_style,
        food_preference,
        accommodation,
        transport_mode,
        time_preference,
        activity_intensity,
        interests,
        weather_preference,
        notifications,
        custom_preferences=""
    ):
        # Validate inputs
        if travel_style not in self.allowed_travel_styles:
            raise ValueError(f"Invalid travel style. Allowed options: {self.allowed_travel_styles}")
        if food_preference not in self.allowed_food_preferences:
            raise ValueError(f"Invalid food preference. Allowed options: {self.allowed_food_preferences}")
        if accommodation not in self.allowed_accommodation_types:
            raise ValueError(f"Invalid accommodation. Allowed options: {self.allowed_accommodation_types}")
        if transport_mode not in self.allowed_transport_modes:
            raise ValueError(f"Invalid transport mode. Allowed options: {self.allowed_transport_modes}")
        if time_preference not in self.allowed_time_preferences:
            raise ValueError(f"Invalid time preference. Allowed options: {self.allowed_time_preferences}")
        if activity_intensity not in self.allowed_activity_intensity:
            raise ValueError(f"Invalid activity intensity. Allowed options: {self.allowed_activity_intensity}")
        for interest in interests:
            if interest not in self.allowed_interests:
                raise ValueError(f"Invalid interest '{interest}'. Allowed options: {self.allowed_interests}")

        # Set preferences
        self.preferences.update({
            "travel_style": travel_style,
            "food_preference": food_preference,
            "accommodation": accommodation,
            "transport_mode": transport_mode,
            "time_preference": time_preference,
            "activity_intensity": activity_intensity,
            "interests": interests,
            "custom_preferences": custom_preferences
        })

    def to_json(self):
        return json.dumps(self.preferences, indent=4)

# Example Usage
preferences = TravelPreferences()
preferences.fetch_preferences(
    travel_style="adventure",
    food_preference="vegan",
    accommodation="airbnb",
    transport_mode="bike",
    time_preference="early_bird",
    activity_intensity="moderate",
    interests=["nature", "sports"],
    custom_preferences="Love trying street food. Avoid crowded places."
)

print(preferences.to_json())
