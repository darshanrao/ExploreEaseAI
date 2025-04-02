import { useState } from 'react';

interface TravelPreference {
  destination?: string;
  startDate?: string;
  endDate?: string;
  interests?: string[];
  budget?: string;
  travelStyle?: string;
  foodPreference?: string;
  transportMode?: string;
  activityIntensity?: string;
  customPreferences?: string;
}

type ExtractFunction = (speech: string) => TravelPreference;

/**
 * Extract travel preferences from natural language speech
 */
const extractTravelPreferences: ExtractFunction = (speech) => {
  const lowerSpeech = speech.toLowerCase();
  const result: TravelPreference = {};
  
  // Extract destination
  const destinationPatterns = [
    /(?:travel|trip|go|going|visit|visiting|plan(?:ning)? (?:a )?(?:trip|vacation|holiday) to) ([\w\s,]+?)(?:from|\s+on|\s+in|\s+for|\s+between|$|\s+\d|\s+and\s+I|\s+because|\s+with|\s+\.|$)/i,
    /(?:I want to visit|I(?:'m| am) going to|I(?:'d| would) like to (?:go|visit)) ([\w\s,]+?)(?:from|\s+on|\s+in|\s+for|\s+between|$|\s+\d|\s+and\s+I|\s+because|\s+with|\s+\.|$)/i,
    /(?:going|trip|travel) to ([\w\s,]+?)(?:from|\s+on|\s+in|\s+for|\s+between|$|\s+\d|\s+and\s+I|\s+because|\s+with|\s+\.|$)/i,
    /vacationing in ([\w\s,]+?)(?:from|\s+on|\s+in|\s+for|\s+between|$|\s+\d|\s+and\s+I|\s+because|\s+with|\s+\.|$)/i,
    /destination is ([\w\s,]+?)(?:from|\s+on|\s+in|\s+for|\s+between|$|\s+\d|\s+and\s+I|\s+because|\s+with|\s+\.|$)/i,
    /planning for ([\w\s,]+?)(?:from|\s+on|\s+in|\s+for|\s+between|$|\s+\d|\s+and\s+I|\s+because|\s+with|\s+\.|$)/i,
  ];
  
  for (const pattern of destinationPatterns) {
    const match = lowerSpeech.match(pattern);
    if (match && match[1]) {
      // Clean up the destination string
      let destination = match[1].trim();
      
      // Remove common artifacts and fillers
      destination = destination.replace(/^(um|uh|like|so),?\s+/g, '');
      destination = destination.replace(/,?\s+(um|uh|like)$/g, '');
      
      // If destination is too long, it might be a false positive - limit to 30 chars
      if (destination.length > 30) {
        const truncated = destination.split(' ').slice(0, 3).join(' ');
        result.destination = truncated.charAt(0).toUpperCase() + truncated.slice(1);
      } else {
        result.destination = destination.charAt(0).toUpperCase() + destination.slice(1);
      }
      
      break;
    }
  }
  
  // Extract dates: Look for date patterns
  const datePatterns = [
    /(?:from|starting) (\w+ \d+(?:st|nd|rd|th)?(?:,? \d{4})?)(?:\s+(?:to|until|through)|$)/i,
    /(\d{1,2}[-.\/]\d{1,2}[-.\/]\d{2,4})(?:\s+(?:to|until|through|and)?\s+(\d{1,2}[-.\/]\d{1,2}[-.\/]\d{2,4}))?/i,
    /(\w+ \d+(?:st|nd|rd|th)?(?:,? \d{4})?)(?:\s+(?:to|until|through|and)\s+(\w+ \d+(?:st|nd|rd|th)?(?:,? \d{4})?))?/i,
    /(?:in|this|next) (\w+)(?:\s+(?:of|in))?\s+(\d{4})/i,
  ];
  
  // Try to convert spoken date to YYYY-MM-DDThh:mm format for datetime-local inputs
  const formatDateForInput = (dateStr: string): string => {
    try {
      // First, try to parse with Date constructor
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        // Format as YYYY-MM-DDThh:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
      
      // For spoken months like "next June" or "June 2025"
      const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const lowerDate = dateStr.toLowerCase();
      
      for (let i = 0; i < monthNames.length; i++) {
        if (lowerDate.includes(monthNames[i])) {
          // If we can find a year in the string
          const yearMatch = lowerDate.match(/\d{4}/);
          const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
          
          // If we can find a day in the string
          const dayMatch = lowerDate.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
          const day = dayMatch ? String(parseInt(dayMatch[1])).padStart(2, '0') : '01';
          
          const month = String(i + 1).padStart(2, '0');
          return `${year}-${month}-${day}T12:00`;
        }
      }
      
      // If we couldn't parse it, use today's date for start or a week later for end
      const today = new Date();
      if (dateStr.toLowerCase().includes('end') || 
          dateStr.toLowerCase().includes('until') || 
          dateStr.toLowerCase().includes('through')) {
        today.setDate(today.getDate() + 7); // Default end date is a week later
      }
      
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T12:00`;
    } catch (err) {
      // If all else fails, return current date/time as string
      const now = new Date();
      return now.toISOString().slice(0, 16);
    }
  };
  
  // Handle date extracting from speech
  for (const pattern of datePatterns) {
    const match = speech.match(pattern);
    if (match) {
      if (match[1]) {
        result.startDate = formatDateForInput(match[1]);
      }
      if (match[2]) {
        result.endDate = formatDateForInput(match[2]);
      }
      
      // If we only found one date and it looks like an end date, use current date as start
      if (result.endDate && !result.startDate) {
        const now = new Date();
        result.startDate = now.toISOString().slice(0, 16);
      }
      
      // If we only found a start date, set end date to a week later
      if (result.startDate && !result.endDate) {
        const startDate = new Date(result.startDate);
        startDate.setDate(startDate.getDate() + 7);
        result.endDate = startDate.toISOString().slice(0, 16);
      }
      
      break;
    }
  }
  
  // If no dates were found, set default dates (today and a week from today)
  if (!result.startDate && !result.endDate) {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    result.startDate = today.toISOString().slice(0, 16);
    result.endDate = nextWeek.toISOString().slice(0, 16);
  }
  
  // Extract interests
  const interestCategories = [
    'Museums', 'Food', 'History', 'Art', 'Nature', 'Shopping',
    'Nightlife', 'Architecture', 'Sports', 'Cultural', 'Music',
    'Adventure', 'Relaxation', 'Beach', 'Mountains'
  ];
  
  const interests = interestCategories.filter(interest => 
    new RegExp(`\\b${interest}\\b`, 'i').test(speech)
  );
  
  if (interests.length > 0) {
    result.interests = interests;
  }
  
  // Extract budget level
  const budgetKeywords = {
    'low': ['cheap', 'budget', 'affordable', 'inexpensive', 'low cost', 'economical', 'frugal'],
    'medium': ['moderate', 'mid range', 'middle', 'average', 'standard', 'reasonable'],
    'high': ['luxury', 'expensive', 'high end', 'premium', 'fancy', 'deluxe']
  };
  
  for (const [level, keywords] of Object.entries(budgetKeywords)) {
    for (const keyword of keywords) {
      if (lowerSpeech.includes(keyword)) {
        result.budget = level;
        break;
      }
    }
    if (result.budget) break;
  }
  
  // Extract travel style
  const travelStyles = ['cultural', 'adventure', 'relaxation', 'luxury', 'budget'];
  for (const style of travelStyles) {
    if (lowerSpeech.includes(style)) {
      result.travelStyle = style;
      break;
    }
  }
  
  // Extract activity intensity
  const activityLevels = {
    'low': ['relaxed', 'easy', 'light', 'chill', 'slow'],
    'moderate': ['moderate', 'balanced', 'medium'],
    'high': ['intense', 'active', 'busy', 'packed', 'high energy', 'adventurous']
  };
  
  for (const [level, keywords] of Object.entries(activityLevels)) {
    for (const keyword of keywords) {
      if (lowerSpeech.includes(keyword)) {
        result.activityIntensity = level;
        break;
      }
    }
    if (result.activityIntensity) break;
  }
  
  return result;
};

/**
 * Hook to process speech input for travel preferences
 */
export const useSpeechToTravel = () => {
  const [preferences, setPreferences] = useState<TravelPreference>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const processSpeech = (speechText: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Extract travel preferences from speech
      const extractedPreferences = extractTravelPreferences(speechText);
      
      setPreferences(extractedPreferences);
      setIsProcessing(false);
      
      // Return for immediate use
      return extractedPreferences;
    } catch (err) {
      console.error('Error processing speech:', err);
      setError('Sorry, there was an error processing your speech. Please try again.');
      setIsProcessing(false);
      return {};
    }
  };
  
  return {
    preferences,
    isProcessing,
    error,
    processSpeech
  };
};