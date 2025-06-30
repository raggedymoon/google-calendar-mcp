FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy the entire project (so it can use other files too if needed)
COPY . .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Tell Flask which app to run
ENV FLASK_APP=calendar_mcp_server.py

# Start Flask app
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
