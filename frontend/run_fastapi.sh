#!/bin/bash

# Start the FastAPI server
cd $(dirname $0)
python -m uvicorn app:app --host 0.0.0.0 --port 5173 --reload