import { apiRequest } from './queryClient';
import { Itinerary } from '@shared/schema';

// Get recommendations based on destination and preferences
export async function getPlaceRecommendations(
  location: string,
  preferences: {
    travel_style?: string;
    food_preference?: string;
    budget?: string;
    transport_mode?: string;
    time_preference?: string;
    activity_intensity?: string;
    interests?: string[];
    custom_preferences?: string;
  }
): Promise<any[]> {
  try {
    // If interests are specified, use the Google Places API integration
    if (preferences.interests && preferences.interests.length > 0) {
      return await getPlacesByInterests(location, preferences.interests);
    }
    
    // Otherwise fall back to the regular recommendation generator
    const response = await apiRequest(
      'POST',
      '/api/recommendations/generate',
      {
        destination: location,
        travel_style: preferences.travel_style,
        food_preference: preferences.food_preference,
        budget: preferences.budget,
        transport_mode: preferences.transport_mode,
        time_preference: preferences.time_preference,
        activity_intensity: preferences.activity_intensity,
        interests: preferences.interests,
        custom_preferences: preferences.custom_preferences
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get place recommendations');
    }
    
    const data = await response.json();
    return data.recommendations;
  } catch (error) {
    console.error('Error getting place recommendations:', error);
    return [];
  }
}

// Get real places based on location and selected interests using Google Places API
export async function getPlacesByInterests(
  location: string,
  interests: string[]
): Promise<any[]> {
  try {
    console.log(`Fetching real places for ${location} with interests:`, interests);
    
    // Make sure interests are properly capitalized as the API expects
    const capitalizedInterests = interests.map(interest => 
      interest.charAt(0).toUpperCase() + interest.slice(1).toLowerCase()
    );
    
    console.log('Using capitalized interests:', capitalizedInterests);
    
    const response = await apiRequest(
      'POST',
      '/api/places-by-interests',
      {
        location,
        interests: capitalizedInterests
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get places by interests');
    }
    
    const data = await response.json();
    console.log('API response:', data);
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.recommendations)) {
      return data.recommendations;
    } else if (data && typeof data === 'object') {
      // If we get a different structure, try to find any array property
      const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
      if (arrayProps.length > 0) {
        console.log(`Found array property: ${arrayProps[0]}`);
        return data[arrayProps[0]];
      }
    }
    
    console.warn('Unexpected data format from places API:', data);
    return [];
  } catch (error) {
    console.error('Error getting places by interests:', error);
    return [];
  }
}

// Get detailed itinerary data with schedule, timings, and coordinates
export async function getItinerary(
  location: string,
  preferences: {
    travel_style?: string;
    food_preference?: string;
    budget?: string;
    transport_mode?: string;
    time_preference?: string;
    activity_intensity?: string;
    interests?: string[];
    custom_preferences?: string;
    date_from?: string;
    date_to?: string;
  }
): Promise<Itinerary | null> {
  try {
    console.log(`Fetching itinerary for ${location}`);
    
    // Use fetch directly with explicit JSON headers
    const response = await fetch('/api/itinerary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        location,
        ...preferences
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get itinerary data');
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Received non-JSON response:', contentType);
      return null;
    }
    
    const data = await response.json();
    console.log('Itinerary API response:', data);
    
    if (Array.isArray(data)) {
      return data as Itinerary;
    } else if (data && Array.isArray(data.itinerary)) {
      return data.itinerary as Itinerary;
    }
    
    console.warn('Unexpected data format from itinerary API:', data);
    return null;
  } catch (error) {
    console.error('Error getting itinerary data:', error);
    return null;
  }
}