require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['https://mastereverything.ai', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Authorization endpoint - Force OAuth flow
app.get('/api/auth', (req, res) => {
  // Always generate auth URL when specifically requested via /api/auth
  const scopes = (process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/calendar').split(' ');
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });
  return res.redirect(authUrl);
});

// OAuth callback
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

// Get calendar events
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

    return res.status(200).json({ 
      events: result.data.items || [],
      count: result.data.items?.length || 0
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create calendar event
app.post('/api/events', async (req, res) => {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({ error: 'No refresh token available. Authorize the app first.' });
    }

    const { summary, description, startDateTime, endDateTime, location } = req.body;
    
    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: summary, startDateTime, endDateTime' 
      });
    }

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    const event = {
      summary: summary,
      location: location || '',
      description: description || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York',
      },
    };

    const result = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event,
    });

    return res.status(201).json({ 
      success: true,
      event: result.data,
      eventId: result.data.id
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Demo page endpoint - THIS WAS MISSING!
app.get('/demo', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MasterEverything.AI - Calendar Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .demo-section {
            padding: 40px;
        }
        
        .demo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .demo-card {
            background: #f8fafc;
            border-radius: 12px;
            padding: 30px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        
        .demo-card:hover {
            border-color: #4f46e5;
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        
        .demo-card h3 {
            color: #1e293b;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }
        
        .btn {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            margin-bottom: 15px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #374151;
        }
        
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #4f46e5;
        }
        
        .events-container {
            max-height: 400px;
            overflow-y: auto;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            background: white;
        }
        
        .event-item {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #4f46e5;
        }
        
        .event-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 5px;
        }
        
        .event-time {
            color: #64748b;
            font-size: 0.9rem;
        }
        
        .status {
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .status.success {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        
        .status.error {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }
        
        .status.info {
            background: #dbeafe;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4f46e5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .demo-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .demo-section {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 MasterEverything.AI</h1>
            <p>Google Calendar Automation Demo</p>
        </div>
        
        <div class="demo-section">
            <div class="demo-grid">
                <div class="demo-card">
                    <h3>📅 Load Calendar Events</h3>
                    <button class="btn" onclick="loadEvents()" id="loadBtn">
                        Load My Calendar Events
                    </button>
                    <div id="eventsContainer" class="events-container" style="display: none;">
                        <div id="eventsList"></div>
                    </div>
                    <div id="loadStatus"></div>
                </div>
                
                <div class="demo-card">
                    <h3>➕ Create New Event</h3>
                    <form id="eventForm">
                        <div class="form-group">
                            <label for="eventTitle">Event Title *</label>
                            <input type="text" id="eventTitle" placeholder="Meeting with client" required>
                        </div>
                        <div class="form-group">
                            <label for="eventDescription">Description</label>
                            <textarea id="eventDescription" placeholder="Optional description" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="eventStart">Start Date & Time *</label>
                            <input type="datetime-local" id="eventStart" required>
                        </div>
                        <div class="form-group">
                            <label for="eventEnd">End Date & Time *</label>
                            <input type="datetime-local" id="eventEnd" required>
                        </div>
                        <div class="form-group">
                            <label for="eventLocation">Location</label>
                            <input type="text" id="eventLocation" placeholder="Office, Zoom, etc.">
                        </div>
                        <button type="submit" class="btn" id="createBtn">
                            Create Calendar Event
                        </button>
                    </form>
                    <div id="createStatus"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;
        
        // Set default datetime values
        document.addEventListener('DOMContentLoaded', function() {
            const now = new Date();
            const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
            
            document.getElementById('eventStart').value = startTime.toISOString().slice(0, 16);
            document.getElementById('eventEnd').value = endTime.toISOString().slice(0, 16);
        });
        
        async function loadEvents() {
            const loadBtn = document.getElementById('loadBtn');
            const statusDiv = document.getElementById('loadStatus');
            const eventsContainer = document.getElementById('eventsContainer');
            const eventsList = document.getElementById('eventsList');
            
            loadBtn.disabled = true;
            loadBtn.innerHTML = '<span class="loading"></span>Loading Events...';
            statusDiv.innerHTML = '<div class="status info">Fetching your calendar events...</div>';
            
            try {
                const response = await fetch(API_BASE + '/api/events');
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load events');
                }
                
                if (data.events && data.events.length > 0) {
                    let eventsHtml = '';
                    data.events.forEach(event => {
                        const startTime = event.start?.dateTime || event.start?.date;
                        const formattedTime = startTime ? new Date(startTime).toLocaleString() : 'No time specified';
                        
                        eventsHtml += \`
                            <div class="event-item">
                                <div class="event-title">\${event.summary || 'Untitled Event'}</div>
                                <div class="event-time">\${formattedTime}</div>
                                \${event.description ? '<div style="margin-top: 8px; color: #64748b;">' + event.description + '</div>' : ''}
                            </div>
                        \`;
                    });
                    
                    eventsList.innerHTML = eventsHtml;
                    eventsContainer.style.display = 'block';
                    statusDiv.innerHTML = \`<div class="status success">✅ Loaded \${data.events.length} events successfully!</div>\`;
                } else {
                    eventsList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No upcoming events found.</div>';
                    eventsContainer.style.display = 'block';
                    statusDiv.innerHTML = '<div class="status info">No upcoming events found in your calendar.</div>';
                }
            } catch (error) {
                console.error('Error loading events:', error);
                statusDiv.innerHTML = \`<div class="status error">❌ Error: \${error.message}</div>\`;
                eventsContainer.style.display = 'none';
            } finally {
                loadBtn.disabled = false;
                loadBtn.innerHTML = 'Load My Calendar Events';
            }
        }
        
        document.getElementById('eventForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const createBtn = document.getElementById('createBtn');
            const statusDiv = document.getElementById('createStatus');
            
            createBtn.disabled = true;
            createBtn.innerHTML = '<span class="loading"></span>Creating Event...';
            statusDiv.innerHTML = '<div class="status info">Creating your calendar event...</div>';
            
            try {
                const formData = {
                    summary: document.getElementById('eventTitle').value,
                    description: document.getElementById('eventDescription').value,
                    startDateTime: new Date(document.getElementById('eventStart').value).toISOString(),
                    endDateTime: new Date(document.getElementById('eventEnd').value).toISOString(),
                    location: document.getElementById('eventLocation').value
                };
                
                const response = await fetch(API_BASE + '/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to create event');
                }
                
                statusDiv.innerHTML = '<div class="status success">✅ Event created successfully!</div>';
                
                // Reset form
                document.getElementById('eventForm').reset();
                
                // Set new default times
                const now = new Date();
                const startTime = new Date(now.getTime() + 60 * 60 * 1000);
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                document.getElementById('eventStart').value = startTime.toISOString().slice(0, 16);
                document.getElementById('eventEnd').value = endTime.toISOString().slice(0, 16);
                
            } catch (error) {
                console.error('Error creating event:', error);
                statusDiv.innerHTML = \`<div class="status error">❌ Error: \${error.message}</div>\`;
            } finally {
                createBtn.disabled = false;
                createBtn.innerHTML = 'Create Calendar Event';
            }
        });
    </script>
</body>
</html>
  `;
  res.send(html);
});

// Debug OAuth endpoint - forces fresh auth flow
app.get('/debug-auth', (req, res) => {
  const scopes = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });
  console.log('Forcing OAuth flow - redirecting to:', authUrl);
  return res.redirect(authUrl);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MasterEverything.AI Google Calendar API is running!',
    status: 'active',
    refreshTokenExists: !!process.env.GOOGLE_REFRESH_TOKEN,
    clientIdExists: !!process.env.GOOGLE_CLIENT_ID,
    endpoints: {
      health: '/api/health',
      events: '/api/events',
      createEvent: 'POST /api/events',
      demo: '/demo',
      auth: '/api/auth',
      debugAuth: '/debug-auth'
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MasterEverything.AI Server running on port ${PORT}`);
  console.log(`📍 Demo available at: http://localhost:${PORT}/demo`);
  console.log(`🔗 API available at: http://localhost:${PORT}/api/`);
});
