FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy your Flask app into the image
COPY calendar_mcp_server.py /app/

# Install required Python packages
RUN pip install --no-cache-dir flask google-api-python-client google-auth google-auth-oauthlib

# Let Flask know which app to run
ENV FLASK_APP=calendar_mcp_server.py

# Use CMD to start the Flask server (host 0.0.0.0 makes it reachable from outside container)
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
