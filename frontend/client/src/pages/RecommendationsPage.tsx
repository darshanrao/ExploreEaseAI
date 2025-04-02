import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import RecommendationCard from '@/components/ui/recommendation-card';
import CalendarConnect from '@/components/ui/calendar-connect';
import ItineraryView from '@/components/ui/itinerary-view';
import { hasCalendarAccess, exportToCalendar, initializeCalendarApi, addEventToCalendar } from '@/lib/calendar-api';
import { getPlaceRecommendations, getItinerary } from '@/lib/places-api';
import { CalendarPlus, RefreshCw, Map } from 'lucide-react';
import { Recommendation, Itinerary } from '@shared/schema';

const RecommendationsPage: React.FC = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState('');
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [isLoadingRealTimeData, setIsLoadingRealTimeData] = useState(false);
  const [realTimeRecommendations, setRealTimeRecommendations] = useState<Recommendation[] | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoadingItinerary, setIsLoadingItinerary] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);

  // Check if calendar is connected and handle OAuth return
  useEffect(() => {
    const checkCalendarConnection = async () => {
      try {
        // Check if we just returned from an OAuth flow
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('auth_success')) {
          toast({
            title: "Success",
            description: "Successfully connected to Google Calendar",
          });
          // Remove the query param to prevent showing the toast on page refreshes
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Wait a moment before checking status to ensure the session is properly set
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if we have a pending calendar event to add
          const pendingEventJson = sessionStorage.getItem('pendingCalendarEvent');
          if (pendingEventJson) {
            try {
              console.log('Found pending calendar event after OAuth on recommendations page');
              const pendingEvent = JSON.parse(pendingEventJson);
              
              // Only process events that are less than 10 minutes old
              const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
              if (pendingEvent.timestamp && pendingEvent.timestamp > tenMinutesAgo) {
                // Clear from session storage first
                sessionStorage.removeItem('pendingCalendarEvent');
                
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
        
        // Check if calendar is connected
        const connected = await hasCalendarAccess();
        setIsCalendarConnected(connected);
      } catch (error) {
        console.error('Error checking calendar connection:', error);
      }
    };
    
    checkCalendarConnection();
  }, [toast]);

  const { data: tripDetails } = useQuery<{
    date_from: string;
    date_to: string;
    location: string;
    travel_style: string;
    food_preference: string;
    budget: string;
    transport_mode: string;
    time_preference: string;
    activity_intensity: string;
    interests: string[];
    custom_preferences?: string;
  }>({
    queryKey: ['/api/trip-details'],
  });

  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
  });

  // Fetch real-time recommendations when tripDetails are available
  useEffect(() => {
    if (tripDetails && !realTimeRecommendations && !isLoadingRealTimeData) {
      loadRealTimeRecommendations();
    }
  }, [tripDetails]);

  const loadRealTimeRecommendations = async () => {
    if (!tripDetails) return;
    
    try {
      setIsLoadingRealTimeData(true);
      const realData = await getPlaceRecommendations(
        tripDetails.location,
        {
          travel_style: tripDetails.travel_style,
          food_preference: tripDetails.food_preference,
          budget: tripDetails.budget,
          transport_mode: tripDetails.transport_mode,
          time_preference: tripDetails.time_preference,
          activity_intensity: tripDetails.activity_intensity,
          interests: tripDetails.interests,
          custom_preferences: tripDetails.custom_preferences
        }
      );
      
      if (realData && realData.length > 0) {
        setRealTimeRecommendations(realData);
      }
    } catch (error) {
      console.error('Error fetching real-time recommendations:', error);
      toast({
        title: "Notice",
        description: "Could not load destination-specific recommendations. Showing default recommendations instead.",
      });
    } finally {
      setIsLoadingRealTimeData(false);
    }
  };
  
  const loadItinerary = async () => {
    if (!tripDetails) return;
    
    try {
      setIsLoadingItinerary(true);
      
      const itineraryData = await getItinerary(
        tripDetails.location,
        {
          travel_style: tripDetails.travel_style,
          food_preference: tripDetails.food_preference,
          budget: tripDetails.budget,
          transport_mode: tripDetails.transport_mode,
          time_preference: tripDetails.time_preference,
          activity_intensity: tripDetails.activity_intensity,
          interests: tripDetails.interests,
          custom_preferences: tripDetails.custom_preferences,
          date_from: tripDetails.date_from,
          date_to: tripDetails.date_to
        }
      );
      
      if (itineraryData) {
        setItinerary(itineraryData);
        setShowItinerary(true);
      } else {
        toast({
          title: "Notice",
          description: "Could not load detailed itinerary data. Please try again later.",
        });
      }
    } catch (error) {
      console.error('Error fetching itinerary data:', error);
      toast({
        title: "Error",
        description: "Failed to load itinerary. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingItinerary(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      await apiRequest('POST', '/api/feedback', { feedback });
      navigate('/feedback');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };
  
  const handleRefreshRecommendations = () => {
    loadRealTimeRecommendations();
  };
  
  const handleAddToCalendar = async () => {
    const currentRecommendations = realTimeRecommendations || recommendations;
    if (!currentRecommendations || !tripDetails) return;
    
    try {
      setAddingToCalendar(true);
      
      // If not already connected to calendar, initialize the connection
      if (!isCalendarConnected) {
        await initializeCalendarApi();
        setIsCalendarConnected(true);
      }
      
      // Export trip to Google Calendar
      const result = await exportToCalendar(currentRecommendations, {
        startDate: tripDetails.date_from,
        endDate: tripDetails.date_to,
        destination: tripDetails.location
      });
      
      if (result) {
        toast({
          title: "Success",
          description: "Your trip has been added to Google Calendar!",
        });
      } else {
        throw new Error("Failed to add trip to calendar");
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast({
        title: "Error",
        description: "Failed to add trip to Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToCalendar(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Trip Recommendations</h2>
          <div>
            <Button 
              variant="link"
              className="text-sm text-primary hover:text-primary/90"
              onClick={() => navigate('/preferences')}
            >
              <i className="fas fa-edit mr-1"></i> Edit Preferences
            </Button>
          </div>
        </div>
        {tripDetails && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-600">
              <i className="fas fa-map-marker-alt text-xs mr-1"></i>
              <span>{tripDetails.location}</span>
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-600">
              <i className="fas fa-calendar text-xs mr-1"></i>
              <span>{formatDateRange(tripDetails.date_from, tripDetails.date_to)}</span>
            </span>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isLoadingRealTimeData ? 'Loading destination-specific recommendations...' : 
                (realTimeRecommendations ? 'Destination-Specific Recommendations' : 'Recommendations')}
            </h3>
            <Button
              onClick={handleRefreshRecommendations}
              disabled={isLoadingRealTimeData}
              variant="outline"
              className="flex items-center"
            >
              {isLoadingRealTimeData ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></span>
                  Loading...
                </span>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
          
          <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Show real-time recommendations if available, otherwise show default ones */}
            {(realTimeRecommendations || recommendations)?.map((recommendation, index) => (
              <RecommendationCard key={index} recommendation={recommendation} />
            ))}
          </div>
          
          <div className="flex justify-between items-center mb-8">
            <Button
              onClick={() => {
                if (!itinerary) {
                  loadItinerary();
                } else {
                  setShowItinerary(!showItinerary);
                }
              }}
              disabled={isLoadingItinerary}
              variant="outline"
              className="flex items-center"
            >
              {isLoadingItinerary ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></span>
                  Loading itinerary...
                </span>
              ) : (
                <>
                  <Map className="h-4 w-4 mr-2" />
                  {showItinerary ? 'Hide Detailed Itinerary' : 
                    (itinerary ? 'Show Detailed Itinerary' : 'View Detailed Trip Plan')}
                </>
              )}
            </Button>
            
            {/* Calendar connect button */}
            {tripDetails && (
              <CalendarConnect 
                onConnected={setIsCalendarConnected} 
                tripDetails={tripDetails}
              />
            )}
          </div>
          
          {/* Show itinerary view when available and toggled on */}
          {showItinerary && itinerary && (
            <div className="mb-8">
              <ItineraryView itinerary={itinerary} />
            </div>
          )}
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">How was your experience?</h3>
              <p className="text-gray-600 mb-4">Your feedback helps our AI learn and improve recommendations.</p>
              
              <div className="mb-4">
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Feedback
                </label>
                <Textarea
                  id="feedback"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did you like or dislike about these suggestions?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleFeedbackSubmit}
                  className="bg-primary text-white"
                >
                  Submit Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
};

export default RecommendationsPage;
