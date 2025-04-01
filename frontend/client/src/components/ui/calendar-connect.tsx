import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { initializeCalendarApi, hasCalendarAccess } from '@/lib/calendar-api';

interface CalendarConnectProps {
  onConnected: (connected: boolean) => void;
}

const CalendarConnect: React.FC<CalendarConnectProps> = ({ onConnected }) => {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [eventsCount, setEventsCount] = useState<number | null>(null);
  const { toast } = useToast();

  // Check if already connected on component mount and if we just returned from OAuth
  useEffect(() => {
    const checkConnection = async () => {
      const hasAccess = await hasCalendarAccess();
      setConnected(hasAccess);
      onConnected(hasAccess);
      
      if (hasAccess) {
        try {
          const response = await apiRequest('GET', '/api/calendar/events-count', undefined);
          const data = await response.json();
          setEventsCount(data.count);
          
          // If we just returned from an OAuth flow, show a success toast
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('auth_success')) {
            toast({
              title: "Success",
              description: "Successfully connected to Google Calendar",
            });
            // Remove the query param to prevent showing the toast on page refreshes
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Failed to get events count:', error);
        }
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

  return (
    <>
      {connected && eventsCount !== null && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
          <p className="text-gray-600">
            We found <span className="font-medium">{eventsCount}</span> events on your calendar.
          </p>
        </div>
      )}
      
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
    </>
  );
};

export default CalendarConnect;
