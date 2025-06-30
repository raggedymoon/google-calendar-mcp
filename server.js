const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Load secrets from environment variables
const {
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  REFRESH_TOKEN,
} = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !REFRESH_TOKEN) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

// Setup OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// Health check endpoint for Railway uptime monitoring
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Demo endpoint to fetch upcoming calendar events
app.get("/api/demo", async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    res.status(200).json({ events });
  } catch (error) {
    console.error("❌ Failed to fetch events:", error.message);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 MasterEverything.AI Calendar Server started`);
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`✅ Ready for Google verification demo!`);
});
