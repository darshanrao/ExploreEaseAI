#!/bin/bash

# Start the FastAPI server in the background with proper logging
echo "Starting FastAPI server..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info > fastapi.log 2>&1 &
FASTAPI_PID=$!

# Give FastAPI server a moment to start
sleep 3
echo "FastAPI server started with PID: $FASTAPI_PID"

# Start the Express server
echo "Starting Express server..."
npm run dev

# When the Express server exits, also kill the FastAPI server
kill $FASTAPI_PID