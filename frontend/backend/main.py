from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from backend.routes.calendar import router as calendar_router
from backend.routes.preferences import router as preferences_router
from backend.routes.recommendations import router as recommendations_router

app = FastAPI(title="TripSync API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(preferences_router, prefix="/api", tags=["preferences"])
app.include_router(calendar_router, prefix="/api", tags=["calendar"])
app.include_router(recommendations_router, prefix="/api", tags=["recommendations"])

@app.get("/")
async def root():
    return {"message": "Welcome to TripSync API"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)