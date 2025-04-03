# Travel Itinerary API Documentation

## Overview

This API provides a service for generating personalized travel itineraries using AI agents. The system processes travel requests asynchronously and returns detailed itineraries with attractions, dining options, and travel logistics.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently, the API does not require authentication.

## Endpoints

### 1. Submit Travel Request

Creates a new travel itinerary request.

**Endpoint:** `POST /travel/request`

**Request Body:**

```json
{
  "prompt": "string",
  "preferences": {
    "travel_style": "string",
    "food_preference": "string",
    "budget": "string",
    "transport_mode": "string",
    "time_preference": "string",
    "activity_intensity": "string",
    "interests": ["string"],
    "custom_preferences": "string"
  },
  "date_from": "string",
  "date_to": "string",
  "location": "string"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:8000/travel/request" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "I want to explore Hollywood, visit beaches, and try local food in Los Angeles",
    "preferences": {
      "travel_style": "relaxed",
      "food_preference": "California cuisine",
      "budget": "1-4",
      "transport_mode": "car",
      "time_preference": "afternoon",
      "activity_intensity": "moderate",
      "interests": ["beaches", "entertainment", "food", "landmarks"],
      "custom_preferences": "I'\''d like to see some movie studios and celebrity spots"
    },
    "date_from": "2025-04-15 09:00",
    "date_to": "2025-04-15 22:00",
    "location": "Los Angeles"
  }'
```

**Response:**

```json
{
  "request_id": "0bcabef2-cb18-4db8-b0ca-7a1c66624707",
  "status": "pending"
}
```

### 2. Check Request Status

Checks the status of a previously submitted travel request.

**Endpoint:** `GET /travel/status/{request_id}`

**Example Request:**

```bash
curl -X GET "http://localhost:8000/travel/status/0bcabef2-cb18-4db8-b0ca-7a1c66624707"
```

**Response (Processing):**

```json
{
  "status": "processing",
  "elapsed_seconds": 45.2
}
```

**Response (Completed):**

```json
{
  "status": "completed",
  "data": {
    "itinerary": [...]
  }
}
```

**Response (Failed):**

```json
{
  "status": "failed",
  "error": "Error message"
}
```

### 3. Get Travel Itinerary

Retrieves the final itinerary for a completed travel request.

**Endpoint:** `GET /travel/result/{request_id}`

**Example Request:**

```bash
curl -X GET "http://localhost:8000/travel/result/0bcabef2-cb18-4db8-b0ca-7a1c66624707"
```

**Response:**

```json
{
  "itinerary": [
    {
      "type": "start",
      "time": "2025-04-15 09:00",
      "location": "Los Angeles, California, US",
      "coordinates": {
        "lat": 34.0549076,
        "lng": -118.242643
      },
      "description": "Starting point"
    },
    {
      "type": "attraction",
      "time": "2025-04-15 09:00",
      "end_time": "2025-04-15 11:00",
      "location": "The Walk Of Fun Hollywood",
      "coordinates": {
        "lat": 34.1013572,
        "lng": -118.3428884
      },
      "description": "Visit The Walk Of Fun Hollywood",
      "rating": 5,
      "attraction_type": "tourist_attraction",
      "vicinity": "[NEW MEETING POINT] In front of Andre's Pizza | 7038 Hollywood Blvd, Los Angeles CA90028, Los Angeles"
    },
    // Additional itinerary items...
  ]
}
```

### 4. Check Agent Status

Checks the status of the backend agent processes.

**Endpoint:** `GET /agents/status`

**Example Request:**

```bash
curl -X GET "http://localhost:8000/agents/status"
```

**Response:**

```json
{
  "info_agent": "running",
  "map_agent": "running"
}
```

### 5. Restart Agents

Restarts the backend agent processes if they're not functioning correctly.

**Endpoint:** `POST /agents/restart`

**Example Request:**

```bash
curl -X POST "http://localhost:8000/agents/restart"
```

**Response:**

```json
{
  "status": "Agents restarted successfully"
}
```

## Itinerary Object Structure

The itinerary consists of an array of items, each with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Type of item: "start", "end", "attraction", "travel", "food", etc. |
| `time` | string | Start time in format "YYYY-MM-DD HH:MM" |
| `end_time` | string | End time (for activities) |
| `location` | string | Name of the location |
| `coordinates` | object | Latitude and longitude coordinates |
| `description` | string | Description of the activity or location |
| `rating` | number | Rating (for attractions and restaurants) |
| `attraction_type` | string | Type of attraction (for attractions) |
| `vicinity` | string | Address or vicinity information |
| `image_reference` | string | Reference to an image (if available) |

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Request successful
- `202 Accepted`: Request is being processed
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Debugging

If you encounter issues with your requests:

1. Check the agent status using the `/agents/status` endpoint
2. If agents are not running, restart them using `/agents/restart`
3. Examine the logs in the `requests/{request_id}/` directory
4. For persistent issues, check the server logs

## Rate Limiting

Currently, there are no rate limits implemented, but please be considerate with your request frequency.

## Notes

- Itinerary generation may take several minutes to complete
- The system uses multiple AI agents working together to create personalized itineraries
- Date formats should be in "YYYY-MM-DD HH:MM" format for best results