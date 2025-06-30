require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(express.json());
app.use(cors());  // Enable CORS for all origins by default

// Set up OAuth2 client with Google credentials from environment
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// If a refresh token is already provided, use it
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

/**
 * Health check endpoint
 * Returns 200 OK with a simple JSON status.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Authorization endpoint
 * - If no refresh token is present, redirects the user to Google's OAuth 2.0 consent screen.
 * - If already authorized (refresh token exists), returns a message indicating such.
 */
app.get('/api/auth', (req, res) => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    // No stored refresh token, initiate OAuth flow
    const scopes = (process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/calendar').split(' ');
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',  // always ask consent to ensure refresh token is returned
      scope: scopes
    });
    return res.redirect(authUrl);
  } else {
    // Already have refresh token
    return res.status(200).json({ message: 'Already authorized with a refresh token.' });
  }
});

/**
 * OAuth2 callback endpoint
 * Google will redirect to this route with a ?code= parameter after user consents.
 * This endpoint exchanges the authorization code for tokens and displays them.
 */
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Authorization code not found in request.');
  }
  try {
    // Exchange the code for tokens (access and refresh tokens)
    const { tokens } = await oAuth2Client.getToken(code);
    // You might want to store the refresh token (tokens.refresh_token) securely at this point.
    return res.status(200).json({
      message: 'Authorization successful. Please save the refresh token for future use.',
      tokens: tokens
    });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return res.status(500).send('Authentication failed');
  }
});

/**
 * Example endpoint to list upcoming calendar events.
 * GET /api/events?maxResults=10
 * Requires that GOOGLE_REFRESH_TOKEN is already set (authorization done).
 */
app.get('/api/events', async (req, res) => {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({ error: 'No refresh token available. Authorize the app first.' });
    }
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const timeMin = req.query.timeMin || (new Date()).toISOString();
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults) : 10;
    // Fetch events from the specified calendar (defaults to primary if not set)
    const result = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: timeMin,
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });
    const events = result.data.items || [];
    return res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: error.message });
  }
});

// (Optional) Root route for basic info
app.get('/', (req, res) => {
  res.send('Google Calendar MCP microservice is running.');
});

// Start the server on the configured port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
