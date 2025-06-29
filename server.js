const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI  // <-- Use Railway/production-safe redirect
);

// Set refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MasterEverything.AI Calendar Server is running',
    timestamp: new Date().toISOString()
  });
});

// List events
app.get('/api/events', async (req, res) => {
  try {
    const timeMin = new Date().toISOString();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      timeMax: timeMax.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json({
      success: true,
      events: response.data.items,
      count: response.data.items.length
    });
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to fetch calendar events'
    });
  }
});

// Create event
app.post('/api/events', async (req, res) => {
  try {
    const { title, date, startTime, endTime, description } = req.body;

    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, date, startTime, endTime'
      });
    }

    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: `${date}T${startTime}:00`,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: `${date}T${endTime}:00`,
        timeZone: 'America/New_York',
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.json({
      success: true,
      event: response.data,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Error creating event:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to create calendar event'
    });
  }
});

// Delete event
app.delete('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 MasterEverything.AI Calendar Server started!');
  console.log(`📅 Server running on http://localhost:${PORT}`);
  console.log('⚡ Ready for Google verification demo!');
});
