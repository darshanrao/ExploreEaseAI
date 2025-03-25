from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pickle
import os
from datetime import datetime, timedelta

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

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

def main():
    """Authenticate and get events from the Google Calendar API."""
    creds = authenticate()
    service = build('calendar', 'v3', credentials=creds)

    # Get events from the primary calendar
    events = get_events(service, 'primary')

    for event in events:
        start = event['start'].get('dateTime', event['start'].get('date'))
        print(start, event['summary'])

    # Push a new event to the primary calendar
    event = {
        'summary': 'Lets Go for a walk!',
        'description': 'Lets Go!',
        'location': 'New York, NY',  # Add location here
        'start': {
            'dateTime': (datetime.utcnow() + timedelta(days=1)).isoformat() + 'Z',
            'timeZone': 'America/New_York'
        },
        'end': {
            'dateTime': (datetime.utcnow() + timedelta(days=1, hours=1)).isoformat() + 'Z',
            'timeZone': 'America/New_York'
        }
    }
    push_event(service, 'primary', event)

if __name__ == '__main__':
    main()