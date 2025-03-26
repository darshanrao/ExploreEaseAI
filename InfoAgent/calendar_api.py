from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pickle
import os
from datetime import datetime, timezone
import dateutil.parser

# If modifying these scopes, delete the file token.pickle.
SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar'
]


def authenticate():
    """Authenticate with Google and get an access token."""
    creds = None
    # The file token.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    return creds

def get_events(service, calendar_id):
    """Get events from the Google Calendar API."""
    # Call the Calendar API
    now = datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
    events_result = service.events().list(calendarId=calendar_id, timeMin=now,
                                              maxResults=10, singleEvents=True,
                                              orderBy='startTime').execute()
    events = events_result.get('items', [])

    return events

def push_event(service, calendar_id, event):
    """Push an event to the Google Calendar API."""
    event = service.events().insert(calendarId=calendar_id, body=event).execute()
    print('Event created: %s' % (event.get('htmlLink')))

    
def find_free_time(service, calendar_id, date_from, date_to):
    """
    Find free time slots in a Google Calendar between specified start and end dates.
    
    Args:
        service: Google Calendar API service instance
        calendar_id: ID of the calendar to check (e.g., 'primary')
        date_from: Start date and time in format "YYYY-MM-DD HH:MM"
        date_to: End date and time in format "YYYY-MM-DD HH:MM"
        
    Returns:
        A list of dictionaries containing free time slots with start and end times
    """
    # Convert input strings to datetime objects with UTC timezone
    start_datetime = datetime.strptime(date_from, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
    end_datetime = datetime.strptime(date_to, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
    
    # Convert to RFC3339 format for Google Calendar API
    time_min = start_datetime.isoformat()
    time_max = end_datetime.isoformat()
    
    # Get events from the calendar
    events_result = service.events().list(
        calendarId=calendar_id,
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    
    events = events_result.get('items', [])
    
    # Create a list of busy slots from events
    busy_slots = []
    for event in events:
        # Skip events with transparency set to 'transparent' (free)
        if event.get('transparency') == 'transparent':
            continue
            
        start = event['start'].get('dateTime')
        end = event['end'].get('dateTime')
        
        if start and end:  # Only consider events with specific times (not all-day events)
            # Use dateutil.parser to handle various ISO formats
            start_dt = dateutil.parser.isoparse(start)
            end_dt = dateutil.parser.isoparse(end)
            
            busy_slots.append({
                'start': start_dt,
                'end': end_dt
            })
    
    # Sort busy slots by start time
    busy_slots.sort(key=lambda x: x['start'])
    
    # Find free time slots
    free_slots = []
    current_time = start_datetime
    
    for busy in busy_slots:
        busy_start = busy['start']
        busy_end = busy['end']
        
        # If there's free time before this busy slot
        if current_time < busy_start:
            free_slots.append({
                'start': current_time.strftime("%Y-%m-%d %H:%M"),
                'end': busy_start.strftime("%Y-%m-%d %H:%M")
            })
        
        # Move current time to the end of this busy slot
        current_time = max(current_time, busy_end)
    
    # Add any remaining free time after the last busy slot
    if current_time < end_datetime:
        free_slots.append({
            'start': current_time.strftime("%Y-%m-%d %H:%M"),
            'end': end_datetime.strftime("%Y-%m-%d %H:%M")
        })
    
    return free_slots

# def main():
#     """Authenticate and get events from the Google Calendar API."""
#     creds = authenticate()
#     service = build('calendar', 'v3', credentials=creds)

#     # Get events from the primary calendar
#     events = get_events(service, 'primary')

#     for event in events:
#         start = event['start'].get('dateTime', event['start'].get('date'))
#         print(start, event['summary'])

#     # Push a new event to the primary calendar
#     event = {
#         'summary': 'Lets Go for a walk!',
#         'description': 'Lets Go!',
#         'location': 'New York, NY',  # Add location here
#         'start': {
#             'dateTime': (datetime.utcnow() + timedelta(days=1)).isoformat() + 'Z',
#             'timeZone': 'America/New_York'
#         },
#         'end': {
#             'dateTime': (datetime.utcnow() + timedelta(days=1, hours=1)).isoformat() + 'Z',
#             'timeZone': 'America/New_York'
#         }
#     }
#     push_event(service, 'primary', event)
    

def main():
    """Authenticate and find free time in the Google Calendar."""
    creds = authenticate()
    service = build('calendar', 'v3', credentials=creds)
    
    # Example date range
    date_from = "2025-04-01 09:00"
    date_to = "2025-04-01 18:00"
    
    # Find free time slots
    free_slots = find_free_time(service, 'primary', date_from, date_to)
    
    # Print the free time slots
    print("Free time slots:")
    for i, slot in enumerate(free_slots, 1):
        print(f"{i}. Start: {slot['start']}, End: {slot['end']}")

if __name__ == '__main__':
    main()