#!/bin/bash

# Start both the FastAPI server and the Express server

# Start the FastAPI server in the background
uvicorn app:app --host 0.0.0.0 --port 3000 &
FASTAPI_PID=$!

# Start the Express server
npm run dev

# When the Express server is stopped, also stop the FastAPI server
kill $FASTAPI_PID