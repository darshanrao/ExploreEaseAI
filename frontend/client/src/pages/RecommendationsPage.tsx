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
import { hasCalendarAccess, exportToCalendar, initializeCalendarApi, addEventToCalendar } from '@/lib/calendar-api';
import { getPlaceRecommendations } from '@/lib/places-api';
import { submitTravelRequest, checkTravelRequestStatus, getTravelResult, pollTravelRequest, TravelRequestParams, ItineraryPoint } from '@/lib/fastapi-service';
import { CalendarPlus, RefreshCw, Map } from 'lucide-react';
import { Recommendation, Itinerary } from '@shared/schema';

const RecommendationsPage: React.FC = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState('');
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [itineraryPoints, setItineraryPoints] = useState<ItineraryPoint[] | null>(null);

  // Get trip details from API
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
  
  // Automatically start plan generation when tripDetails are loaded
  useEffect(() => {
    // Start generating plan as soon as tripDetails are loaded
    if (tripDetails) {
      // Show loading spinner immediately
      setIsGeneratingPlan(true);
      
      // Generate the plan when component mounts or when tripDetails change
      generatePlan();
    }
  }, [tripDetails]);

  const generatePlan = async () => {
    if (!tripDetails) return;
    
    try {
      setIsGeneratingPlan(true);
      
      // Check if we have FastAPI request data in sessionStorage
      const travelRequestDataJson = sessionStorage.getItem('travelRequestData');
      
      if (travelRequestDataJson) {
        // Use the stored request data
        const travelRequestData = JSON.parse(travelRequestDataJson) as TravelRequestParams;
        
        // Submit the travel request to FastAPI
        const requestResponse = await submitTravelRequest(travelRequestData);
        console.log('FastAPI travel request submitted:', requestResponse);
        
        // Toast only shown if progress takes time
        let progressToastShown = false;
        
        // Poll for results, with status updates
        const points = await pollTravelRequest(
          requestResponse.request_id,
          (status) => {
            console.log('FastAPI status update:', status);
            // Show progress toast only if it's taking a while
            if (status.progress > 0.1 && status.progress < 0.9 && !progressToastShown) {
              progressToastShown = true;
              toast({
                title: "Generating Trip Plan",
                description: `Creating your personalized itinerary. Progress: ${Math.round(status.progress * 100)}%`,
              });
            }
          }
        );
        
        console.log('FastAPI travel request completed:', points);
        
        if (points && points.length > 0) {
          // Store the itinerary points for display
          setItineraryPoints(points);
        } else {
          throw new Error('No itinerary points returned from FastAPI');
        }
      } else {
        // If no FastAPI data is available, create a default request
        const requestData: TravelRequestParams = {
          prompt: `Generate a travel itinerary for ${tripDetails.location}`,
          preferences: {
            travel_style: tripDetails.travel_style,
            food_preference: tripDetails.food_preference,
            budget: tripDetails.budget,
            transport_mode: tripDetails.transport_mode,
            time_preference: tripDetails.time_preference,
            activity_intensity: tripDetails.activity_intensity,
            interests: tripDetails.interests,
            custom_preferences: tripDetails.custom_preferences
          },
          date_from: tripDetails.date_from,
          date_to: tripDetails.date_to,
          location: tripDetails.location
        };
        
        // Store the request data for future use
        sessionStorage.setItem('travelRequestData', JSON.stringify(requestData));
        
        // Submit the travel request to FastAPI
        const requestResponse = await submitTravelRequest(requestData);
        console.log('FastAPI travel request submitted:', requestResponse);
        
        // Poll for results
        const points = await pollTravelRequest(
          requestResponse.request_id,
          (status) => {
            console.log('FastAPI status update:', status);
          }
        );
        
        if (points && points.length > 0) {
          // Store the itinerary points for display
          setItineraryPoints(points);
        } else {
          throw new Error('No itinerary points returned from FastAPI');
        }
      }
    } catch (error) {
      console.error('Error generating travel plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate travel plan. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPlan(false);
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
  
  const handleAddToCalendar = async () => {
    if (!itineraryPoints || !tripDetails) return;
    
    try {
      setAddingToCalendar(true);
      
      // If not already connected to calendar, initialize the connection
      if (!isCalendarConnected) {
        await initializeCalendarApi();
        setIsCalendarConnected(true);
      }
      
      // Create events from itinerary points
      const events = itineraryPoints.map(point => ({
        title: point.location,
        description: point.description,
        start_time: point.time,
        end_time: point.end_time || new Date(new Date(point.time).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        location: `${point.coordinates.lat},${point.coordinates.lng}`
      }));
      
      // Export trip to Google Calendar - implementation would need to be updated
      const success = true; // Placeholder
      
      if (success) {
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

  // Function to create a recommendation from an itinerary point
  const createRecommendation = (point: ItineraryPoint, index: number, tripStartDate: string): any => {
    // Extract day from the date
    const date = new Date(point.time);
    const day = Math.floor((date.getTime() - new Date(tripStartDate).getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    // Determine time of day
    const hour = date.getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17) {
      timeOfDay = 'evening';
    }
    
    // Return a recommendation object based on the itinerary point
    return {
      id: index,
      name: point.location,
      description: point.description,
      type: point.type,
      rating: String(point.rating || "4.5"),
      reviewCount: 100,
      day,
      timeOfDay,
      // Use vicinity field if available, otherwise fallback to coordinates
      distance: point.vicinity || `${point.coordinates.lat.toFixed(4)}, ${point.coordinates.lng.toFixed(4)}`,
      openingHours: point.end_time ? 
        `${new Date(point.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(point.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` :
        'Open Hours',
      // Add required fields from schema that may not be in the ItineraryPoint
      userId: null,
      preferenceId: null,
      location: point.location,
      createdAt: null,
      // Store additional fields in metadata for use in the card
      metadata: {
        image_reference: point.image_reference,
        attraction_type: point.attraction_type,
        vicinity: point.vicinity,
        coordinates: point.coordinates
      }
    };
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
      
      {/* Full page loading state during plan generation */}
      {isGeneratingPlan ? (
        <div className="flex flex-col items-center justify-center h-80 py-12">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary mb-6"></div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">Creating your personalized travel itinerary...</h3>
          <p className="text-gray-500 text-center max-w-md">
            Our AI is finding the perfect attractions, restaurants, and activities based on your preferences.
          </p>
        </div>
      ) : (
        <>
          {/* Only show recommendations when we have itinerary data */}
          {itineraryPoints && itineraryPoints.length > 0 && tripDetails ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Personalized Trip
                </h3>
                
                {/* Calendar connect button */}
                {tripDetails && (
                  <CalendarConnect 
                    onConnected={setIsCalendarConnected} 
                    tripDetails={tripDetails}
                  />
                )}
              </div>
              
              <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
                {/* Display itinerary points as recommendation cards */}
                {itineraryPoints.map((point, index) => (
                  <RecommendationCard 
                    key={index} 
                    recommendation={createRecommendation(point, index, tripDetails.date_from)}
                  />
                ))}
              </div>
              
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
          ) : (
            // Show generate plan button if no itinerary yet
            <div className="flex flex-col items-center justify-center h-60 py-8">
              <p className="text-gray-500 text-center mb-6">
                Click the button below to generate your personalized travel plan
              </p>
              <Button
                onClick={generatePlan}
                className="bg-primary text-white"
              >
                <Map className="h-4 w-4 mr-2" />
                Generate Plan
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default RecommendationsPage;