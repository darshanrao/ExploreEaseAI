#!/bin/bash

# Kill any existing Python processes (FastAPI servers)
pkill -f "python app.py" || true

# Start the FastAPI server in the background
echo "Starting FastAPI server..."
python app.py &
FASTAPI_PID=$!

# Wait a moment for the FastAPI server to initialize
sleep 3

# Check if the FastAPI server is running
if curl -s http://localhost:3000/ > /dev/null; then
  echo "FastAPI server is running at http://localhost:3000/"
else
  echo "WARNING: FastAPI server doesn't seem to be running. Travel planning features may not work."
fi

# Start the Express server
echo "Starting Express server..."
npm run dev

# When the Express server exits, also kill the FastAPI server
echo "Shutting down FastAPI server..."
kill $FASTAPI_PID || true