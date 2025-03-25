from flask import Flask, request, jsonify
from InfoAgent.preference import TravelPreferences
import requests
from datetime import datetime

app = Flask(__name__)

def get_geolocation():
    """Fetch the user's geolocation using an IP-based API."""
    response = requests.get("https://ipinfo.io/json")
    if response.status_code == 200:
        location_data = response.json()
        return location_data.get("loc", "0,0")
    return "0,0"

def validate_datetime(datetime_str):
    """Validate datetime in the format 'YYYY-MM-DD HH:MM'."""
    try:
        return datetime.strptime(datetime_str, '%Y-%m-%d %H:%M')
    except ValueError:
        raise ValueError(f"Invalid datetime format: '{datetime_str}'. Use 'YYYY-MM-DD HH:MM'.")

@app.route('/travel-plan', methods=['POST'])
def travel_plan():
    data = request.json

    # Extract data from the request body
    location = data.get("location", None)
    if not location:
        location = get_geolocation()

    # Validate date and time
    try:
        date_from = validate_datetime(data.get("date_from"))
        date_to = validate_datetime(data.get("date_to"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    user_prompt = data.get("user_prompt", "")
    preferences_data = data.get("preferences", {})

    # Create a TravelPreferences instance and fetch preferences
    try:
        preferences = TravelPreferences()
        preferences.fetch_preferences(
            travel_style=preferences_data.get("travel_style", "no_preference"),
            food_preference=preferences_data.get("food_preference", "no_preference"),
            accommodation=preferences_data.get("accommodation", "no_preference"),
            transport_mode=preferences_data.get("transport_mode", "public_transport"),
            time_preference=preferences_data.get("time_preference", "balanced"),
            activity_intensity=preferences_data.get("activity_intensity", "moderate"),
            interests=preferences_data.get("interests", []),
            custom_preferences=preferences_data.get("custom_preferences", "")
        )

        response = {
            "location": location,
            "date_from": date_from.strftime('%Y-%m-%d %H:%M'),
            "date_to": date_to.strftime('%Y-%m-%d %H:%M'),
            "user_prompt": user_prompt,
            "preferences": preferences.preferences
        }

        return jsonify(response)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
