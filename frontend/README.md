# Travel Planner with FastAPI Agents

This project combines a React frontend with a FastAPI backend that uses AI agents to generate personalized travel itineraries.

## How to Run the Project

### Prerequisites
- Node.js 
- Python 3.11 or later
- Anthropic API key

### Setup Environment
1. Clone the repository
2. Create a `.env` file in the root directory with the following variables:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### Install Dependencies

#### Python Dependencies
```bash
pip install fastapi uvicorn pydantic anthropic python-dotenv httpx
```

#### Node.js Dependencies
```bash
npm install
```

### Running the Application

**Step 1: Start the FastAPI Backend**
```bash
./run_fastapi.sh
```
This will start the FastAPI server on port 5173.

**Step 2: Start the React Frontend**
In a new terminal:
```bash
npm run dev
```
This will start the frontend on port 5000.

**Access the Application**
Open your browser and go to `http://localhost:5000`

## Application Architecture

- **Frontend**: React with TypeScript, using Shadcn UI components and TailwindCSS
- **Backend**: FastAPI Python server that connects with various AI agents:
  - **InfoAgent**: Gathers information about destinations
  - **MapAgent**: Handles location-based data and mapping
  - **Claude (Anthropic)**: Generates personalized travel itineraries

## API Endpoints

### FastAPI Backend Endpoints
- `POST /travel/request`: Submit a travel request with preferences
- `GET /travel/status/{request_id}`: Check the status of a travel request
- `GET /travel/result/{request_id}`: Get the final itinerary once processing is complete

## Implementation Notes

The application workflow:
1. User enters preferences in the frontend
2. Frontend sends request to FastAPI's `/travel/request` endpoint
3. FastAPI processes in background with AI agents
4. Frontend periodically polls `/travel/status/{request_id}`
5. Once complete, frontend fetches results from `/travel/result/{request_id}`
6. Results are displayed as an interactive itinerary to the user