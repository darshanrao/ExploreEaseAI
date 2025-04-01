import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";

const FeedbackPage: React.FC = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const handleAdjustItinerary = async () => {
    try {
      await apiRequest('POST', '/api/adjust-itinerary', {});
      navigate('/recommendations');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust itinerary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewRecommendations = async () => {
    try {
      await apiRequest('POST', '/api/new-recommendations', {});
      navigate('/recommendations');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate new recommendations. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 mb-4">
          <i className="fas fa-check-circle text-3xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You for Your Feedback!</h2>
        <p className="text-gray-600">
          We've received your input and will use it to improve future recommendations.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Would you like us to improve your current suggestions?</h3>
        
        <div className="flex flex-col space-y-4 mb-6">
          <Button 
            variant="outline" 
            className="px-4 py-6 border border-gray-300 rounded-md text-left hover:bg-gray-50 flex flex-col items-start"
            onClick={handleAdjustItinerary}
          >
            <div className="font-medium">Adjust my current itinerary</div>
            <div className="text-sm text-gray-600">Keep most suggestions but make some adjustments based on my feedback</div>
          </Button>
          
          <Button 
            variant="outline" 
            className="px-4 py-6 border border-gray-300 rounded-md text-left hover:bg-gray-50 flex flex-col items-start"
            onClick={handleNewRecommendations}
          >
            <div className="font-medium">Generate completely new recommendations</div>
            <div className="text-sm text-gray-600">Start fresh with a new set of suggestions</div>
          </Button>
          
          <Button 
            variant="outline" 
            className="px-4 py-6 border border-gray-300 rounded-md text-left hover:bg-gray-50 flex flex-col items-start"
            onClick={() => navigate('/recommendations')}
          >
            <div className="font-medium">Keep these recommendations</div>
            <div className="text-sm text-gray-600">I'm happy with the current suggestions</div>
          </Button>
        </div>
      </div>
      
      <div className="text-center">
        <Button 
          onClick={() => navigate('/recommendations')}
          className="bg-primary text-white"
        >
          Back to Recommendations
        </Button>
      </div>
    </section>
  );
};

export default FeedbackPage;
