const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SCOPES = process.env.GOOGLE_SCOPES || "https://www.googleapis.com/auth/calendar";

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !REFRESH_TOKEN) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/events", async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    res.json(response.data.items);
  } catch (error) {
    console.error("❌ Error fetching events:", error.message);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

app.post("/api/create-event", async (req, res) => {
  try {
    const { summary, description, start, end } = req.body;

    const event = {
      summary,
      description,
      start: { dateTime: start, timeZone: "UTC" },
      end: { dateTime: end, timeZone: "UTC" },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("❌ Error creating event:", error.message);
    res.status(500).json({ error: "Failed to create event" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
