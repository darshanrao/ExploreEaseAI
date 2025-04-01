import { apiRequest } from './queryClient';

// Get recommendations based on destination and preferences
export async function getPlaceRecommendations(
  destination: string,
  preferences: {
    locationTypes: string[];
    timePreferences: string[];
    interests: string | null;
  }
): Promise<any[]> {
  try {
    // In a real app, we would call an external API like Google Places API
    // or another travel API to get real data based on the destination and preferences
    
    // For prototype purposes, we'll call our backend which will simulate
    // destination-specific recommendations
    const response = await apiRequest(
      'POST',
      '/api/recommendations/generate',
      {
        destination,
        locationTypes: preferences.locationTypes,
        timePreferences: preferences.timePreferences,
        interests: preferences.interests
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