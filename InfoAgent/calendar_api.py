from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pickle
import os
from datetime import datetime, timezone, timedelta
import dateutil.parser
import dateutil.tz
import requests


class GoogleCalendarManager:
    """A class to manage Google Calendar operations."""
    
    # If modifying these scopes, delete the file token.pickle.
    SCOPES = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar'
    ]
    
    def __init__(self, credentials_file='credentials.json', token_file='token.pickle'):
        """Initialize the calendar manager and authenticate."""
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.service = None
        self.authenticate()
    
    def authenticate(self):
        """Authenticate with Google and get an access token."""
        creds = None
        # The file token.pickle stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first time.
        if os.path.exists(self.token_file):
            with open(self.token_file, 'rb') as token:
                creds = pickle.load(token)
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, self.SCOPES)
                creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open(self.token_file, 'wb') as token:
                pickle.dump(creds, token)
        
        self.service = build('calendar', 'v3', credentials=creds)
        return self.service
    
    def get_events(self, calendar_id='primary', max_results=10):
        """Get events from the Google Calendar API."""
        if not self.service:
            self.authenticate()
            
        # Call the Calendar API
        now = datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
        events_result = self.service.events().list(
            calendarId=calendar_id, 
            timeMin=now,
            maxResults=max_results, 
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        return events
    
    def push_event(self, event, calendar_id='primary'):
        """Push an event to the Google Calendar API."""
        if not self.service:
            self.authenticate()
            
        event = self.service.events().insert(calendarId=calendar_id, body=event).execute()
        print('Event created: %s' % (event.get('htmlLink')))
        return event
    
    def get_current_location(self):
        """Get the current location using ipinfo.io API."""
        try:
            response = requests.get('https://ipinfo.io/json')
            if response.status_code == 200:
                data = response.json()
                location = f"{data.get('city', '')}, {data.get('region', '')}, {data.get('country', '')}"
                return location.strip(', ')
            else:
                return "Unknown Location"
        except Exception as e:
            print(f"Error getting location: {e}")
            return "Unknown Location"
    
    def find_free_time(self, date_from, date_to, calendar_id='primary'):
        """
        Find free time slots in a Google Calendar between specified start and end dates,
        including location information for each slot.
        
        Args:
            date_from: Start date and time in format "YYYY-MM-DD HH:MM"
            date_to: End date and time in format "YYYY-MM-DD HH:MM"
            calendar_id: ID of the calendar to check (e.g., 'primary')
            
        Returns:
            A list of dictionaries containing free time slots with start and end times and locations
        """
        if not self.service:
            self.authenticate()
            
        # Get calendar's time zone
        calendar_info = self.service.calendars().get(calendarId=calendar_id).execute()
        calendar_timezone = calendar_info.get('timeZone', 'UTC')
        
        # Convert input strings to datetime objects with the calendar's timezone
        local_tz = dateutil.tz.gettz(calendar_timezone)
        start_datetime = datetime.strptime(date_from, "%Y-%m-%d %H:%M").replace(tzinfo=local_tz)
        end_datetime = datetime.strptime(date_to, "%Y-%m-%d %H:%M").replace(tzinfo=local_tz)
        
        # Convert to RFC3339 format for Google Calendar API
        time_min = start_datetime.isoformat()
        time_max = end_datetime.isoformat()
        
        # Get current location as fallback
        current_location = self.get_current_location()
        
        # Get events from the calendar
        events_result = self.service.events().list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        # Create a list of busy slots from events with their locations
        busy_slots = []
        for event in events:
            # Skip events with transparency set to 'transparent' (free)
            if event.get('transparency') == 'transparent':
                continue
                
            start = event['start'].get('dateTime')
            end = event['end'].get('dateTime')
            event_timezone = event['start'].get('timeZone', calendar_timezone)
            location = event.get('location', '')
            
            if start and end:  # Only consider events with specific times (not all-day events)
                # Use dateutil.parser to handle various ISO formats and preserve time zone
                start_dt = dateutil.parser.isoparse(start)
                end_dt = dateutil.parser.isoparse(end)
                
                busy_slots.append({
                    'start': start_dt,
                    'end': end_dt,
                    'location': location
                })
        
        # Sort busy slots by start time
        busy_slots.sort(key=lambda x: x['start'])
        
        # Find free time slots with location information
        free_slots = []
        current_time = start_datetime
        
        for i, busy in enumerate(busy_slots):
            busy_start = busy['start']
            busy_end = busy['end']
            
            # If there's free time before this busy slot
            if current_time < busy_start:
                # Determine start location (from previous event or current location)
                start_location = current_location
                if i > 0 and busy_slots[i-1].get('location'):
                    start_location = busy_slots[i-1].get('location')
                
                # Determine end location (from upcoming event or same as start)
                end_location = busy.get('location') if busy.get('location') else start_location
                
                # Format times in local time zone
                start_local = current_time.astimezone(local_tz)
                end_local = busy_start.astimezone(local_tz)
                
                free_slots.append({
                    'start': start_local.strftime("%Y-%m-%d %H:%M"),
                    'end': end_local.strftime("%Y-%m-%d %H:%M"),
                    'start_location': start_location,
                    'end_location': end_location
                })
            
            # Move current time to the end of this busy slot
            current_time = max(current_time, busy_end)
        
        # Add any remaining free time after the last busy slot
        if current_time < end_datetime:
            # Determine start location (from last event or current location)
            start_location = current_location
            if busy_slots and busy_slots[-1].get('location'):
                start_location = busy_slots[-1].get('location')
            
            # Format times in local time zone
            start_local = current_time.astimezone(local_tz)
            end_local = end_datetime.astimezone(local_tz)
            
            # For the last slot, use the same location for both start and end if no other info
            free_slots.append({
                'start': start_local.strftime("%Y-%m-%d %H:%M"),
                'end': end_local.strftime("%Y-%m-%d %H:%M"),
                'start_location': start_location,
                'end_location': start_location
            })
        
        return free_slots


def main():
    # Initialize the calendar manager
    calendar = GoogleCalendarManager()
    
    # Example 1: Find free time slots
    print("\n=== Example 1: Find Free Time Slots ===")
    date_from = "2025-03-27 06:00"
    date_to = "2025-03-27 22:00"
    
    free_slots = calendar.find_free_time(date_from, date_to)
    
    print("Free time slots with location information:")
    for i, slot in enumerate(free_slots, 1):
        print(f"{i}. Start: {slot['start']} at {slot['start_location']}")
        print(f"   End: {slot['end']} at {slot['end_location']}")
        print()
    
    # Example 2: Get upcoming events
    print("\n=== Example 2: Get Upcoming Events ===")
    events = calendar.get_events(max_results=5)
    
    if not events:
        print("No upcoming events found.")
    else:
        print("Upcoming events:")
        for i, event in enumerate(events, 1):
            start = event['start'].get('dateTime', event['start'].get('date'))
            print(f"{i}. {start} - {event['summary']}")
    
    # Example 3: Create a new event
    print("\n=== Example 3: Create a New Event ===")
    tomorrow = datetime.now() + timedelta(days=1)
    tomorrow_start = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    tomorrow_end = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0)
    
    # Get the calendar's timezone
    calendar_info = calendar.service.calendars().get(calendarId='primary').execute()
    calendar_timezone = calendar_info.get('timeZone', 'UTC')
    
    new_event = {
        'summary': 'Meeting created by GoogleCalendarManager',
        'description': 'This event was created using the GoogleCalendarManager class',
        'location': calendar.get_current_location(),
        'start': {
            'dateTime': tomorrow_start.isoformat(),
            'timeZone': calendar_timezone
        },
        'end': {
            'dateTime': tomorrow_end.isoformat(),
            'timeZone': calendar_timezone
        }
    }
    
    # Uncomment to actually create the event
    # created_event = calendar.push_event(new_event)
    print(f"Event would be created: {new_event['summary']} at {new_event['location']}")
    print(f"Start: {new_event['start']['dateTime']}")
    print(f"End: {new_event['end']['dateTime']}")


if __name__ == '__main__':
    main()

#SAMPLE USAGE OF that can be used later 

# def schedule_meeting_in_free_time(duration_minutes=60, min_duration_minutes=30):
#     """
#     Find the next available free time slot of at least the specified duration
#     and schedule a meeting in it.
    
#     Args:
#         duration_minutes: Desired meeting duration in minutes
#         min_duration_minutes: Minimum acceptable duration in minutes
    
#     Returns:
#         The created event if successful, None otherwise
#     """
#     # Initialize the calendar manager
#     calendar = GoogleCalendarManager()
    
#     # Look for free time in the next 7 days
#     today = datetime.now()
#     next_week = today + timedelta(days=7)
    
#     date_from = today.strftime("%Y-%m-%d %H:%M")
#     date_to = next_week.strftime("%Y-%m-%d %H:%M")
    
#     # Find free time slots
#     free_slots = calendar.find_free_time(date_from, date_to)
    
#     # Find a suitable slot
#     suitable_slot = None
#     for slot in free_slots:
#         # Parse the start and end times
#         start_time = datetime.strptime(slot['start'], "%Y-%m-%d %H:%M")
#         end_time = datetime.strptime(slot['end'], "%Y-%m-%d %H:%M")
        
#         # Calculate duration in minutes
#         duration = (end_time - start_time).total_seconds() / 60
        
#         # Check if this slot is long enough
#         if duration >= min_duration_minutes:
#             suitable_slot = slot
#             break
    
#     if not suitable_slot:
#         print("No suitable free time slots found in the next 7 days.")
#         return None
    
#     # Get the calendar's timezone
#     calendar_info = calendar.service.calendars().get(calendarId='primary').execute()
#     calendar_timezone = calendar_info.get('timeZone', 'UTC')
    
#     # Parse the start time
#     start_time = datetime.strptime(suitable_slot['start'], "%Y-%m-%d %H:%M")
    
#     # Calculate end time based on desired duration
#     end_time = start_time + timedelta(minutes=min(duration_minutes, duration))
    
#     # Create the event
#     new_event = {
#         'summary': 'Automatically Scheduled Meeting',
#         'description': 'This meeting was automatically scheduled in a free time slot.',
#         'location': suitable_slot['start_location'],
#         'start': {
#             'dateTime': start_time.isoformat(),
#             'timeZone': calendar_timezone
#         },
#         'end': {
#             'dateTime': end_time.isoformat(),
#             'timeZone': calendar_timezone
#         }
#     }
    
#     # Create the event
#     created_event = calendar.push_event(new_event)
    
#     print(f"Meeting scheduled successfully:")
#     print(f"Start: {suitable_slot['start']} at {suitable_slot['start_location']}")
#     print(f"End: {end_time.strftime('%Y-%m-%d %H:%M')} at {suitable_slot['start_location']}")
    
#     return created_event

# # Call the function to schedule a meeting
# # schedule_meeting_in_free_time(duration_minutes=45)
