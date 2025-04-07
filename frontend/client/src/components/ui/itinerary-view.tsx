import React from 'react';
import { format, parse } from 'date-fns';
import { Itinerary, ItineraryPoint } from '@shared/schema';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Star, Info } from 'lucide-react';

interface ItineraryViewProps {
  itinerary: Itinerary | any; // Allow any to handle both array and object formats
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ itinerary }) => {
  // Convert the itinerary to the expected array format if it's in object format
  const normalizedItinerary = React.useMemo(() => {
    // If it's already an array, use it directly
    if (Array.isArray(itinerary)) {
      return itinerary;
    }
    
    // If it's an object with points property, use that
    if (itinerary && Array.isArray(itinerary.points)) {
      return itinerary.points;
    }
    
    // If it's an object with an itinerary property that's an array, use that
    if (itinerary && itinerary.itinerary && Array.isArray(itinerary.itinerary)) {
      return itinerary.itinerary;
    }
    
    // Return empty array as fallback
    console.error('Invalid itinerary format:', itinerary);
    return [];
  }, [itinerary]);
  // Helper function to format time with robust error handling
  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return 'Time not specified';
    
    try {
      // Try ISO format first (2025-04-08T12:30:00)
      if (timeStr.includes('T')) {
        const timeObj = new Date(timeStr);
        return format(timeObj, 'h:mm a');
      }
      
      // Try different formats
      const formats = ['yyyy-MM-ddHH:mm:ss', 'yyyy-MM-ddTHH:mm:ss', 'yyyy-MM-dd HH:mm', 'yyyy-MM-dd HH:mm:ss'];
      
      for (const formatStr of formats) {
        try {
          const timeObj = parse(timeStr, formatStr, new Date());
          return format(timeObj, 'h:mm a');
        } catch (e) {
          // Continue to next format
        }
      }
      
      // If all parsing attempts fail, return a readable version of the string
      return timeStr.split('T').pop()?.replace(/:\d\d$/, '') || timeStr;
    } catch (error) {
      console.warn('Time format error:', error);
      return timeStr;
    }
  };

  // Extract date from time string with robust error handling
  const extractDate = (timeStr: string): string => {
    try {
      // Handle ISO format
      if (timeStr.includes('T')) {
        return timeStr.split('T')[0];
      }
      
      // Handle other formats
      return timeStr.split(' ')[0];
    } catch (error) {
      console.warn('Failed to extract date:', error);
      return timeStr;
    }
  };

  // Group itinerary points by day with better error handling
  const groupByDay = (items: any) => {
    const groups: { [key: string]: ItineraryPoint[] } = {};
    
    // Use the normalized itinerary instead of the raw input
    const pointsToProcess = normalizedItinerary;
    
    if (!pointsToProcess || pointsToProcess.length === 0) {
      console.error('No valid itinerary points to process');
      return {};
    }
    
    pointsToProcess.forEach((item: any) => {
      if (!item || !item.time) {
        console.warn('Invalid itinerary point:', item);
        return;
      }
      
      // Extract date part only from the time string (yyyy-MM-dd)
      const dateStr = extractDate(item.time);
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(item);
    });
    
    return groups;
  };
  
  const days = groupByDay(normalizedItinerary);

  // Check if we actually have itinerary data using normalized itinerary
  if (!normalizedItinerary || normalizedItinerary.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Your Detailed Itinerary</h3>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Info className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">No itinerary data available. Please try generating a new itinerary.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Your Detailed Itinerary</h3>
      
      {Object.keys(days).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Info className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">Could not parse itinerary dates properly. Please try generating a new itinerary.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(days).map(([date, points], dayIndex) => {
          // Parse the date for display with robust error handling
          let formattedDate = date;
          try {
            const dateObj = parse(date, 'yyyy-MM-dd', new Date());
            formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');
          } catch (e) {
            console.warn('Could not parse date:', date);
            // Try alternative date formats
            try {
              const dateObj = new Date(date);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');
              }
            } catch (e2) {
              console.warn('Could not parse date with alternative method:', date);
            }
          }
          
          return (
            <Card key={dayIndex} className="overflow-hidden">
              <CardHeader className="bg-primary/10 py-4">
                <CardTitle className="text-lg">Day {dayIndex + 1}: {formattedDate}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative pl-8 py-0">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  {points.map((point, index) => (
                    <div key={index} className="relative py-4 px-4">
                      {/* Timeline dot with type fallback */}
                      <div className={`absolute left-[-20px] w-4 h-4 rounded-full ${
                        point.type === 'start' ? 'bg-green-500' : 
                        point.type === 'food' ? 'bg-amber-500' :
                        point.type === 'attraction' ? 'bg-blue-500' : 'bg-gray-500'
                      } border-2 border-white z-10`}></div>
                      
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{point.location || 'Unnamed Location'}</h4>
                            <p className="text-sm text-gray-600">{point.description || 'No description available'}</p>
                          </div>
                          <div className="text-sm font-medium text-gray-500">
                            {formatTime(point.time)}
                            {point.end_time && ` - ${formatTime(point.end_time)}`}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs mt-2">
                          {point.coordinates && (
                            <div className="flex items-center text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>
                                {typeof point.coordinates.lat === 'number' && typeof point.coordinates.lng === 'number' 
                                  ? `${point.coordinates.lat.toFixed(6)}, ${point.coordinates.lng.toFixed(6)}`
                                  : 'Coordinates unavailable'}
                              </span>
                            </div>
                          )}
                          
                          {point.rating && (
                            <div className="flex items-center text-amber-500">
                              <Star className="h-3 w-3 mr-1 fill-amber-500" />
                              <span>{point.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {index < points.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ItineraryView;