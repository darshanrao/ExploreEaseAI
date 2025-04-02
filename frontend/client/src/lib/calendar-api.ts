import { apiRequest } from './queryClient';

// Export trip to Google Calendar
export const exportToCalendar = async (
  recommendations: any[],
  tripDetails: {
    startDate: string;
    endDate: string;
    destination: string;
  }
): Promise<boolean> => {
  try {
    // First check if authenticated
    const isAuthenticated = await hasCalendarAccess();
    
    if (!isAuthenticated) {
      // If not authenticated, try to initialize the API
      await initializeCalendarApi();
      // Wait a bit for potential redirect and authentication flow
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Now try to export
    const response = await apiRequest(
      'POST',
      '/api/calendar/export-trip',
      {
        recommendations,
        tripDetails
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 401) {
        // If unauthorized, redirect to auth flow
        initializeCalendarApi();
        throw new Error('Please authorize Google Calendar access first');
      }
      throw new Error(errorData.error || 'Failed to export to calendar');
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting to calendar:', error);
    return false;
  }
};

// Add a single event to Google Calendar
export const addEventToCalendar = async (
  eventData: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
  }
): Promise<boolean> => {
  try {
    // First check if authenticated
    const isAuthenticated = await hasCalendarAccess();
    
    if (!isAuthenticated) {
      // Store the event data in session storage before redirecting
      sessionStorage.setItem('pendingCalendarEvent', JSON.stringify({
        eventData,
        timestamp: Date.now(),
        returnUrl: window.location.pathname
      }));
      
      console.log('Storing calendar event data before authorization:', eventData);
      
      // If not authenticated, try to initialize the API
      await initializeCalendarApi();
      // The page will redirect to Google OAuth, so we don't continue execution
      return false;
    }
    
    // Now try to add the event
    const response = await apiRequest(
      'POST',
      '/api/calendar/add-event',
      eventData
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 401) {
        // Store the event data in session storage before redirecting
        sessionStorage.setItem('pendingCalendarEvent', JSON.stringify({
          eventData,
          timestamp: Date.now(),
          returnUrl: window.location.pathname
        }));
        
        // If unauthorized, redirect to auth flow
        initializeCalendarApi();
        throw new Error('Please authorize Google Calendar access first');
      }
      throw new Error(errorData.error || 'Failed to add event to calendar');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    return false;
  }
};

// Initialize the Google Calendar API - redirects to Google OAuth
export const initializeCalendarApi = async (): Promise<void> => {
  try {
    // Use the server's API endpoint for OAuth
    // Include the current path as state so we can redirect back to the same page
    const currentPath = window.location.pathname;
    const authUrl = `/api/auth/google?state=${encodeURIComponent(currentPath)}`;
    
    console.log("Redirecting to Google OAuth:", authUrl);
    
    // Using the server endpoint ensures the redirect URI used in OAuth is the same
    // as the one configured in the server and Google Console
    window.location.href = authUrl;
    return Promise.resolve();
  } catch (error) {
    console.error('Error initializing Google Calendar API:', error);
    return Promise.reject(error);
  }
};

// Check if the user has already authorized the app to access their calendar
export const hasCalendarAccess = async (): Promise<boolean> => {
  try {
    const response = await apiRequest('GET', '/api/calendar/status', undefined);
    const data = await response.json();
    return data.authenticated;
  } catch (error) {
    console.error('Failed to check calendar access:', error);
    return false;
  }
};

// Fetch the user's calendar events
export const fetchCalendarEvents = async (
  timeMin: string,
  timeMax: string
): Promise<any[]> => {
  try {
    const response = await apiRequest(
      'GET', 
      `/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      undefined
    );
    const data = await response.json();
    return data.events;
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return [];
  }
};
