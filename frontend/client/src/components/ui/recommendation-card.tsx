import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Recommendation } from '@shared/schema';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { addEventToCalendar, hasCalendarAccess, initializeCalendarApi } from '@/lib/calendar-api';
import { CalendarPlus } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const { toast } = useToast();

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cafe':
        return 'bg-blue-50 text-primary';
      case 'restaurant':
        return 'bg-red-50 text-red-600';
      case 'attraction':
        return 'bg-purple-50 text-purple-600';
      case 'event':
        return 'bg-orange-50 text-orange-600';
      case 'outdoor':
        return 'bg-green-50 text-green-600';
      case 'shopping':
        return 'bg-yellow-50 text-yellow-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const handleFeedback = async (type: 'like' | 'dislike') => {
    try {
      await apiRequest('POST', `/api/recommendations/${recommendation.id}/feedback`, {
        type,
      });
      
      setFeedback(type);
      
      // Invalidate recommendations to potentially update them
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      
      toast({
        title: "Feedback recorded",
        description: `You ${type}d this recommendation.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record feedback.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddToCalendar = async () => {
    try {
      setAddingToCalendar(true);
      
      // Check if user has calendar access
      const hasAccess = await hasCalendarAccess();
      if (!hasAccess) {
        // Redirect to authorization flow
        await initializeCalendarApi();
        return;
      }
      
      // Create start and end time for the event (default to 2 hours duration)
      const startDate = new Date();
      startDate.setHours(recommendation.timeOfDay === 'morning' ? 9 : 
                         recommendation.timeOfDay === 'afternoon' ? 13 : 18, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 2);
      
      // Create a detailed description
      let description = recommendation.description + '\n\n';
      description += `Type: ${recommendation.type}\n`;
      description += `Rating: ${recommendation.rating} (${recommendation.reviewCount}+ reviews)\n`;
      description += `Location: ${recommendation.distance}\n`;
      description += `Open Hours: ${recommendation.openingHours}\n`;
      
      // Add the event to the calendar
      const success = await addEventToCalendar({
        title: recommendation.name,
        description: description,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        location: recommendation.distance || '' // Use distance as location since location might not be available
      });
      
      if (success) {
        toast({
          title: "Success",
          description: `Added ${recommendation.name} to your Google Calendar`,
        });
      } else {
        throw new Error("Failed to add event to calendar");
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast({
        title: "Error",
        description: "Failed to add event to your calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToCalendar(false);
    }
  };

  // Get image reference from metadata if available
  const imageReference = recommendation.metadata?.image_reference;
  const attractionType = recommendation.metadata?.attraction_type || recommendation.type;
  const vicinity = recommendation.metadata?.vicinity || recommendation.distance;
  
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Image section - only show if image reference is available */}
      {imageReference && (
        <div className="h-40 overflow-hidden relative">
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ 
              // For a real app, we'd use a proper image URL, but for this demo we'll use a placeholder
              backgroundImage: `url(https://via.placeholder.com/400x200/e0f2fe/2563eb?text=${encodeURIComponent(recommendation.name)})`,
              backgroundSize: 'cover'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-2 left-3">
            <Badge className="bg-white/80 text-gray-800 backdrop-blur-sm">
              {attractionType}
            </Badge>
          </div>
        </div>
      )}
      
      <div className={`p-4 border-b border-gray-100 ${!imageReference ? 'pb-2' : ''}`}>
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">
            DAY {recommendation.day} • {recommendation.timeOfDay.toUpperCase()}
          </span>
          {!imageReference && (
            <Badge variant="outline" className={`${getTypeColor(recommendation.type)}`}>
              {recommendation.type}
            </Badge>
          )}
        </div>
        <h3 className="text-lg font-medium mt-1">{recommendation.name}</h3>
      </div>
      
      <div className="p-4 flex-grow">
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <i className="fas fa-star text-yellow-400 mr-1"></i>
          <span>{recommendation.rating} ({recommendation.reviewCount}+ reviews)</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <i className="fas fa-map-pin mr-2"></i>
          <span>{vicinity}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <i className="fas fa-clock mr-2"></i>
          <span>{recommendation.openingHours}</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">{recommendation.description}</p>
        
        {/* Add to Calendar button */}
        <div className="mb-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-sm text-primary flex items-center"
            onClick={handleAddToCalendar}
            disabled={addingToCalendar}
          >
            {addingToCalendar ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></span>
                Adding...
              </>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4 mr-1" />
                Add to Calendar
              </>
            )}
          </Button>
        </div>
        
        <div className="flex justify-between mt-auto">
          <Button variant="link" className="text-sm text-primary hover:text-primary/90 p-0">
            View Details
          </Button>
          <div>
            <Button
              variant="ghost"
              size="sm"
              className={`text-sm ${feedback === 'dislike' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
              onClick={() => handleFeedback('dislike')}
            >
              <i className="fas fa-thumbs-down"></i>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`text-sm ${feedback === 'like' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
              onClick={() => handleFeedback('like')}
            >
              <i className="fas fa-thumbs-up"></i>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RecommendationCard;
