
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import json
import os
import asyncio
import subprocess
import uuid
import time
from typing import Dict, List, Any, Optional

# Import your existing models
from models import TravelRequest, TravelPlan, ItineraryResponse

app = FastAPI(title="Travel Itinerary API", description="API for generating travel itineraries")

# Store for tracking request status
request_status = {}

# Global processes for the agents
info_agent_process = None
map_agent_process = None

def start_agent_processes():
    """Start the info agent and map agent processes if they're not already running"""
    global info_agent_process, map_agent_process
    
    # Start info agent if not running
    if info_agent_process is None or info_agent_process.poll() is not None:
        info_agent_process = subprocess.Popen(
            ["python", "InfoAgent/infoagent.py"],
            env=os.environ.copy(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"Started info agent process with PID: {info_agent_process.pid}")
    
    # Start map agent if not running
    if map_agent_process is None or map_agent_process.poll() is not None:
        map_agent_process = subprocess.Popen(
            ["python", "MapAgent/mapagent.py"],
            env=os.environ.copy(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"Started map agent process with PID: {map_agent_process.pid}")
    
    # Give agents time to initialize
    time.sleep(5)

async def process_travel_request(request_id: str, travel_request: Dict[str, Any]):
    try:
        # Create a unique directory for this request
        request_dir = f"requests/{request_id}"
        os.makedirs(request_dir, exist_ok=True)
        
        # Save the travel request to a JSON file
        input_file_path = f"{request_dir}/travel_request.json"
        with open(input_file_path, 'w') as f:
            json.dump(travel_request, f, indent=4)
        
        # Ensure the agent processes are running
        start_agent_processes()
        
        # Set environment variables for the client agent
        env = os.environ.copy()
        env["INPUT_FILE_PATH"] = input_file_path
        
        # Get agent addresses from environment or use defaults
        info_agent_address = os.environ.get("INFOAGENT")
        map_agent_address = os.environ.get("MAP_AGENT")
        
        env["INFOAGENT"] = info_agent_address
        env["MAP_AGENT"] = map_agent_address
        
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
            itinerary_path = "final_itinerary.json"  # Default path in current directory
            alt_itinerary_path = f"{request_dir}/final_itinerary.json"  # Alternative path
            
            # Try to find the itinerary file
            if os.path.exists(itinerary_path):
                with open(itinerary_path, 'r') as f:
                    itinerary_data = json.load(f)
                # Move the file to the request directory
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
                # Check if there was an error
                error_path = "map_agent_error.json"
                alt_error_path = f"{request_dir}/map_agent_error.json"
                
                if os.path.exists(error_path):
                    with open(error_path, 'r') as f:
                        error_data = json.load(f)
                    # Move the file to the request directory
                    os.rename(error_path, alt_error_path)
                    request_status[request_id] = {
                        "status": "failed", 
                        "error": error_data.get("error", "Unknown error")
                    }
                elif os.path.exists(alt_error_path):
                    with open(alt_error_path, 'r') as f:
                        error_data = json.load(f)
                    request_status[request_id] = {
                        "status": "failed", 
                        "error": error_data.get("error", "Unknown error")
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
    # Validate that the request has the required fields
    required_fields = ["prompt", "preferences", "date_from", "date_to", "location"]
    for field in required_fields:
        if field not in travel_request:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required field: {field}"
            )
    
    request_id = str(uuid.uuid4())
    request_status[request_id] = {"status": "pending"}
    
    # Process the request in the background
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
    
    # Calculate elapsed time if processing
    if status_info.get("status") == "processing" and "start_time" in status_info:
        elapsed = time.time() - status_info["start_time"]
        response = {
            "status": status_info["status"],
            "elapsed_seconds": round(elapsed, 1)
        }
    else:
        # Don't include the process object in the response
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

@app.get("/agents/status", response_model=Dict[str, Any])
async def get_agents_status():
    """
    Check the status of the agent processes.
    """
    global info_agent_process, map_agent_process
    
    info_status = "not_running"
    map_status = "not_running"
    
    if info_agent_process is not None:
        if info_agent_process.poll() is None:
            info_status = "running"
        else:
            info_status = f"exited with code {info_agent_process.returncode}"
    
    if map_agent_process is not None:
        if map_agent_process.poll() is None:
            map_status = "running"
        else:
            map_status = f"exited with code {map_agent_process.returncode}"
    
    return {
        "info_agent": info_status,
        "map_agent": map_status
    }

@app.post("/agents/restart", response_model=Dict[str, str])
async def restart_agents():
    """
    Restart the agent processes.
    """
    global info_agent_process, map_agent_process
    
    # Kill existing processes if they're running
    if info_agent_process is not None and info_agent_process.poll() is None:
        info_agent_process.kill()
    
    if map_agent_process is not None and map_agent_process.poll() is None:
        map_agent_process.kill()
    
    # Start new processes
    start_agent_processes()
    
    return {"status": "Agents restarted successfully"}

@app.on_event("startup")
async def startup_event():
    """Create the requests directory and start agent processes on startup"""
    os.makedirs("requests", exist_ok=True)
    start_agent_processes()

@app.on_event("shutdown")
async def shutdown_event():
    """Terminate agent processes on shutdown"""
    global info_agent_process, map_agent_process
    
    if info_agent_process is not None and info_agent_process.poll() is None:
        info_agent_process.terminate()
    
    if map_agent_process is not None and map_agent_process.poll() is None:
        map_agent_process.terminate()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
