from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import json
import os
import asyncio
import subprocess
import uuid
import time
from typing import Dict, List, Any, Optional

app = FastAPI(title="Travel Itinerary API", description="API for generating travel itineraries")

# Store for tracking request status
request_status = {}

async def process_travel_request(request_id: str, travel_request: Dict[str, Any]):
    try:
        # Create a unique directory for this request
        request_dir = f"requests/{request_id}"
        os.makedirs(request_dir, exist_ok=True)
        
        # Save the travel request to a JSON file
        input_file_path = f"{request_dir}/travel_request.json"
        with open(input_file_path, 'w') as f:
            json.dump(travel_request, f, indent=4)
        
        # Set environment variables for the client agent
        env = os.environ.copy()
        env["INPUT_FILE_PATH"] = input_file_path
        
        # Run the client agent as a subprocess
        client_process = subprocess.Popen(
            ["python", "client_agent.py"],
            env=env,
            cwd=os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Update status to processing
        request_status[request_id] = {
            "status": "processing", 
            "process": client_process,
            "start_time": time.time()
        }
        
        # Wait for the process to complete (with timeout)
        try:
            stdout, stderr = client_process.communicate(timeout=300)  # 5 minutes timeout
            
            # Log the output for debugging
            with open(f"{request_dir}/client_stdout.log", 'wb') as f:
                f.write(stdout)
            with open(f"{request_dir}/client_stderr.log", 'wb') as f:
                f.write(stderr)
            
            # Check if the final itinerary was generated
            itinerary_path = "final_itinerary.json"
            alt_itinerary_path = f"{request_dir}/final_itinerary.json"
            
            if os.path.exists(itinerary_path):
                with open(itinerary_path, 'r') as f:
                    itinerary_data = json.load(f)
                os.rename(itinerary_path, alt_itinerary_path)
                request_status[request_id] = {
                    "status": "completed", 
                    "data": itinerary_data
                }
            elif os.path.exists(alt_itinerary_path):
                with open(alt_itinerary_path, 'r') as f:
                    itinerary_data = json.load(f)
                request_status[request_id] = {
                    "status": "completed", 
                    "data": itinerary_data
                }
            else:
                request_status[request_id] = {
                    "status": "failed", 
                    "error": "Failed to generate itinerary"
                }
        except subprocess.TimeoutExpired:
            client_process.kill()
            request_status[request_id] = {
                "status": "failed", 
                "error": "Request timed out after 5 minutes"
            }
            
    except Exception as e:
        request_status[request_id] = {
            "status": "failed", 
            "error": str(e)
        }

@app.post("/travel/request", response_model=Dict[str, str])
async def create_travel_request(
    travel_request: Dict[str, Any],
    background_tasks: BackgroundTasks
):
    """
    Submit a travel request to generate an itinerary.
    Returns a request ID that can be used to check the status and retrieve results.
    """
    required_fields = ["prompt", "preferences", "date_from", "date_to", "location"]
    for field in required_fields:
        if field not in travel_request:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required field: {field}"
            )
    
    request_id = str(uuid.uuid4())
    request_status[request_id] = {"status": "pending"}
    
    background_tasks.add_task(process_travel_request, request_id, travel_request)
    
    return {"request_id": request_id, "status": "pending"}

@app.get("/travel/status/{request_id}", response_model=Dict[str, Any])
async def get_request_status(request_id: str):
    """
    Check the status of a travel request.
    """
    if request_id not in request_status:
        raise HTTPException(status_code=404, detail="Request not found")
    
    status_info = request_status[request_id]
    
    if status_info.get("status") == "processing" and "start_time" in status_info:
        elapsed = time.time() - status_info["start_time"]
        response = {
            "status": status_info["status"],
            "elapsed_seconds": round(elapsed, 1)
        }
    else:
        response = {k: v for k, v in status_info.items() 
                   if k not in ["process", "start_time"]}
    
    return response

@app.get("/travel/result/{request_id}")
async def get_travel_result(request_id: str):
    """
    Get the final itinerary for a completed travel request.
    """
    if request_id not in request_status:
        raise HTTPException(status_code=404, detail="Request not found")
    
    status_info = request_status[request_id]
    
    if status_info.get("status") != "completed":
        if status_info.get("status") == "failed":
            raise HTTPException(
                status_code=400, 
                detail=f"Request failed: {status_info.get('error', 'Unknown error')}"
            )
        else:
            raise HTTPException(
                status_code=202, 
                detail=f"Request is still {status_info.get('status', 'processing')}"
            )
    
    return status_info.get("data", {"itinerary": []})

@app.on_event("startup")
async def startup_event():
    """Create the requests directory on startup"""
    os.makedirs("requests", exist_ok=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
