@echo off
cd /d %~dp0
docker build -t google-calendar-mcp .
echo {"method": "list_events"} | docker run -i --rm google-calendar-mcp
pause
