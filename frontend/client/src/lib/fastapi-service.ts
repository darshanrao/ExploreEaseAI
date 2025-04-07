import axios from 'axios';

// Use the Express proxy instead of direct FastAPI connection
// Express will forward requests to FastAPI (see server/routes.ts)
const API_BASE = 'http://localhost:8000'; // Empty base URL to use relative paths with the current host

// Initialize Axios instance for FastAPI requests
const fastApiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interface for travel request data
export interface TravelRequestParams {
  prompt: string;
  preferences: {
    travel_style: string;
    food_preference: string;
    budget: string;
    transport_mode: string;
    time_preference: string;
    activity_intensity: string;
    interests: string[];
    custom_preferences?: string;
  };
  date_from: string;
  date_to: string;
  location: string;
}

// Response from creating a travel request
export interface TravelRequestResponse {
  request_id: string;
  status: string;
}

// Status of a travel request
export interface TravelRequestStatus {
  request_id: string;
  status: string;
  progress: number;
  message?: string;
  error?: string;
}

// Itinerary point in the response
export interface ItineraryPoint {
  type: string;
  time: string;
  end_time?: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  rating?: number;
  
  // Additional fields for enhanced display
  attraction_type?: string;      // Type of attraction (restaurant, museum, etc.)
  vicinity?: string;            // Human-readable address/vicinity
  image_reference?: string;     // Reference to an image
}

/**
 * Submit a travel request to the FastAPI backend
 * @param requestData Travel request data
 * @returns Promise with request_id and status
 */
export async function submitTravelRequest(requestData: TravelRequestParams): Promise<TravelRequestResponse> {
  try {
    const response = await fastApiClient.post('/travel/request', requestData);
    return response.data;
  } catch (error) {
    console.error('Error submitting travel request:', error);
    throw error;
  }
}

/**
 * Check the status of a travel request
 * @param requestId The ID of the travel request
 * @returns Promise with request status information
 */
export async function checkTravelRequestStatus(requestId: string): Promise<TravelRequestStatus> {
  try {
    const response = await fastApiClient.get(`/travel/status/${requestId}`);
    return response.data;
  } catch (error) {
    console.error(`Error checking travel request status for ${requestId}:`, error);
    throw error;
  }
}

/**
 * Get the result of a completed travel request
 * @param requestId The ID of the travel request
 * @returns Promise with the itinerary data
 */
// export async function getTravelResult(requestId: string): Promise<ItineraryPoint[]> {
//   try {
//     const response = await fastApiClient.get(`/travel/result/${requestId}`);
//     return response.data;
//   } catch (error) {
//     console.error(`Error getting travel result for ${requestId}:`, error);
//     throw error;
//   }
// }
// export async function getTravelResult(requestId: string): Promise<ItineraryPoint[]> {
//   try {
//     const response = await fastApiClient.get(`/travel/result/${requestId}`);
//     if (!response.data) {
//       console.error('No data returned from travel result endpoint');
//       return []; // Return empty array instead of null/undefined
//     }
//     return response.data;
//   } catch (error) {
//     console.error(`Error getting travel result for ${requestId}:`, error);
//     throw error;
//   }
// }
export async function getTravelResult(requestId: string): Promise<ItineraryPoint[]> {
  try {
    const response = await fastApiClient.get(`/travel/result/${requestId}`);
    console.log('Result response:', JSON.stringify(response.data, null, 2));  
    if (!response.data) {
      console.error('No data returned from travel result endpoint');
      return []; // Return empty array instead of null/undefined
    }
    // Handle the nested itinerary array
    return response.data.itinerary || [];
  } catch (error) {
    console.error(`Error getting travel result for ${requestId}:`, error);
    throw error;
  }
}

/**
 * Poll a travel request until it's complete or failed
 * @param requestId The ID of the travel request
 * @param onStatusUpdate Optional callback for status updates
 * @param maxAttempts Maximum number of polling attempts
 * @param interval Interval between polls in milliseconds
 */
export async function pollTravelRequest(
  requestId: string,
  onStatusUpdate?: (status: TravelRequestStatus) => void,
  maxAttempts: number = 30,
  interval: number = 2000
): Promise<ItineraryPoint[]> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await checkTravelRequestStatus(requestId);
    console.log('Status response:', JSON.stringify(status, null, 2));
    
    // Call status update callback if provided
    if (onStatusUpdate) {
      onStatusUpdate(status);
    }
    
    // If complete, return the result
    if (status.status === 'completed') {
      return await getTravelResult(requestId);
    }
    
    // If failed, throw an error
    if (status.status === 'failed') {
      throw new Error(status.error || 'Travel request failed');
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }
  
  throw new Error('Polling timed out');
}