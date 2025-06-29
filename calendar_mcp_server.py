from flask import Flask, request, jsonify
import os
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

app = Flask(__name__)

@app.route("/status")
def status():
    return jsonify({"status": "Google Calendar MCP is running"})

@app.route("/api/auth", methods=["GET"])
def auth_placeholder():
    return jsonify({"message": "Auth route not implemented – using refresh token"}), 200

@app.route("/add-event", methods=["POST"])
def add_event():
    try:
        creds = Credentials(
            None,
            refresh_token=os.environ.get("GOOGLE_REFRESH_TOKEN"),
            client_id=os.environ.get("GOOGLE_CLIENT_ID"),
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
            token_uri="https://oauth2.googleapis.com/token"
        )

        service = build("calendar", "v3", credentials=creds)

        data = request.json

        event = {
            'summary': data.get("summary", "No Title"),
            'description': data.get("description", ""),
            'start': {
                'dateTime': data["start"],  # ISO format required
                'timeZone': data.get("timezone", "America/New_York"),
            },
            'end': {
                'dateTime': data["end"],
                'timeZone': data.get("timezone", "America/New_York"),
            },
        }

        calendar_id = os.environ.get("GOOGLE_CALENDAR_ID", "primary")
        created_event = service.events().insert(calendarId=calendar_id, body=event).execute()

        return jsonify({
            "status": "success",
            "event_id": created_event.get("id"),
            "html_link": created_event.get("htmlLink")
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    print("Starting Google Calendar MCP Server...")
    app.run(host="0.0.0.0", port=5000)
