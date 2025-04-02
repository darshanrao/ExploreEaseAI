import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { 
  initializeCalendarApi, 
  hasCalendarAccess, 
  addEventToCalendar 
} from '@/lib/calendar-api';

interface CalendarConnectProps {
  onConnected: (connected: boolean) => void;
  tripDetails?: {
    location: string;
    date_from: string;
    date_to: string;
    travel_style?: string;
    food_preference?: string;
    budget?: string;
    transport_mode?: string;
    time_preference?: string;
    activity_intensity?: string;
    interests?: string[];
    custom_preferences?: string;
  };
}

const CalendarConnect: React.FC<CalendarConnectProps> = ({ onConnected, tripDetails }) => {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [eventsCount, setEventsCount] = useState<number | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const { toast } = useToast();

  // Check if already connected on component mount and if we just returned from OAuth
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if we just returned from an OAuth flow by looking for the auth_success param
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('auth_success')) {
          toast({
            title: "Success",
            description: "Successfully connected to Google Calendar",
          });
          // Remove the query param to prevent showing the toast on page refreshes
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Wait a moment before checking status to ensure the session is properly set
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if we have a pending calendar event to add
          const pendingEventJson = sessionStorage.getItem('pendingCalendarEvent');
          if (pendingEventJson) {
            try {
              console.log('Found pending calendar event after OAuth');
              const pendingEvent = JSON.parse(pendingEventJson);
              
              // Only process events that are less than 10 minutes old to prevent stale events
              const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
              if (pendingEvent.timestamp && pendingEvent.timestamp > tenMinutesAgo) {
                // Clear from session storage first to prevent retries if it fails
                sessionStorage.removeItem('pendingCalendarEvent');
                
                // Wait a bit longer to ensure the token is properly set in the session
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Try to add the event now that we're authenticated
                const success = await addEventToCalendar(pendingEvent.eventData);
                
                if (success) {
                  toast({
                    title: "Success",
                    description: `Added ${pendingEvent.eventData.title} to your Google Calendar`,
                  });
                }
              } else {
                // Clear old pending events
                sessionStorage.removeItem('pendingCalendarEvent');
              }
            } catch (error) {
              console.error('Error processing pending calendar event:', error);
              toast({
                title: "Error",
                description: "Failed to add your event to the calendar after authorization.",
                variant: "destructive",
              });
            }
          }
        }
        
        const hasAccess = await hasCalendarAccess();
        console.log("Calendar access check result:", hasAccess);
        setConnected(hasAccess);
        onConnected(hasAccess);
        
        if (hasAccess) {
          try {
            const response = await apiRequest('GET', '/api/calendar/events-count', undefined);
            const data = await response.json();
            setEventsCount(data.count);
          } catch (error) {
            console.error('Failed to get events count:', error);
          }
        }
      } catch (error) {
        console.error('Error in calendar connection check:', error);
      }
    };
    
    checkConnection();
  }, [onConnected, toast]);

  const handleConnect = async () => {
    setConnecting(true);
    
    try {
      // Redirect to the Google OAuth flow
      await initializeCalendarApi();
      
      // The page will redirect, but just in case it doesn't
      setTimeout(() => {
        setConnecting(false);
      }, 3000);
    } catch (error) {
      console.error('Calendar connection error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleAddEvent = async () => {
    if (!tripDetails) {
      toast({
        title: "Error",
        description: "No trip details available to add to calendar.",
        variant: "destructive",
      });
      return;
    }

    setAddingEvent(true);

    try {
      // Format date strings for Google Calendar
      const startDate = new Date(tripDetails.date_from);
      const endDate = new Date(tripDetails.date_to);
      
      // Create a detailed description from all preferences
      let description = `Trip to ${tripDetails.location}\n\n`;
      
      if (tripDetails.travel_style) {
        description += `Travel Style: ${tripDetails.travel_style}\n`;
      }
      if (tripDetails.food_preference) {
        description += `Food Preference: ${tripDetails.food_preference}\n`;
      }
      if (tripDetails.budget) {
        description += `Budget: ${tripDetails.budget}\n`;
      }
      if (tripDetails.transport_mode) {
        description += `Transport: ${tripDetails.transport_mode}\n`;
      }
      if (tripDetails.activity_intensity) {
        description += `Activity Level: ${tripDetails.activity_intensity}\n`;
      }
      if (tripDetails.interests && tripDetails.interests.length > 0) {
        description += `Interests: ${tripDetails.interests.join(', ')}\n`;
      }
      if (tripDetails.custom_preferences) {
        description += `Notes: ${tripDetails.custom_preferences}\n`;
      }
      
      const eventData = {
        title: `Trip to ${tripDetails.location}`,
        description: description,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        location: tripDetails.location
      };

      const success = await addEventToCalendar(eventData);
      
      if (success) {
        toast({
          title: "Success",
          description: "Event added to your Google Calendar",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add event to calendar. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding event to calendar:', error);
      toast({
        title: "Error",
        description: "Failed to add event to calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingEvent(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {connected && eventsCount !== null && (
        <div className="p-3 bg-gray-50 rounded text-sm">
          <p className="text-gray-600">
            We found <span className="font-medium">{eventsCount}</span> events on your calendar.
          </p>
        </div>
      )}
      
      <div className="flex space-x-4">
        <Button
          type="button"
          variant={connected ? "default" : "outline"}
          className={`flex items-center ${connected ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
          disabled={connecting || connected}
          onClick={handleConnect}
        >
          {connecting ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i> Connecting...
            </>
          ) : connected ? (
            <>
              <i className="fas fa-check-circle text-white mr-2"></i> Connected
            </>
          ) : (
            <>
              <i className="fab fa-google text-primary mr-2"></i>
              Connect Google Calendar
            </>
          )}
        </Button>

        {connected && tripDetails && (
          <Button
            type="button"
            variant="outline"
            className="flex items-center"
            disabled={addingEvent}
            onClick={handleAddEvent}
          >
            {addingEvent ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i> Adding...
              </>
            ) : (
              <>
                <i className="fas fa-calendar-plus mr-2"></i>
                Add Event
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CalendarConnect;
