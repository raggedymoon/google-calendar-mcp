require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(express.json());
app.use(cors());

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/auth', (req, res) => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    const scopes = (process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/calendar').split(' ');
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });
    return res.redirect(authUrl);
  } else {
    return res.status(200).json({ message: 'Already authorized with a refresh token.' });
  }
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Authorization code not found in request.');
  }
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    return res.status(200).json({
      message: 'Authorization successful. Please save the refresh token for future use.',
      tokens: tokens
    });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return res.status(500).send('Authentication failed');
  }
});

app.get('/api/events', async (req, res) => {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({ error: 'No refresh token available. Authorize the app first.' });
    }
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const timeMin = req.query.timeMin || new Date().toISOString();
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults) : 10;

    const result = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: timeMin,
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return res.status(200).json({ events: result.data.items || [] });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Google Calendar MCP microservice is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
