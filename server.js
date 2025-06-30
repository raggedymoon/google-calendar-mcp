const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');

// Load .env variables locally (has no effect on Railway but helps in dev)
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SCOPES = process.env.GOOGLE_SCOPES;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !REFRESH_TOKEN) {
  console.error("❌ One or more required environment variables are missing.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// 🔄 Health Check Endpoint
app.get('/api/health', (req, res) => {
  try {
    res.status(200).send('OK');
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).send('Health check failed');
  }
});

// 📅 Calendar Events Fetch Example
app.get('/api/events', async (req, res) => {
  try {
    const result = await calendar.events.list({
      calendarId: 'primary',
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.status(200).json(result.data.items);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).send('Error retrieving calendar events');
  }
});

// 🚀 Launch server on Railway-defined or fallback port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
