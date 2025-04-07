from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import uuid
import os
import json
from dotenv import load_dotenv
import client_agent
import models
import logging
import uvicorn

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("fastapi.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
error_logger = logging.getLogger("error")
error_logger.setLevel(logging.ERROR)
error_handler = logging.FileHandler("fastapi_error.log")
error_logger.addHandler(error_handler)

app = FastAPI(title="Travel Planner API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for travel requests
travel_requests = {}

class TravelRequestInput(BaseModel):
    prompt: str
    preferences: Dict[str, Any]
    date_from: str
    date_to: str
    location: str

class TravelRequestStatus(BaseModel):
    request_id: str
    status: str = "pending"
    progress: Optional[float] = 0.0
    message: Optional[str] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Welcome to the Travel Planner API"}

@app.post("/travel/request", status_code=status.HTTP_202_ACCEPTED)
async def create_travel_request(
    request_data: TravelRequestInput,
    background_tasks: BackgroundTasks
):
    """Create a new travel request and process it in the background"""
    request_id = str(uuid.uuid4())
    
    # Store the request with initial status
    travel_requests[request_id] = {
        "status": "pending",
        "progress": 0.0,
        "message": "Request received, processing starting...",
        "request_data": request_data.dict(),
        "result": None,
        "created_at": datetime.now().isoformat(),
    }
    
    # Process request in background
    background_tasks.add_task(process_travel_request, request_id)
    
    return {"request_id": request_id, "status": "pending"}

@app.get("/travel/status/{request_id}", response_model=TravelRequestStatus)
async def get_travel_request_status(request_id: str):
    """Get the status of a travel request"""
    if request_id not in travel_requests:
        raise HTTPException(status_code=404, detail="Travel request not found")
    
    request_info = travel_requests[request_id]
    return {
        "request_id": request_id,
        "status": request_info["status"],
        "progress": request_info["progress"],
        "message": request_info["message"],
        "error": request_info.get("error")
    }

@app.get("/travel/result/{request_id}")
async def get_travel_result(request_id: str):
    """Get the final result of a completed travel request"""
    if request_id not in travel_requests:
        raise HTTPException(status_code=404, detail="Travel request not found")
    
    request_info = travel_requests[request_id]
    
    if request_info["status"] != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Travel request is not completed yet. Current status: {request_info['status']}"
        )
    
    return request_info["result"]

async def process_travel_request(request_id: str):
    """Process the travel request using agents and update status"""
    request_info = travel_requests[request_id]
    request_data = request_info["request_data"]
    
    try:
        # Update status to processing
        travel_requests[request_id]["status"] = "processing"
        travel_requests[request_id]["progress"] = 0.1
        travel_requests[request_id]["message"] = "Initializing agents..."
        
        # Initialize the agent
        travel_requests[request_id]["progress"] = 0.2
        travel_requests[request_id]["message"] = "Analyzing travel preferences..."
        
        # Run information gathering (25% progress)
        travel_requests[request_id]["progress"] = 0.25
        travel_requests[request_id]["message"] = "Gathering travel information..."
        
        # Call the agent to generate itinerary
        travel_requests[request_id]["progress"] = 0.5
        travel_requests[request_id]["message"] = "Generating itinerary..."
        
        # Use the client_agent to generate the itinerary
        agent = client_agent.TravelAgent()
        itinerary = await agent.generate_itinerary(
            location=request_data["location"],
            date_from=request_data["date_from"],
            date_to=request_data["date_to"],
            preferences=request_data["preferences"],
            prompt=request_data["prompt"]
        )
        
        # Final processing
        travel_requests[request_id]["progress"] = 0.9
        travel_requests[request_id]["message"] = "Finalizing itinerary..."
        
        # Update the request with the result
        travel_requests[request_id]["status"] = "completed"
        travel_requests[request_id]["progress"] = 1.0
        travel_requests[request_id]["message"] = "Itinerary generation complete"
        travel_requests[request_id]["result"] = itinerary
        travel_requests[request_id]["completed_at"] = datetime.now().isoformat()
        
    except Exception as e:
        error_msg = f"Error processing travel request: {str(e)}"
        logger.error(error_msg)
        error_logger.error(error_msg, exc_info=True)
        
        travel_requests[request_id]["status"] = "failed"
        travel_requests[request_id]["message"] = "Failed to generate itinerary"
        travel_requests[request_id]["error"] = str(e)

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=3000, reload=True)