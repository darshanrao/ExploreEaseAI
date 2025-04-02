import React from 'react';
import { format, parse } from 'date-fns';
import { Itinerary, ItineraryPoint } from '@shared/schema';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Star } from 'lucide-react';

interface ItineraryViewProps {
  itinerary: Itinerary;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ itinerary }) => {
  // Helper function to format time
  const formatTime = (timeStr: string) => {
    try {
      const timeObj = parse(timeStr, 'yyyy-MM-dd HH:mm', new Date());
      return format(timeObj, 'h:mm a');
    } catch (error) {
      return timeStr; // Return the original string if parsing fails
    }
  };

  // Group itinerary points by day
  const groupByDay = (items: Itinerary) => {
    const groups: { [key: string]: ItineraryPoint[] } = {};
    
    items.forEach(item => {
      // Extract date part only from the time string (yyyy-MM-dd)
      const dateStr = item.time.split(' ')[0];
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(item);
    });
    
    return groups;
  };
  
  const days = groupByDay(itinerary);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Your Detailed Itinerary</h3>
      
      {Object.entries(days).map(([date, points], dayIndex) => {
        // Parse the date for display
        let formattedDate = date;
        try {
          const dateObj = parse(date, 'yyyy-MM-dd', new Date());
          formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');
        } catch (e) {
          console.warn('Could not parse date:', date);
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
                    {/* Timeline dot */}
                    <div className={`absolute left-[-20px] w-4 h-4 rounded-full ${
                      point.type === 'start' ? 'bg-green-500' : 'bg-blue-500'
                    } border-2 border-white z-10`}></div>
                    
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{point.location}</h4>
                          <p className="text-sm text-gray-600">{point.description}</p>
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                          {formatTime(point.time)}
                          {point.end_time && ` - ${formatTime(point.end_time)}`}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs mt-2">
                        <div className="flex items-center text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>
                            {point.coordinates?.lat?.toFixed(6)}, {point.coordinates?.lng?.toFixed(6)}
                          </span>
                        </div>
                        
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
      })}
    </div>
  );
};

export default ItineraryView;