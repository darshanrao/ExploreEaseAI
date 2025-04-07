import { ItineraryPoint } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

// Requests that are currently being processed
const activeRequests = new Map<string, {
  status: 'pending' | 'completed' | 'failed',
  progress: number,
  message?: string,
  error?: string,
  result?: ItineraryPoint[]
}>();

// Use Anthropic client if API key is available
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null;

// Initialize the Anthropic client
console.log(`Anthropic API available: ${!!anthropic}`);

/**
 * Submit a new travel request
 * @param requestData Travel request data (location, dates, preferences)
 * @returns Object with request_id and status
 */
export async function submitTravelRequest(requestData: any) {
  // Generate a unique ID for this request
  const requestId = uuidv4();
  
  // Initialize request status
  activeRequests.set(requestId, {
    status: 'pending',
    progress: 0.1,
    message: 'Starting itinerary generation'
  });
  
  // Process the request in the background
  processTravelRequest(requestId, requestData).catch(error => {
    console.error(`Error processing travel request ${requestId}:`, error);
    activeRequests.set(requestId, {
      status: 'failed',
      progress: 0,
      error: error.message || 'Unknown error occurred'
    });
  });
  
  // Return the request ID and initial status
  return {
    request_id: requestId,
    status: 'pending'
  };
}

/**
 * Check the status of a travel request
 * @param requestId ID of the request to check
 * @returns Status object with progress and any messages or errors
 */
export function getTravelRequestStatus(requestId: string) {
  const request = activeRequests.get(requestId);
  
  if (!request) {
    return {
      request_id: requestId,
      status: 'failed',
      progress: 0,
      error: 'Request not found'
    };
  }
  
  return {
    request_id: requestId,
    status: request.status,
    progress: request.progress,
    message: request.message,
    error: request.error
  };
}

/**
 * Get the final result of a completed travel request
 * @param requestId ID of the completed request
 * @returns Array of itinerary points, or null if not available
 */
export function getTravelResult(requestId: string) {
  const request = activeRequests.get(requestId);
  
  if (!request || request.status !== 'completed') {
    throw new Error('Request not completed or not found');
  }
  
  return request.result || [];
}

/**
 * Process a travel request in the background
 * @param requestId ID of the request to process
 * @param requestData Travel request data
 */
async function processTravelRequest(requestId: string, requestData: any) {
  try {
    console.log(`[DEBUG] Processing travel request ${requestId} for ${requestData.location}`);
    
    // Update progress - step 1: 20%
    activeRequests.set(requestId, {
      ...activeRequests.get(requestId)!,
      progress: 0.2,
      message: 'Analyzing location and preferences'
    });
    
    // Simulate API processing time (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract data from the request
    const { location, date_from, date_to, preferences } = requestData;
    const startDate = new Date(date_from);
    const endDate = new Date(date_to);
    const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Update progress - step 2: 40%
    activeRequests.set(requestId, {
      ...activeRequests.get(requestId)!,
      progress: 0.4,
      message: 'Generating itinerary points'
    });
    
    // Simulate more processing time (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update progress - step 3: 60%
    activeRequests.set(requestId, {
      ...activeRequests.get(requestId)!,
      progress: 0.6,
      message: 'Creating personalized recommendations'
    });
    
    // Generate itinerary points using our demo data function
    const itineraryPoints = await generateAIItinerary(requestData);
    
    // Simulate final processing time (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update progress - step 4: 80%
    activeRequests.set(requestId, {
      ...activeRequests.get(requestId)!,
      progress: 0.8,
      message: 'Finalizing your travel plan'
    });
    
    // One more delay for visual effect (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Final update - completed (100%)
    activeRequests.set(requestId, {
      status: 'completed',
      progress: 1.0,
      message: 'Itinerary generation complete',
      result: itineraryPoints
    });
    
    console.log(`[DEBUG] Completed travel request ${requestId} with ${itineraryPoints.length} points`);
    
  } catch (error: any) {
    console.error(`Error in processTravelRequest for ${requestId}:`, error);
    
    // Update status to failed
    activeRequests.set(requestId, {
      status: 'failed',
      progress: 0,
      error: error.message || 'Unknown error occurred'
    });
  }
}

/**
 * Generate an itinerary using the Anthropic Claude model
 * @param requestData Travel request data
 * @returns Array of ItineraryPoint objects
 */
async function generateAIItinerary(requestData: any): Promise<ItineraryPoint[]> {
  console.log("[DEBUG] Generating demo itinerary data instead of using Anthropic API");
  
  // Extract location and dates for customizing the dummy data
  const { location, date_from, date_to } = requestData;
  const startDate = new Date(date_from);
  
  // Create an array of sample attraction points
  const sampleAttractionsData: ItineraryPoint[] = [
    {
      type: "attraction",
      time: `${startDate.toISOString().split('T')[0]} 09:00`,
      end_time: `${startDate.toISOString().split('T')[0]} 11:00`,
      location: `The Walk Of Fun ${location}`,
      coordinates: {
        lat: 34.1013572,
        lng: -118.3428884
      },
      description: `Visit The Walk Of Fun ${location} - a must-see attraction with incredible views and entertainment options. This iconic landmark offers guided tours, interactive exhibits, and photo opportunities.`,
      rating: 5,
      attraction_type: "tourist_attraction",
      vicinity: `In front of Star Plaza | Central District, ${location}`,
      image_reference: "AeeoHcKTrjJdPnJVQ9KfvVbT62_vbHu0fqSaaaLKhVEUWYf_YJFrVQRPyjANRTyAeC9ojKe88sPcQj3xiFY77zXuYHCrSp6ze_0FG0-2wBkNApe_YsHumf0qX8SXRsbbpP_fx0sUInpMtEpNW0nbtGidFCaISNGsVVao9K0CGFKHnMnkd1tTedtqk_OmnLDpMrESYIXcZLja3LZz3dWLpyRZ32aRPGqgcGd3Gs_oFrgqwD2vyFGwZTJv_2976LapNCJy7esPOcmg1pe4HJJhrFEhweDnBdsWCxURgYgxcNxnI3abbuJgU00"
    },
    {
      type: "food",
      time: `${startDate.toISOString().split('T')[0]} 12:30`,
      end_time: `${startDate.toISOString().split('T')[0]} 14:00`,
      location: `${location} Gourmet Market`,
      coordinates: {
        lat: 34.0465858,
        lng: -118.2482077
      },
      description: `Experience the culinary delights at ${location} Gourmet Market. This popular food destination offers a variety of local and international cuisine. Don't miss the chef's special and the famous local desserts.`,
      rating: 4.8,
      attraction_type: "restaurant",
      vicinity: `Food District, Downtown ${location}`,
      image_reference: "AeeoHcJVSw5IU1hVLcZd6irQX0zj_G89vLhsHCIJJR_EcwMJO3KeyAyHNl9bKA2XpkiGQQi85xrEZPR0oiDM3E88qngnmBGJZ_QCbExC3u7GldyoS4TH0_U348SduwQQXk9S14Bcs1j4_ZdTnkAXLlxzPkUQp97c7by9j3hKNEYKNJEVHzVP"
    },
    {
      type: "attraction",
      time: `${startDate.toISOString().split('T')[0]} 15:00`,
      end_time: `${startDate.toISOString().split('T')[0]} 17:30`,
      location: `${location} Art Museum`,
      coordinates: {
        lat: 34.0639323,
        lng: -118.3592293
      },
      description: `Explore the magnificent ${location} Art Museum featuring contemporary and classical art collections. The museum hosts rotating exhibits from international artists and houses a permanent collection of local masterpieces.`,
      rating: 4.5,
      attraction_type: "museum",
      vicinity: `Cultural Center, ${location}`,
      image_reference: "AeeoHcLi4mShTHpi3obp9S18jZGP-ZvZu-9uKf_GyQ4Wph9LBOmyXclCTrEVZhw3VWZrUvXbr2yqTnYqruQcYJG5NWLdQRn7ppcP0Z-5IxkLljCYPLKDN33ZqBXAPDQbqB-BpR7oGLLlRkNL4n8SbXjX2sQTzgpQKtHoxH_kHrgCKF0aCCpfJ4JA"
    },
    {
      type: "food",
      time: `${startDate.toISOString().split('T')[0]} 19:00`,
      end_time: `${startDate.toISOString().split('T')[0]} 21:00`,
      location: `The Skyline Restaurant`,
      coordinates: {
        lat: 34.0522,
        lng: -118.2437
      },
      description: `Enjoy dinner with a view at The Skyline Restaurant. This upscale dining venue offers panoramic views of ${location} along with a menu of international cuisine and signature cocktails. Reservation recommended.`,
      rating: 4.7,
      attraction_type: "restaurant",
      vicinity: `Tower District, ${location}`,
      image_reference: "AeeoHcKrPYhZLpxb-D9Z0I10QKEPiSUsBwNIGUj8ckrHU7OISoYkRKD83UYf7maAJ8ixV5mvF7YSe2XkXqhDDTWtxDWf6M1Uo3uy5dLkxk5yXKuZbGvZg0d0o_nt-0kxkxhyQP95iG6IyvwjMVc70DkRtS5Ij67_z8YTImR9wKU6nOHx9UEg5vf7"
    },
    {
      type: "accommodation",
      time: `${startDate.toISOString().split('T')[0]} 22:00`,
      location: `${location} Grand Hotel`,
      coordinates: {
        lat: 34.0743,
        lng: -118.2542
      },
      description: `Return to your accommodation at the ${location} Grand Hotel. This luxurious hotel offers comfortable rooms, a fitness center, spa, and 24-hour room service. Enjoy the evening amenities or rest for tomorrow's adventures.`,
      rating: 4.9,
      attraction_type: "lodging",
      vicinity: `Main Boulevard, ${location}`,
      image_reference: "AeeoHcLVHQbRzuF6y9Y1vTiBqWZo_c8_ZhJXYl9IpQ1JuCM_9jQnP_KMc8TCPEkZRq5Ir9G3wTnl8MbYzqaF8iTfHjj_0r-JQYgpLNPXe6GlO1K2Xk_ZeAUBK1YgXQcCKU1-iIoXahcAijxz8_y2BK0JEaSGYfbBfLHwJxm6QdKQZ5XNi-1c8IMn"
    }
  ];
  
  // Add day 2 activities with adjusted dates
  const day2Date = new Date(startDate);
  day2Date.setDate(day2Date.getDate() + 1);
  
  const day2Activities: ItineraryPoint[] = [
    {
      type: "start",
      time: `${day2Date.toISOString().split('T')[0]} 08:30`,
      location: `${location} Grand Hotel`,
      coordinates: {
        lat: 34.0743,
        lng: -118.2542
      },
      description: `Start your day with breakfast at the hotel before heading out to explore more of ${location}.`,
      rating: 4.9,
      attraction_type: "lodging",
      vicinity: `Main Boulevard, ${location}`,
      image_reference: "AeeoHcLVHQbRzuF6y9Y1vTiBqWZo_c8_ZhJXYl9IpQ1JuCM_9jQnP_KMc8TCPEkZRq5Ir9G3wTnl8MbYzqaF8iTfHjj_0r-JQYgpLNPXe6GlO1K2Xk_ZeAUBK1YgXQcCKU1-iIoXahcAijxz8_y2BK0JEaSGYfbBfLHwJxm6QdKQZ5XNi-1c8IMn"
    },
    {
      type: "attraction",
      time: `${day2Date.toISOString().split('T')[0]} 10:00`,
      end_time: `${day2Date.toISOString().split('T')[0]} 12:30`,
      location: `${location} National Park`,
      coordinates: {
        lat: 34.0987,
        lng: -118.3261
      },
      description: `Explore the natural beauty of ${location} National Park. Take a guided tour through the trails, observe local wildlife, and enjoy the scenic viewpoints. The park offers both easy walking paths and more challenging hiking routes.`,
      rating: 4.6,
      attraction_type: "park",
      vicinity: `Nature District, ${location}`,
      image_reference: "AeeoHcI9r5wP0J_1G8QoiHnFf6L2c41IEy0hhYE_H5-HXjg90FHYYnYKS57Se8aJA3Jt0IuTRbj-IzcjFvmZ5-fJ6G3x4R5Q4m00ED9YhDHcLcPP_rvU8vXrG8xH_HxA6eS0IrUzijIYeNUjOQSzZxQr_jVLOe9YtMtEAqLJfC83YzNsJLGfLw"
    },
    {
      type: "food",
      time: `${day2Date.toISOString().split('T')[0]} 13:00`,
      end_time: `${day2Date.toISOString().split('T')[0]} 14:30`,
      location: `Fresh & Local Cafe`,
      coordinates: {
        lat: 34.1072,
        lng: -118.3222
      },
      description: `Enjoy a fresh lunch at the popular Fresh & Local Cafe near the park. This cafe specializes in organic ingredients and farm-to-table cuisine. Try their signature salads and freshly squeezed juices.`,
      rating: 4.4,
      attraction_type: "restaurant",
      vicinity: `Park Avenue, ${location}`,
      image_reference: "AeeoHcJmfYdmTXGwPnT_VzgONZvTs5nAyxzP3V4fGSMxTjJ6A2p1qZwS6d_RsNJl6JK9NvA9BKlIR7xXITAn4Td9MNmk5XsOTL3Lh1SzuRm5wJCYTcnSu1y_I3qsX_C6nMWrP34JsKRh9_OHGUyKvB5J7Qwz3YBJfwKW9qsEk1Ov8rIc9zj38zK2"
    }
  ];
  
  // Combine all activities
  const allActivities = [...sampleAttractionsData, ...day2Activities];
  
  // Return the complete itinerary
  return allActivities;
}

// Interface for attraction type dictionary
interface AttractionTypeMap {
  [key: string]: string[];
}

/**
 * Generate a sample itinerary with mock data
 * @param location Trip location
 * @param startDateStr Start date string
 * @param endDateStr End date string
 * @param numDays Number of days in the trip
 * @param preferences User preferences
 * @returns Array of ItineraryPoint objects
 */
function generateSampleItinerary(
  location: string,
  startDateStr: string,
  endDateStr: string,
  numDays: number,
  preferences: any
): ItineraryPoint[] {
  const startDate = new Date(startDateStr);
  const itinerary: ItineraryPoint[] = [];
  
  // Get latitude and longitude based on location
  // This is very simplified - in a real app you'd use a geocoding service
  const coordinates = getCoordinatesForLocation(location);
  
  // Dictionary of attraction types based on interests
  const attractionTypeMap: AttractionTypeMap = {
    'museums': ['Museum', 'Art Gallery', 'Historical Site'],
    'nature': ['Park', 'Garden', 'Nature Trail', 'Beach'],
    'food': ['Restaurant', 'Café', 'Food Market'],
    'shopping': ['Mall', 'Market', 'Shopping District'],
    'history': ['Historical Site', 'Monument', 'Ancient Ruins'],
    'art': ['Art Gallery', 'Museum', 'Studio'],
    'adventure': ['Adventure Park', 'Outdoor Activity', 'Sports Venue'],
    'nightlife': ['Bar', 'Club', 'Entertainment Venue'],
    'relaxation': ['Spa', 'Beach', 'Park', 'Wellness Center'],
    'culture': ['Theater', 'Concert Hall', 'Cultural Center']
  };
  
  // Helper function to get random item from array
  const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  // Helper function to get a random time on a specific date
  const getRandomTime = (date: Date, hour: number, minuteVariation: number = 0): string => {
    const newDate = new Date(date);
    const minuteOffset = minuteVariation ? Math.floor(Math.random() * minuteVariation) : 0;
    newDate.setHours(hour, minuteOffset, 0, 0);
    return newDate.toISOString();
  };
  
  // Function to generate a random location near the provided coordinates
  const getNearbyCoordinates = (baseLat: number, baseLng: number, maxDistance: number = 0.05): { lat: number, lng: number } => {
    const lat = baseLat + (Math.random() * maxDistance * 2 - maxDistance);
    const lng = baseLng + (Math.random() * maxDistance * 2 - maxDistance);
    return { lat, lng };
  };
  
  // Generate sample attractions based on preferences
  const generateAttractionTypes = (interestsList: string[]): string[] => {
    const attractions: string[] = [];
    
    // For each interest, add 2-3 attraction types
    interestsList.forEach(interest => {
      const lowercaseInterest = interest.toLowerCase();
      const types = attractionTypeMap[lowercaseInterest];
      if (types) {
        for (let i = 0; i < 2; i++) {
          attractions.push(getRandomItem(types));
        }
      }
    });
    
    // Add some generic attractions if needed
    if (attractions.length < 5) {
      const genericAttractions = ['Park', 'Museum', 'Local Landmark', 'Historical Site', 'Beach'];
      while (attractions.length < 5) {
        attractions.push(getRandomItem(genericAttractions));
      }
    }
    
    return attractions;
  };
  
  // Generate attraction names based on types and location
  const generateAttractionNames = (attractionTypes: string[]): Record<string, string> => {
    const names: Record<string, string> = {};
    
    attractionTypes.forEach(type => {
      switch (type) {
        case 'Museum':
          names[type] = `${location} ${getRandomItem(['National', 'Modern', 'Historical', 'Science', 'Art'])} Museum`;
          break;
        case 'Park':
          names[type] = `${getRandomItem(['Central', 'Riverside', 'City', 'Grand', 'Memorial'])} Park`;
          break;
        case 'Beach':
          names[type] = `${getRandomItem(['Golden', 'Sandy', 'Palm', 'Azure', 'Sunset'])} Beach`;
          break;
        case 'Restaurant':
          names[type] = `${getRandomItem(['The', 'La', 'El'])} ${getRandomItem(['Golden', 'Blue', 'Green', 'Red'])} ${getRandomItem(['Table', 'Spoon', 'Garden', 'Kitchen'])}`;
          break;
        default:
          names[type] = `${location} ${type}`;
      }
    });
    
    return names;
  };
  
  // Generate attractions and names
  const attractionTypesList = generateAttractionTypes(preferences.interests);
  const attractionNames = generateAttractionNames(attractionTypesList);
  
  // Generate itinerary for each day
  for (let day = 0; day < numDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    
    // Start of day
    itinerary.push({
      type: 'start',
      time: getRandomTime(currentDate, 8),
      location: 'Hotel',
      coordinates: getNearbyCoordinates(coordinates.lat, coordinates.lng),
      description: `Start your day ${day + 1} in ${location}. Enjoy breakfast at your hotel before heading out for the day's activities.`
    });
    
    // Morning activity
    const morningType = getRandomItem(attractionTypesList);
    const morningLocation = attractionNames[morningType];
    itinerary.push({
      type: 'attraction',
      time: getRandomTime(currentDate, 9),
      end_time: getRandomTime(currentDate, 11),
      location: morningLocation,
      coordinates: getNearbyCoordinates(coordinates.lat, coordinates.lng),
      description: `Explore the fascinating ${morningLocation}. ${morningType === 'Museum' ? 'Discover local history and culture through the exhibits.' : 'Enjoy the beautiful surroundings and take photos.'}`,
      rating: 4 + Math.random()
    });
    
    // Lunch
    itinerary.push({
      type: 'food',
      time: getRandomTime(currentDate, 12, 30),
      end_time: getRandomTime(currentDate, 13, 30),
      location: `${getRandomItem(['Local', 'Traditional', 'Authentic', 'Modern'])} ${getRandomItem(['Café', 'Bistro', 'Restaurant', 'Eatery'])}`,
      coordinates: getNearbyCoordinates(coordinates.lat, coordinates.lng),
      description: `Enjoy a delicious ${preferences.food_preference} lunch at this popular spot.`,
      rating: 4 + Math.random()
    });
    
    // Afternoon activity 1
    const afternoon1Type = getRandomItem(attractionTypesList);
    const afternoon1Location = attractionNames[afternoon1Type];
    itinerary.push({
      type: 'attraction',
      time: getRandomTime(currentDate, 14),
      end_time: getRandomTime(currentDate, 15, 30),
      location: afternoon1Location,
      coordinates: getNearbyCoordinates(coordinates.lat, coordinates.lng),
      description: `Visit the charming ${afternoon1Location}. Take your time to fully experience this ${getRandomItem(['popular', 'amazing', 'unique', 'beautiful'])} destination.`,
      rating: 4 + Math.random()
    });
    
    // Afternoon activity 2
    const afternoon2Type = getRandomItem(attractionTypesList);
    const afternoon2Location = attractionNames[afternoon2Type];
    itinerary.push({
      type: 'attraction',
      time: getRandomTime(currentDate, 16),
      end_time: getRandomTime(currentDate, 17, 30),
      location: afternoon2Location,
      coordinates: getNearbyCoordinates(coordinates.lat, coordinates.lng),
      description: `Explore the impressive ${afternoon2Location} and learn about its significance in ${location}.`,
      rating: 4 + Math.random()
    });
    
    // Dinner
    itinerary.push({
      type: 'food',
      time: getRandomTime(currentDate, 19),
      end_time: getRandomTime(currentDate, 20, 30),
      location: `${getRandomItem(['The', 'La', 'El'])} ${getRandomItem(['Royal', 'Grand', 'Seaside', 'Garden'])} ${getRandomItem(['Restaurant', 'Bistro', 'Grill', 'Cuisine'])}`,
      coordinates: getNearbyCoordinates(coordinates.lat, coordinates.lng),
      description: `End your day with a wonderful ${preferences.food_preference} dinner at this ${getRandomItem(['elegant', 'cozy', 'popular', 'romantic'])} restaurant.`,
      rating: 4 + Math.random()
    });
  }
  
  return itinerary;
}

/**
 * Get coordinates for a given location
 * In a real app, you would use a geocoding service like Google Maps API
 * This is a simplified version that returns fixed coordinates for some popular cities
 * or random coordinates if the location is not recognized
 */
function getCoordinatesForLocation(location: string): { lat: number, lng: number } {
  // Common city coordinates
  const cityCoordinates: Record<string, { lat: number, lng: number }> = {
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'London': { lat: 51.5074, lng: -0.1278 },
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Tokyo': { lat: 35.6762, lng: 139.6503 },
    'Rome': { lat: 41.9028, lng: 12.4964 },
    'Barcelona': { lat: 41.3851, lng: 2.1734 },
    'Sydney': { lat: -33.8688, lng: 151.2093 },
    'Amsterdam': { lat: 52.3676, lng: 4.9041 },
    'Kyoto': { lat: 35.0116, lng: 135.7681 },
    'San Francisco': { lat: 37.7749, lng: -122.4194 },
    'Miami': { lat: 25.7617, lng: -80.1918 },
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Prague': { lat: 50.0755, lng: 14.4378 },
    'Cairo': { lat: 30.0444, lng: 31.2357 },
    'Cape Town': { lat: -33.9249, lng: 18.4241 },
    'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
    'Toronto': { lat: 43.6532, lng: -79.3832 },
    'Bangkok': { lat: 13.7563, lng: 100.5018 },
    'Dubai': { lat: 25.2048, lng: 55.2708 }
  };
  
  // Try to match the location with our list
  const normalizedLocation = location.trim().toLowerCase();
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (normalizedLocation.includes(city.toLowerCase())) {
      return coords;
    }
  }
  
  // If no match found, generate random coordinates (this is simplified; real app would use geocoding)
  return {
    lat: Math.random() * 180 - 90, // -90 to 90
    lng: Math.random() * 360 - 180  // -180 to 180
  };
}