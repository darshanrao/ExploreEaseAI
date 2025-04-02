#!/bin/bash

# Start the FastAPI server in the background
./start_fastapi.sh &

# Start the Express server (Vite dev server)
npm run dev