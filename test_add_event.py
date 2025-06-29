from flask import Flask
import os
from dotenv import load_dotenv
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from datetime import datetime, timedelta

# Load environment variables from .env
load_dotenv()

# Set up Google Calendar credentials
credentials = Credentials.from_authorized_user_info(
    info={
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "refresh_token": os.getenv("GOOGLE_REFRESH_TOKEN"),
        "token_uri": "https://oauth2.googleapis.com/token",
    }
)

# Initialize the Calendar API
service = build('calendar', 'v3', credentials=credentials)

# Get calendar ID from environment variable
calendar_id = os.getenv("GOOGLE_CALENDAR_ID")

if not calendar_id:
    print("❌ Missing required environment variable: GOOGLE_CALENDAR_ID")
    input("Press Enter to exit...")
    exit(1)

# Create a sample event
event = {
    'summary': '🧠 Test Event from MCP',
    'description': 'This is a test event created by the MCP system.',
    'start': {
        'dateTime': (datetime.utcnow() + timedelta(minutes=2)).isoformat() + 'Z',
        'timeZone': 'UTC',
    },
    'end': {
        'dateTime': (datetime.utcnow() + timedelta(minutes=32)).isoformat() + 'Z',
        'timeZone': 'UTC',
    },
}

try:
    event_result = service.events().insert(calendarId=calendar_id, body=event).execute()
    print(f"✅ Event created: {event_result.get('htmlLink')}")
except Exception as e:
    print("❌ Failed to create event:")
    print(e)

input("Press Enter to exit...")
